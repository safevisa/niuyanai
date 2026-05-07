from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
from typing import List
import random
import re
import threading
import asyncio

from app.core.config import settings
from app.db.database import engine, Base, get_db, SessionLocal
from app.services.ai_engine import ai_engine
from app.services.stock_data import StockDataService
from app.models.domain import User, Analysis, PriceAlert, InviteCode, InviteRelation, Subscription, PaymentOrder
from jose import jwt, JWTError
import hmac
import hashlib
import httpx
from app.services.auth_delivery import deliver_login_code

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
)


@app.on_event("startup")
def warmup_market_universe():
    if not settings.STARTUP_WARMUP_ENABLED:
        return

    # 冷启动不阻塞请求：后台线程同步 5000+ 股票池到后端缓存库
    def _warmup_job():
        try:
            StockDataService.warmup_universe()
        except Exception:
            pass
        db = None
        try:
            db = SessionLocal()
            StockDataService.ensure_stock_master(db, force=True)
        except Exception:
            pass
        finally:
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass

    threading.Thread(target=_warmup_job, daemon=True).start()

FREE_DAILY_ANALYSIS_QUOTA = 3
ANALYSIS_TIMEOUT_SECONDS = max(10, min(settings.ANALYSIS_TIMEOUT_SECONDS, 60))
LOGIN_CODE_TTL_SECONDS = 300
LOGIN_CODE_STORE: Dict[str, Dict[str, Any]] = {}
LOGIN_CODE_SEND_COOLDOWN_SECONDS = 60
LOGIN_FAIL_MAX_ATTEMPTS = 5
LOGIN_FAIL_LOCK_SECONDS = 600
LOGIN_CODE_SEND_STORE: Dict[str, datetime] = {}
LOGIN_FAIL_STORE: Dict[str, Dict[str, Any]] = {}
GUEST_DAILY_USAGE_STORE: Dict[str, Dict[str, Any]] = {}
GUEST_ANALYSIS_HISTORY_STORE: Dict[str, Dict[str, Dict[str, Any]]] = {}
ANALYSIS_TASK_STORE: Dict[str, Dict[str, Any]] = {}

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend domain
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to BullEye AI API"}


class LoginRequest(BaseModel):
    account: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    code: str = "000000"
    nickname: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]

class ScreenerRequest(BaseModel):
    minScore: int = 60
    maxPE: float = 50
    minCapital: str = "净流入"
    industry: str = "全部"
    limit: int = 20

class BacktestRequest(BaseModel):
    stockCode: str
    strategy: str = "ma_cross"  # ma_cross | breakout | mean_revert
    lookbackDays: int = 120
    initialCapital: float = 100000.0

class BatchPositionInput(BaseModel):
    stock_code: str
    cost_price: float
    shares: int

class BatchPortfolioRequest(BaseModel):
    positions: List[BatchPositionInput]

class PatternMatchRequest(BaseModel):
    stockCode: str
    lookbackDays: int = 120
    topK: int = 5

class PriceAlertCreateRequest(BaseModel):
    stockCode: str
    alertType: str = "price_above"  # price_above | price_below
    triggerPrice: float

class DailyReportRequest(BaseModel):
    focusIndustry: str = "全部"

class BindInviteRequest(BaseModel):
    code: str

class CreatePaymentOrderRequest(BaseModel):
    plan: str  # vip / pro

class ConfirmPaymentRequest(BaseModel):
    orderNo: str


def create_access_token(user_id: str) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "exp": expire_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def _gen_invite_code(user: User) -> str:
    uid = str(user.id).replace("-", "").upper()
    return f"BY{uid[-8:]}"

def _ensure_invite_code(db: Session, user: User) -> InviteCode:
    row = db.query(InviteCode).filter(InviteCode.user_id == user.id).first()
    if row:
        return row
    code = _gen_invite_code(user)
    row = InviteCode(user_id=user.id, code=code)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def _plan_price(plan: str) -> float:
    if plan == "vip":
        return 39.0
    if plan == "pro":
        return 99.0
    raise HTTPException(status_code=400, detail="Invalid plan")

def _mark_order_paid(db: Session, order: PaymentOrder, user: User) -> Dict[str, Any]:
    if order.status == "paid":
        return {
            "order_no": order.order_no,
            "status": "paid",
            "vip_level": user.vip_level,
            "vip_expire_at": user.vip_expire_at.isoformat() if user.vip_expire_at else None,
        }

    now = datetime.now(timezone.utc)
    order.status = "paid"
    order.paid_at = now

    if order.plan == "pro":
        user.vip_level = 2
    elif order.plan == "vip":
        user.vip_level = max(user.vip_level, 1)

    base = user.vip_expire_at if user.vip_expire_at and user.vip_expire_at > now else now
    user.vip_expire_at = base + timedelta(days=30)

    sub = Subscription(
        user_id=user.id,
        plan=order.plan,
        amount=order.amount,
        payment_method=order.payment_method,
        started_at=now,
        expired_at=user.vip_expire_at,
    )
    db.add(sub)
    db.add(order)
    db.add(user)
    db.commit()

    return {
        "order_no": order.order_no,
        "status": "paid",
        "vip_level": user.vip_level,
        "vip_expire_at": user.vip_expire_at.isoformat() if user.vip_expire_at else None,
    }


def get_today_analysis_usage(db: Session, user_id: UUID) -> int:
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user_id,
            Analysis.analysis_date >= start_of_day,
        )
        .count()
    )


def normalize_user_daily_usage(db: Session, user: User) -> int:
    """
    配额计数策略：
    - 使用 users.daily_used 作为当日调用计数（不受历史去重影响）
    - 若今天还没有分析记录，视为新的一天，自动重置为 0
    """
    today_count = get_today_analysis_usage(db, user.id)
    if today_count == 0 and user.daily_used != 0:
        user.daily_used = 0
        db.add(user)
        db.commit()
        db.refresh(user)
    return user.daily_used


def _resolve_guest_key(request: Request) -> str:
    forwarded = (request.headers.get("x-forwarded-for", "") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown_guest"


def consume_guest_daily_quota_by_key(guest_key: str) -> Dict[str, int]:
    today = datetime.now(timezone.utc).date().isoformat()
    state = GUEST_DAILY_USAGE_STORE.get(guest_key)
    if not state or state.get("date") != today:
        state = {"date": today, "count": 0}

    used = int(state.get("count", 0))
    if used >= FREE_DAILY_ANALYSIS_QUOTA:
        raise HTTPException(
            status_code=429,
            detail=f"游客今日体验次数已达上限（{FREE_DAILY_ANALYSIS_QUOTA}次）",
        )

    state["count"] = used + 1
    GUEST_DAILY_USAGE_STORE[guest_key] = state
    return {
        "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
        "daily_used": int(state["count"]),
        "daily_remaining": max(0, FREE_DAILY_ANALYSIS_QUOTA - int(state["count"])),
    }


def consume_guest_daily_quota(request: Request) -> Dict[str, int]:
    return consume_guest_daily_quota_by_key(_resolve_guest_key(request))


def get_guest_quota_state_by_key(guest_key: str) -> Dict[str, int]:
    today = datetime.now(timezone.utc).date().isoformat()
    state = GUEST_DAILY_USAGE_STORE.get(guest_key)
    if not state or state.get("date") != today:
        return {
            "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
            "daily_used": 0,
            "daily_remaining": FREE_DAILY_ANALYSIS_QUOTA,
        }
    used = int(state.get("count", 0))
    return {
        "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
        "daily_used": used,
        "daily_remaining": max(0, FREE_DAILY_ANALYSIS_QUOTA - used),
    }


def get_guest_quota_state(request: Request) -> Dict[str, int]:
    return get_guest_quota_state_by_key(_resolve_guest_key(request))


def get_guest_cached_analysis_by_key(guest_key: str, stock_code: str) -> Optional[Dict[str, Any]]:
    today = datetime.now(timezone.utc).date().isoformat()
    user_cache = GUEST_ANALYSIS_HISTORY_STORE.get(guest_key, {})
    day_cache = user_cache.get(today, {})
    cached = day_cache.get(stock_code)
    return cached if isinstance(cached, dict) else None


def get_guest_cached_analysis(request: Request, stock_code: str) -> Optional[Dict[str, Any]]:
    return get_guest_cached_analysis_by_key(_resolve_guest_key(request), stock_code)


def save_guest_cached_analysis_by_key(guest_key: str, stock_code: str, analysis_result: Dict[str, Any]) -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    user_cache = GUEST_ANALYSIS_HISTORY_STORE.setdefault(guest_key, {})
    # 仅保留当天历史，次日自动切换新 key，旧日不再命中
    user_cache[today] = user_cache.get(today, {})
    user_cache[today][stock_code] = analysis_result


def save_guest_cached_analysis(request: Request, stock_code: str, analysis_result: Dict[str, Any]) -> None:
    save_guest_cached_analysis_by_key(_resolve_guest_key(request), stock_code, analysis_result)


def get_today_analysis_record(db: Session, user_id: UUID, stock_code: str) -> Optional[Analysis]:
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(Analysis)
        .filter(
            Analysis.user_id == user_id,
            Analysis.stock_code == stock_code,
            Analysis.analysis_date >= start_of_day,
        )
        .order_by(Analysis.analysis_date.desc())
        .first()
    )


def _set_task_state(task_id: str, **updates: Any) -> None:
    task = ANALYSIS_TASK_STORE.get(task_id)
    if not task:
        return
    task.update(updates)
    task["updated_at"] = datetime.now(timezone.utc).isoformat()


def _create_task(owner_type: str, owner_key: str, stock_code: str) -> str:
    task_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    ANALYSIS_TASK_STORE[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": 0,
        "message": "任务已创建",
        "owner_type": owner_type,
        "owner_key": owner_key,
        "stock_code": stock_code,
        "result": None,
        "error": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    return task_id


def _get_task_or_404(task_id: str) -> Dict[str, Any]:
    task = ANALYSIS_TASK_STORE.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _finalize_stale_task(task: Dict[str, Any]) -> None:
    if task.get("status") != "running":
        return
    updated_at = task.get("updated_at")
    if not isinstance(updated_at, str) or not updated_at:
        return
    try:
        last_update = datetime.fromisoformat(updated_at)
    except Exception:
        return
    elapsed = (datetime.now(timezone.utc) - last_update).total_seconds()
    stale_limit = ANALYSIS_TIMEOUT_SECONDS + 20
    if elapsed > stale_limit:
        task["status"] = "failed"
        task["progress"] = 100
        task["error"] = f"analysis task stale timeout: exceeded {stale_limit}s without completion"
        task["updated_at"] = datetime.now(timezone.utc).isoformat()


async def _run_public_analysis_task(task_id: str, stock_code: str, guest_key: str) -> None:
    try:
        _set_task_state(task_id, status="running", progress=10, message="检查游客配额")
        quota_before = get_guest_quota_state_by_key(guest_key)
        if quota_before["daily_used"] >= FREE_DAILY_ANALYSIS_QUOTA:
            _set_task_state(
                task_id,
                status="failed",
                progress=100,
                error=f"游客今日体验次数已达上限（{FREE_DAILY_ANALYSIS_QUOTA}次）",
            )
            return

        _set_task_state(task_id, progress=45, message="调用模型分析")
        analysis_result = await asyncio.wait_for(
            ai_engine.generate_stock_analysis(stock_code),
            timeout=ANALYSIS_TIMEOUT_SECONDS,
        )
        _set_task_state(task_id, progress=85, message="更新游客配额")
        quota = consume_guest_daily_quota_by_key(guest_key)
        _set_task_state(
            task_id,
            status="success",
            progress=100,
            message="分析完成",
            result={
                "status": "success",
                "data": analysis_result,
                "quota": {**quota, "from_cache": False},
            },
        )
    except TimeoutError:
        _set_task_state(
            task_id,
            status="failed",
            progress=100,
            error=f"analysis timeout: exceeded {ANALYSIS_TIMEOUT_SECONDS}s",
        )
    except Exception as exc:
        _set_task_state(task_id, status="failed", progress=100, error=str(exc))


async def _run_user_analysis_task(task_id: str, stock_code: str, user_id: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            _set_task_state(task_id, status="failed", progress=100, error="User not found")
            return

        _set_task_state(task_id, status="running", progress=10, message="检查用户配额")
        daily_used = normalize_user_daily_usage(db, user)
        if daily_used >= FREE_DAILY_ANALYSIS_QUOTA:
            _set_task_state(
                task_id,
                status="failed",
                progress=100,
                error=f"今日分析次数已达上限（{FREE_DAILY_ANALYSIS_QUOTA}次）",
            )
            return

        _set_task_state(task_id, progress=45, message="调用模型分析")
        analysis_result = await asyncio.wait_for(
            ai_engine.generate_stock_analysis(stock_code),
            timeout=ANALYSIS_TIMEOUT_SECONDS,
        )

        _set_task_state(task_id, progress=80, message="写入分析历史")
        scores = analysis_result.get("scores", {})
        target_stock_code = analysis_result.get("stock_code", stock_code)
        target_stock_name = analysis_result.get("stock_name", f"Stock_{stock_code}")
        now_utc = datetime.now(timezone.utc)
        db.add(
            Analysis(
                user_id=user.id,
                stock_code=target_stock_code,
                stock_name=target_stock_name,
                analysis_date=now_utc,
                bull_eye_score=analysis_result.get("bull_eye_score", 0),
                trend_score=scores.get("trend", 0),
                capital_score=scores.get("capital", 0),
                chip_score=scores.get("chip", 0),
                sentiment_score=scores.get("sentiment", 0),
                fundamental_score=scores.get("fundamental", 0),
                ai_analysis=analysis_result,
                market_price=analysis_result.get("market_price", 0),
            )
        )
        user.daily_quota = FREE_DAILY_ANALYSIS_QUOTA
        user.daily_used = daily_used + 1
        db.add(user)
        db.commit()
        latest_daily_used = user.daily_used
        _set_task_state(
            task_id,
            status="success",
            progress=100,
            message="分析完成",
            result={
                "status": "success",
                "data": analysis_result,
                "quota": {
                    "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
                    "daily_used": latest_daily_used,
                    "daily_remaining": max(0, FREE_DAILY_ANALYSIS_QUOTA - latest_daily_used),
                    "from_cache": False,
                },
            },
        )
    except TimeoutError:
        _set_task_state(
            task_id,
            status="failed",
            progress=100,
            error=f"analysis timeout: exceeded {ANALYSIS_TIMEOUT_SECONDS}s",
        )
    except Exception as exc:
        _set_task_state(task_id, status="failed", progress=100, error=str(exc))
    finally:
        db.close()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token subject")
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    account = (payload.account or payload.phone or payload.email or "").strip().lower()
    if not account:
        raise HTTPException(status_code=400, detail="Phone or email is required")
    if len(account) < 4 or len(account) > 64:
        raise HTTPException(status_code=400, detail="Invalid account format")
    code = str(payload.code or "").strip()
    now_utc = datetime.now(timezone.utc)
    fail_state = LOGIN_FAIL_STORE.get(account)
    if fail_state and fail_state.get("locked_until") and now_utc < fail_state["locked_until"]:
        raise HTTPException(status_code=429, detail="Too many failed attempts, please retry later")

    def _mark_code_failed() -> None:
        state = LOGIN_FAIL_STORE.get(account, {"count": 0, "locked_until": None})
        state["count"] = int(state.get("count", 0)) + 1
        if state["count"] >= LOGIN_FAIL_MAX_ATTEMPTS:
            state["count"] = 0
            state["locked_until"] = now_utc + timedelta(seconds=LOGIN_FAIL_LOCK_SECONDS)
        LOGIN_FAIL_STORE[account] = state

    if settings.LOGIN_CODE_MODE.strip().lower() == "strict":
        code_row = LOGIN_CODE_STORE.get(account)
        if not code_row:
            raise HTTPException(status_code=400, detail="Verification code not sent")
        if datetime.now(timezone.utc) > code_row["expire_at"]:
            LOGIN_CODE_STORE.pop(account, None)
            raise HTTPException(status_code=400, detail="Verification code expired")
        if code != code_row["code"]:
            _mark_code_failed()
            raise HTTPException(status_code=400, detail="Invalid verification code")
    elif code != "000000":
        _mark_code_failed()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user = db.query(User).filter(User.phone == account).first()
    if not user:
        nickname = payload.nickname.strip() if payload.nickname else f"用户{account[-4:] if len(account) >= 4 else account}"
        user = User(phone=account, nickname=nickname)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(str(user.id))
    LOGIN_FAIL_STORE.pop(account, None)
    LOGIN_CODE_STORE.pop(account, None)
    daily_used = normalize_user_daily_usage(db, user)
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "nickname": user.nickname,
            "vip_level": user.vip_level,
            "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
            "daily_used": daily_used,
        },
    }

@app.post("/api/auth/send-code")
def send_login_code(payload: Dict[str, Any]):
    account = str(payload.get("account", "")).strip().lower()
    if not account:
        raise HTTPException(status_code=400, detail="account is required")
    if len(account) < 4 or len(account) > 64:
        raise HTTPException(status_code=400, detail="invalid account format")
    is_email = "@" in account
    if is_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", account):
        raise HTTPException(status_code=400, detail="invalid email format")
    if not is_email and not re.match(r"^[0-9]{11}$", account):
        raise HTTPException(status_code=400, detail="invalid phone format")
    now_utc = datetime.now(timezone.utc)
    last_sent = LOGIN_CODE_SEND_STORE.get(account)
    if last_sent and (now_utc - last_sent).total_seconds() < LOGIN_CODE_SEND_COOLDOWN_SECONDS:
        raise HTTPException(status_code=429, detail="send too frequently")

    code = "000000" if settings.LOGIN_CODE_MODE.strip().lower() == "mock" else f"{random.randint(0, 999999):06d}"
    expire_at = now_utc + timedelta(seconds=LOGIN_CODE_TTL_SECONDS)
    LOGIN_CODE_STORE[account] = {"code": code, "expire_at": expire_at}
    LOGIN_CODE_SEND_STORE[account] = now_utc

    delivered_via = deliver_login_code(
        account=account,
        is_email=is_email,
        code=code,
        expire_in_seconds=LOGIN_CODE_TTL_SECONDS,
    )

    return {
        "status": "success",
        "data": {
            "account": account,
            "code": code if settings.LOGIN_CODE_MODE.strip().lower() == "mock" else None,
            "expires_in": LOGIN_CODE_TTL_SECONDS,
            "delivered_via": delivered_via,
            "message": "验证码已发送",
        },
    }


@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    daily_used = normalize_user_daily_usage(db, current_user)
    return {
        "id": str(current_user.id),
        "phone": current_user.phone,
        "nickname": current_user.nickname,
        "vip_level": current_user.vip_level,
        "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
        "daily_used": daily_used,
    }

@app.get("/api/stock/{stock_code}")
def get_stock_data(stock_code: str):
    """Get realtime base data for a stock."""
    try:
        return StockDataService.get_stock_basic(stock_code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"realtime quote unavailable: {exc}")


@app.get("/api/stock/provider/status")
def get_stock_provider_status():
    return {
        "status": "success",
        "data": StockDataService.get_provider_status(),
    }


@app.get("/api/search/stocks")
def search_stocks(q: str, limit: int = 12, db: Session = Depends(get_db)):
    query = q.strip()
    if not query:
        return {"status": "success", "data": [], "total": 0}
    if len(query) > 20:
        raise HTTPException(status_code=400, detail="Query too long")
    safe_limit = min(max(limit, 1), 100)
    try:
        total = StockDataService.get_market_total_db(db, query)
        if total > 0:
            return {
                "status": "success",
                "data": StockDataService.search_stocks_db(db, query, limit=safe_limit),
                "total": total,
            }
    except Exception:
        pass
    # 数据库不可用或未同步时，直接走内存数据，保证搜索可用
    return {
        "status": "success",
        "data": StockDataService.search_stocks(query, limit=safe_limit),
        "total": StockDataService.get_market_total(query),
    }

@app.get("/api/market/industry-rotation")
def get_industry_rotation(limit: int = 8):
    safe_limit = min(max(limit, 1), 15)
    return {
        "status": "success",
        "data": StockDataService.get_industry_rotation(limit=safe_limit),
    }

@app.get("/api/market/stocks")
def list_market_stocks(q: str = "", limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    safe_limit = min(max(limit, 1), 100)
    safe_offset = max(offset, 0)
    try:
        total = StockDataService.get_market_total_db(db, q=q)
        if total > 0:
            return {
                "status": "success",
                "data": StockDataService.list_market_stocks_db(db, q=q, limit=safe_limit, offset=safe_offset),
                "total": total,
            }
    except Exception:
        pass
    return {
        "status": "success",
        "data": StockDataService.list_market_stocks(q=q, limit=safe_limit, offset=safe_offset),
        "total": StockDataService.get_market_total(q=q),
    }


@app.get("/api/market/cache/status")
def get_market_cache_status(db: Session = Depends(get_db)):
    try:
        return {
            "status": "success",
            "data": StockDataService.get_stock_master_cache_status(db),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"cache status failed: {exc}")


@app.post("/api/market/cache/sync")
def sync_market_cache(db: Session = Depends(get_db)):
    try:
        count = StockDataService.ensure_stock_master(db, force=True)
        return {
            "status": "success",
            "data": {
                "cached_count": count,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"sync failed: {exc}")

@app.post("/api/tools/screener")
def run_screener(payload: ScreenerRequest):
    safe_limit = min(max(payload.limit, 1), 50)
    data = StockDataService.run_stock_screener(
        min_score=max(payload.minScore, 0),
        max_pe=max(payload.maxPE, 1),
        min_capital=payload.minCapital,
        industry=payload.industry,
        limit=safe_limit,
    )
    return {
        "status": "success",
        "data": data,
    }

@app.post("/api/tools/backtest")
def run_backtest(payload: BacktestRequest):
    code = payload.stockCode.strip()
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid stockCode")
    result = StockDataService.run_simple_backtest(
        stock_code=code,
        strategy=payload.strategy,
        lookback_days=max(30, min(payload.lookbackDays, 365)),
        initial_capital=max(10000.0, min(payload.initialCapital, 10000000.0)),
    )
    return {"status": "success", "data": result}

@app.post("/api/tools/portfolio-batch")
def run_portfolio_batch_analysis(payload: BatchPortfolioRequest):
    if not payload.positions:
        raise HTTPException(status_code=400, detail="positions required")
    result = StockDataService.analyze_portfolio_batch(
        [item.model_dump() for item in payload.positions]
    )
    return {"status": "success", "data": result}

@app.post("/api/tools/pattern-match")
def run_pattern_match(payload: PatternMatchRequest):
    code = payload.stockCode.strip()
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid stockCode")
    result = StockDataService.match_similar_patterns(
        stock_code=code,
        lookback_days=max(30, min(payload.lookbackDays, 365)),
        top_k=max(1, min(payload.topK, 10)),
    )
    return {"status": "success", "data": result}

@app.get("/api/alerts")
def list_price_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == current_user.id)
        .order_by(PriceAlert.created_at.desc())
        .all()
    )
    return {
        "status": "success",
        "data": [
            {
                "id": str(row.id),
                "stock_code": row.stock_code,
                "alert_type": row.alert_type,
                "trigger_price": float(row.trigger_price) if row.trigger_price is not None else 0.0,
                "is_triggered": bool(row.is_triggered),
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }

@app.post("/api/alerts")
def create_price_alert(
    payload: PriceAlertCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code = payload.stockCode.strip()
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid stockCode")
    alert_type = payload.alertType.strip()
    if alert_type not in {"price_above", "price_below"}:
        raise HTTPException(status_code=400, detail="Invalid alertType")
    trigger_price = max(0.01, payload.triggerPrice)
    row = PriceAlert(
        user_id=current_user.id,
        stock_code=code,
        alert_type=alert_type,
        trigger_price=trigger_price,
        is_triggered=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"status": "success", "data": {"id": str(row.id)}}

@app.delete("/api/alerts/{alert_id}")
def delete_price_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        target_id = UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert id")
    row = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == target_id, PriceAlert.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(row)
    db.commit()
    return {"status": "success"}

@app.post("/api/alerts/check")
def check_price_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == current_user.id, PriceAlert.is_triggered == False)  # noqa: E712
        .all()
    )
    triggered = []
    for row in rows:
        basic = StockDataService.get_stock_basic(row.stock_code)
        current_price = float(basic.get("current_price", 0.0))
        trigger_price = float(row.trigger_price) if row.trigger_price is not None else 0.0
        hit = (
            (row.alert_type == "price_above" and current_price >= trigger_price)
            or (row.alert_type == "price_below" and current_price <= trigger_price)
        )
        if hit:
            row.is_triggered = True
            triggered.append({
                "id": str(row.id),
                "stock_code": row.stock_code,
                "current_price": current_price,
                "trigger_price": trigger_price,
                "alert_type": row.alert_type,
            })
    if triggered:
        db.commit()
    return {"status": "success", "data": {"triggered": triggered, "count": len(triggered)}}

@app.post("/api/reports/daily")
def generate_daily_report(
    payload: DailyReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    overview = {
        "sentiment_score": 58,
        "advance_count": 0,
        "decline_count": 0,
        "limit_up": 0,
        "limit_down": 0,
        "main_capital_net": 0.0,
    }
    try:
        # 通过行业轮动和选股器结果生成一份可读的站内日报（最小可用）
        rotation = StockDataService.get_industry_rotation(limit=5)
        screener = StockDataService.run_stock_screener(
            min_score=70,
            max_pe=60,
            min_capital="净流入",
            industry=payload.focusIndustry,
            limit=5,
        )
    except Exception:
        rotation = []
        screener = []

    top_up = rotation[0] if rotation else None
    top_down = rotation[-1] if rotation else None
    focus_list = [
        {
            "stock_code": item["code"],
            "stock_name": item["name"],
            "score": item["score"],
            "pct_change": item["pct_change"],
            "industry": item["industry"],
        }
        for item in screener
    ]

    history_count = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .count()
    )

    summary_lines = [
        f"市场情绪温度处于中性偏谨慎区间（参考值 {overview['sentiment_score']}）。",
        f"行业轮动方面，{top_up['name'] if top_up else '暂无显著领涨行业'}相对强势，{top_down['name'] if top_down else '暂无明显弱势行业'}偏弱。",
        f"系统筛选出 {len(focus_list)} 支关注标的，建议结合仓位与风险承受能力做二次判断。",
    ]

    risk_tips = [
        "短线波动较大时，优先控制仓位和回撤。",
        "对高估值且放量冲高个股保持谨慎，避免追涨。",
        "严格区分参考信号与交易决策，避免情绪化操作。",
    ]

    return {
        "status": "success",
        "data": {
            "report_date": datetime.now(timezone.utc).date().isoformat(),
            "user_id": str(current_user.id),
            "history_count": history_count,
            "summary": summary_lines,
            "top_rotation": {
                "up": top_up,
                "down": top_down,
            },
            "focus_stocks": focus_list,
            "risk_tips": risk_tips,
            "disclaimer": "本日报由系统自动生成，仅供学习和复盘参考，不构成投资建议。",
        },
    }

@app.get("/api/invite/me")
def get_invite_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite_code = _ensure_invite_code(db, current_user)
    invited_count = (
        db.query(InviteRelation)
        .filter(InviteRelation.inviter_id == current_user.id)
        .count()
    )
    bound_row = (
        db.query(InviteRelation)
        .filter(InviteRelation.invitee_id == current_user.id)
        .first()
    )
    return {
        "status": "success",
        "data": {
            "my_code": invite_code.code,
            "invited_count": invited_count,
            "has_bound_inviter": bound_row is not None,
        },
    }

@app.post("/api/invite/bind")
def bind_invite_code(
    payload: BindInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="邀请码不能为空")
    bound_row = (
        db.query(InviteRelation)
        .filter(InviteRelation.invitee_id == current_user.id)
        .first()
    )
    if bound_row:
        raise HTTPException(status_code=400, detail="您已绑定邀请码")
    inviter_code = db.query(InviteCode).filter(InviteCode.code == code).first()
    if not inviter_code:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    if inviter_code.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能绑定自己的邀请码")
    relation = InviteRelation(inviter_id=inviter_code.user_id, invitee_id=current_user.id)
    db.add(relation)
    db.commit()
    return {"status": "success"}

@app.post("/api/payments/create")
def create_payment_order(
    payload: CreatePaymentOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = payload.plan.strip().lower()
    amount = _plan_price(plan)
    order_no = f"BY{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{str(current_user.id).replace('-', '')[-6:]}"
    order = PaymentOrder(
        user_id=current_user.id,
        order_no=order_no,
        plan=plan,
        amount=amount,
        payment_method="wechat_mock",
        status="pending",
    )
    db.add(order)
    db.commit()
    return {
        "status": "success",
        "data": {
            "order_no": order_no,
            "plan": plan,
            "amount": amount,
            "payment_url": f"weixin://mockpay?order_no={order_no}",
            "status": "pending",
        },
    }

@app.get("/api/payments/orders")
def list_payment_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.user_id == current_user.id)
        .order_by(PaymentOrder.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "status": "success",
        "data": [
            {
                "order_no": row.order_no,
                "plan": row.plan,
                "amount": float(row.amount) if row.amount is not None else 0.0,
                "status": row.status,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "paid_at": row.paid_at.isoformat() if row.paid_at else None,
            }
            for row in rows
        ],
    }

@app.get("/api/payments/orders/{order_no}")
def get_payment_order(
    order_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.order_no == order_no, PaymentOrder.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "status": "success",
        "data": {
            "order_no": row.order_no,
            "plan": row.plan,
            "amount": float(row.amount) if row.amount is not None else 0.0,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "paid_at": row.paid_at.isoformat() if row.paid_at else None,
        },
    }

@app.post("/api/payments/mock-confirm")
def confirm_payment_mock(
    payload: ConfirmPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order_no = payload.orderNo.strip()
    order = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.order_no == order_no, PaymentOrder.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "data": _mark_order_paid(db, order, current_user)}

@app.post("/api/payments/wechat/callback")
async def wechat_pay_callback(
    request: Request,
    db: Session = Depends(get_db),
    x_wechat_signature: Optional[str] = Header(default=None),
):
    if not settings.WECHAT_PAY_CALLBACK_SECRET:
        raise HTTPException(status_code=501, detail="WECHAT_PAY_CALLBACK_SECRET not configured")

    raw_body = await request.body()
    expected = hmac.new(
        settings.WECHAT_PAY_CALLBACK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    provided = (x_wechat_signature or "").strip().lower()
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid callback signature")

    payload = await request.json()
    order_no = str(payload.get("orderNo", "")).strip()
    pay_status = str(payload.get("status", "")).strip().lower()
    if not order_no:
        raise HTTPException(status_code=400, detail="orderNo is required")

    order = db.query(PaymentOrder).filter(PaymentOrder.order_no == order_no).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if pay_status != "paid":
        order.status = "failed"
        db.add(order)
        db.commit()
        return {"status": "success", "data": {"order_no": order_no, "status": "failed"}}

    user = db.query(User).filter(User.id == order.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "data": _mark_order_paid(db, order, user)}

@app.post("/api/analysis/stock/{stock_code}/tasks")
async def create_user_analysis_task(
    stock_code: str,
    current_user: User = Depends(get_current_user),
):
    task_id = _create_task("user", str(current_user.id), stock_code)
    asyncio.create_task(_run_user_analysis_task(task_id, stock_code, str(current_user.id)))
    return {
        "status": "success",
        "data": {
            "task_id": task_id,
            "status": "pending",
        },
    }


@app.get("/api/analysis/tasks/{task_id}")
def get_user_analysis_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(task_id)
    if task.get("owner_type") != "user" or task.get("owner_key") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden task access")
    _finalize_stale_task(task)
    return {
        "status": "success",
        "data": {
            "task_id": task["task_id"],
            "task_status": task["status"],
            "progress": task["progress"],
            "message": task.get("message", ""),
            "result": task.get("result"),
            "error": task.get("error"),
            "updated_at": task.get("updated_at"),
        },
    }


@app.post("/api/public/analysis/stock/{stock_code}/tasks")
async def create_public_analysis_task(stock_code: str, request: Request):
    guest_key = _resolve_guest_key(request)
    task_id = _create_task("guest", guest_key, stock_code)
    asyncio.create_task(_run_public_analysis_task(task_id, stock_code, guest_key))
    return {
        "status": "success",
        "data": {
            "task_id": task_id,
            "status": "pending",
        },
    }


@app.get("/api/public/analysis/tasks/{task_id}")
def get_public_analysis_task(task_id: str, request: Request):
    task = _get_task_or_404(task_id)
    guest_key = _resolve_guest_key(request)
    if task.get("owner_type") != "guest" or task.get("owner_key") != guest_key:
        raise HTTPException(status_code=403, detail="Forbidden task access")
    _finalize_stale_task(task)
    return {
        "status": "success",
        "data": {
            "task_id": task["task_id"],
            "task_status": task["status"],
            "progress": task["progress"],
            "message": task.get("message", ""),
            "result": task.get("result"),
            "error": task.get("error"),
            "updated_at": task.get("updated_at"),
        },
    }


@app.post("/api/analysis/stock/{stock_code}")
async def trigger_stock_analysis(
    stock_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI analysis for a given stock"""
    try:
        daily_used = normalize_user_daily_usage(db, current_user)
        if daily_used >= FREE_DAILY_ANALYSIS_QUOTA:
            raise HTTPException(
                status_code=429,
                detail=f"今日分析次数已达上限（{FREE_DAILY_ANALYSIS_QUOTA}次）",
            )

        try:
            analysis_result = await asyncio.wait_for(
                ai_engine.generate_stock_analysis(stock_code),
                timeout=ANALYSIS_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=f"analysis timeout: exceeded {ANALYSIS_TIMEOUT_SECONDS}s",
            )

        scores = analysis_result.get("scores", {})
        target_stock_code = analysis_result.get("stock_code", stock_code)
        target_stock_name = analysis_result.get("stock_name", f"Stock_{stock_code}")
        now_utc = datetime.now(timezone.utc)

        analysis_record = Analysis(
            user_id=current_user.id,
            stock_code=target_stock_code,
            stock_name=target_stock_name,
            analysis_date=now_utc,
            bull_eye_score=analysis_result.get("bull_eye_score", 0),
            trend_score=scores.get("trend", 0),
            capital_score=scores.get("capital", 0),
            chip_score=scores.get("chip", 0),
            sentiment_score=scores.get("sentiment", 0),
            fundamental_score=scores.get("fundamental", 0),
            ai_analysis=analysis_result,
            market_price=analysis_result.get("market_price", 0),
        )
        db.add(analysis_record)

        current_user.daily_quota = FREE_DAILY_ANALYSIS_QUOTA
        current_user.daily_used = daily_used + 1
        db.add(current_user)
        db.commit()

        latest_daily_used = current_user.daily_used
        return {
            "status": "success",
            "data": analysis_result,
            "quota": {
                "daily_quota": FREE_DAILY_ANALYSIS_QUOTA,
                "daily_used": latest_daily_used,
                "daily_remaining": max(0, FREE_DAILY_ANALYSIS_QUOTA - latest_daily_used),
                "from_cache": False,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/public/analysis/stock/{stock_code}")
async def trigger_stock_analysis_public(stock_code: str, request: Request):
    """Public analysis endpoint for guest mode without auth/history persistence."""
    try:
        quota_before = get_guest_quota_state(request)
        if quota_before["daily_used"] >= FREE_DAILY_ANALYSIS_QUOTA:
            raise HTTPException(
                status_code=429,
                detail=f"游客今日体验次数已达上限（{FREE_DAILY_ANALYSIS_QUOTA}次）",
            )
        try:
            analysis_result = await asyncio.wait_for(
                ai_engine.generate_stock_analysis(stock_code),
                timeout=ANALYSIS_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=f"analysis timeout: exceeded {ANALYSIS_TIMEOUT_SECONDS}s",
            )
        quota = consume_guest_daily_quota(request)
        return {
            "status": "success",
            "data": analysis_result,
            "quota": {
                **quota,
                "from_cache": False,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/analysis/history")
def get_analysis_history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clamped_limit = min(max(limit, 1), 100)
    safe_offset = max(offset, 0)
    rows = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .offset(safe_offset)
        .limit(clamped_limit)
        .all()
    )
    return {
        "status": "success",
        "data": [
            {
                "id": str(row.id),
                "stock_code": row.stock_code,
                "stock_name": row.stock_name,
                "analysis_date": row.analysis_date.isoformat() if row.analysis_date else None,
                "bull_eye_score": row.bull_eye_score,
                "market_price": float(row.market_price) if row.market_price is not None else None,
                "market": row.ai_analysis.get("market", "") if row.ai_analysis else "",
                "industry": row.ai_analysis.get("industry", "") if row.ai_analysis else "",
                "data_as_of": row.ai_analysis.get("data_as_of") if row.ai_analysis else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }
