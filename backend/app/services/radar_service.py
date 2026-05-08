from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.domain import StockMaster
from app.services.stock_data import StockDataService

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _next_day_nine_utc(now: datetime) -> datetime:
    # Product requires next day 09:00 expiration; project is CN-first.
    # Keep UTC-safe storage and convert from local +8 notion.
    local_now = now.astimezone(timezone(timedelta(hours=8)))
    next_local = (local_now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    return next_local.astimezone(timezone.utc)


@dataclass
class RadarCandidate:
    stock_code: str
    stock_name: str
    market: str
    industry: str
    price: float
    pct_change: float
    amount: float
    turnover_rate: float
    pe: float
    pb: float
    bull_eye_score: int
    radar_category: str
    radar_reason: str
    buy_zone: Dict[str, float]
    analysis_for_beginner: str
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stock_code": self.stock_code,
            "stock_name": self.stock_name,
            "market": self.market,
            "industry": self.industry,
            "price": self.price,
            "pct_change": self.pct_change,
            "amount": self.amount,
            "turnover_rate": self.turnover_rate,
            "pe": self.pe,
            "pb": self.pb,
            "bull_eye_score": self.bull_eye_score,
            "radar_category": self.radar_category,
            "radar_reason": self.radar_reason,
            "buy_zone": self.buy_zone,
            "analysis_for_beginner": self.analysis_for_beginner,
            "disclaimer": self.disclaimer,
        }


class RadarService:
    _memory_cache: Dict[str, Dict[str, Any]] = {}
    _redis_client = None
    _redis_init_attempted = False

    @classmethod
    def _cache_key(cls, date_key: str) -> str:
        return f"bulleye:radar:{date_key}"

    @classmethod
    def _get_redis_client(cls):
        if cls._redis_init_attempted:
            return cls._redis_client
        cls._redis_init_attempted = True
        if not settings.REDIS_URL or redis is None:
            return None
        try:
            cls._redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            return cls._redis_client
        except Exception:
            cls._redis_client = None
            return None

    @classmethod
    def _load_cache(cls, date_key: str) -> Optional[List[Dict[str, Any]]]:
        key = cls._cache_key(date_key)
        redis_client = cls._get_redis_client()
        if redis_client is not None:
            try:
                raw = redis_client.get(key)
                if raw:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return parsed
            except Exception:
                pass
        mem_item = cls._memory_cache.get(key)
        if not mem_item:
            return None
        if mem_item.get("expire_at", _now_utc()) <= _now_utc():
            cls._memory_cache.pop(key, None)
            return None
        value = mem_item.get("value")
        return value if isinstance(value, list) else None

    @classmethod
    def _save_cache(cls, date_key: str, rows: List[Dict[str, Any]]) -> None:
        key = cls._cache_key(date_key)
        now = _now_utc()
        expire_at = _next_day_nine_utc(now)
        ttl_seconds = max(60, int((expire_at - now).total_seconds()))

        redis_client = cls._get_redis_client()
        if redis_client is not None:
            try:
                redis_client.setex(key, ttl_seconds, json.dumps(rows, ensure_ascii=False))
            except Exception:
                pass

        cls._memory_cache[key] = {
            "value": rows,
            "expire_at": expire_at,
        }

    @classmethod
    def _fetch_market_pool(cls) -> List[Dict[str, Any]]:
        token = "D43BF722C8E33BDC906FB84D85E326E8"
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        # Include turnover and amount for SQL-like pre-filter.
        fields = "f12,f14,f13,f100,f2,f3,f6,f8,f9,f23"
        fs = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23"
        params = {
            "pn": "1",
            "pz": "250",
            "po": "1",
            "np": "1",
            "ut": token,
            "fltt": "2",
            "invt": "2",
            "fid": "f3",
            "fs": fs,
            "fields": fields,
        }
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            payload = resp.json()
        diff = (payload.get("data") or {}).get("diff") or []
        if not isinstance(diff, list):
            return []
        return diff

    @classmethod
    def _fetch_kline_history(cls, stock_code: str, market: str, count: int = 180) -> List[Dict[str, float]]:
        secid = StockDataService._to_eastmoney_secid(stock_code, market)
        url = "https://push2his.eastmoney.com/api/qt/stock/kline/get"
        params = {
            "secid": secid,
            "fields1": "f1,f2,f3,f4,f5,f6",
            "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
            "klt": "101",  # day
            "fqt": "1",
            "end": "20500101",
            "lmt": str(max(60, min(count, 300))),
        }
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            payload = resp.json()
        raw = (payload.get("data") or {}).get("klines") or []
        rows: List[Dict[str, float]] = []
        for line in raw:
            parts = str(line).split(",")
            if len(parts) < 6:
                continue
            try:
                rows.append(
                    {
                        "close": float(parts[2]),
                        "high": float(parts[3]),
                        "low": float(parts[4]),
                        "amount": float(parts[5]),
                    }
                )
            except Exception:
                continue
        return rows

    @staticmethod
    def _ema(values: List[float], period: int) -> List[float]:
        if not values:
            return []
        alpha = 2 / (period + 1)
        out = [values[0]]
        for v in values[1:]:
            out.append(alpha * v + (1 - alpha) * out[-1])
        return out

    @classmethod
    def _calc_macd(cls, closes: List[float]) -> Dict[str, List[float]]:
        ema12 = cls._ema(closes, 12)
        ema26 = cls._ema(closes, 26)
        dif = [a - b for a, b in zip(ema12, ema26)]
        dea = cls._ema(dif, 9)
        hist = [(d - e) * 2 for d, e in zip(dif, dea)]
        return {"dif": dif, "dea": dea, "hist": hist}

    @classmethod
    def _is_macd_bullish_divergence(cls, closes: List[float]) -> bool:
        if len(closes) < 50:
            return False
        macd = cls._calc_macd(closes)
        dif = macd["dif"]

        # Use two rolling windows to find local lows and compare.
        w = 20
        p1 = closes[-2 * w : -w]
        p2 = closes[-w:]
        d1 = dif[-2 * w : -w]
        d2 = dif[-w:]
        if not p1 or not p2 or not d1 or not d2:
            return False
        low_price_1 = min(p1)
        low_price_2 = min(p2)
        low_dif_1 = min(d1)
        low_dif_2 = min(d2)
        # Bullish divergence: price makes lower low while DIF makes higher low.
        return low_price_2 < low_price_1 and low_dif_2 > low_dif_1

    @staticmethod
    def _max_drawdown(closes: List[float]) -> float:
        if not closes:
            return 0.0
        peak = closes[0]
        max_dd = 0.0
        for c in closes:
            peak = max(peak, c)
            if peak > 0:
                dd = (peak - c) / peak
                max_dd = max(max_dd, dd)
        return max_dd

    @classmethod
    def _score(cls, quote: Dict[str, Any], analysis_data: Dict[str, Any]) -> int:
        # Weighted score (trend 25% + capital 25% + chip 20% + sentiment 15% + fundamental 15%)
        pct = float(quote.get("f3") or 0) / 100
        amount = float(quote.get("f6") or 0)
        turnover = float(quote.get("f8") or 0)
        pe = float(quote.get("f9") or 0)
        pb = float(quote.get("f23") or 0)

        trend = max(0, min(100, int(50 + pct * 6)))
        capital = max(0, min(100, int(40 + (amount / 1e8) * 1.5 + turnover * 2)))
        chip_conc = str(analysis_data.get("chip_concentration", "60%")).replace("%", "")
        chip_val = float(chip_conc) if chip_conc else 60.0
        chip = max(0, min(100, int(chip_val)))
        sentiment_txt = str(analysis_data.get("market_sentiment", "中性"))
        sentiment = {"过热": 45, "偏热": 60, "中性": 75, "偏冷": 65, "极度悲观": 70}.get(sentiment_txt, 70)
        if pe <= 0:
            fundamental = 60
        else:
            fundamental = max(20, min(95, int(90 - min(pe, 120) * 0.45 - min(max(pb, 0), 20) * 1.2)))

        weighted = trend * 0.25 + capital * 0.25 + chip * 0.2 + sentiment * 0.15 + fundamental * 0.15
        return int(round(max(0, min(100, weighted))))

    @classmethod
    def _classify(
        cls,
        quote: Dict[str, Any],
        analysis_data: Dict[str, Any],
        history_closes: Optional[List[float]] = None,
    ) -> Dict[str, str]:
        pct = float(quote.get("f3") or 0) / 100
        ma_status = str(analysis_data.get("ma_status", ""))
        capital_flow_5d = str(analysis_data.get("capital_flow_5d", ""))
        macd_status = str(analysis_data.get("macd_status", ""))
        chip_status = str(analysis_data.get("chip_status", ""))

        if ("多头" in ma_status) and ("流入" in capital_flow_5d):
            return {
                "category": "B1",
                "reason": "均线多头排列且主力资金连续流入，趋势启动特征明显。",
            }

        # B3 precise: drawdown > 30% + MACD bullish divergence (+ low-level chip supportive signal).
        precise_b3 = False
        if history_closes and len(history_closes) >= 60:
            max_dd = cls._max_drawdown(history_closes[-120:])  # 120-day lookback
            has_div = cls._is_macd_bullish_divergence(history_closes[-120:])
            precise_b3 = max_dd >= 0.30 and has_div

        fallback_b3 = pct <= -3.0 and ("背离" in macd_status or "金叉" in macd_status) and ("低位" in chip_status)
        if precise_b3 or fallback_b3:
            return {
                "category": "B3",
                "reason": "历史最大回撤超30%且MACD出现底背离，叠加低位筹码结构，具备底部反转观察价值。",
            }

        return {
            "category": "B2",
            "reason": "量价与资金同步改善，具备结构性机会但需等待确认。",
        }

    @classmethod
    async def calculate_daily_radar(cls, db: Session, date_key: Optional[str] = None) -> List[Dict[str, Any]]:
        now = _now_utc()
        today_key = date_key or now.astimezone(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")
        cached = cls._load_cache(today_key)
        if cached is not None:
            return cached

        # SQL-like base scope from stock master, then blend real quote filters.
        listed_codes = {
            row.code
            for row in db.query(StockMaster.code).filter(StockMaster.list_status == "listed").all()
        }
        quotes = cls._fetch_market_pool()
        if not quotes:
            return []

        candidates: List[RadarCandidate] = []
        for q in quotes:
            code = str(q.get("f12") or "").strip()
            if len(code) != 6 or code not in listed_codes:
                continue
            name = str(q.get("f14") or f"股票{code}").strip()
            if "ST" in name.upper():
                continue

            amount = float(q.get("f6") or 0)  # yuan
            turnover = float(q.get("f8") or 0)  # %
            if amount <= 2e8 or turnover <= 3:
                continue

            try:
                analysis_data = StockDataService.get_full_analysis_data(code)
            except Exception:
                continue
            market = "SH" if str(q.get("f13") or "") == "1" else "SZ"
            history_closes: List[float] = []
            try:
                history = cls._fetch_kline_history(code, market, count=180)
                history_closes = [h["close"] for h in history if float(h.get("close", 0)) > 0]
            except Exception:
                history_closes = []

            score = cls._score(q, analysis_data)
            clsf = cls._classify(q, analysis_data, history_closes=history_closes)
            price = round(float(q.get("f2") or 0) / 100, 2)
            industry = str(q.get("f100") or analysis_data.get("industry") or "未知")
            buy_zone = {
                "low": round(max(0.01, price * 0.97), 2),
                "high": round(max(0.01, price * 1.0), 2),
            }
            candidates.append(
                RadarCandidate(
                    stock_code=code,
                    stock_name=name,
                    market=market,
                    industry=industry,
                    price=price,
                    pct_change=round(float(q.get("f3") or 0) / 100, 2),
                    amount=round(amount / 1e8, 2),
                    turnover_rate=round(turnover, 2),
                    pe=round(float(q.get("f9") or 0), 2),
                    pb=round(float(q.get("f23") or 0), 2),
                    bull_eye_score=score,
                    radar_category=clsf["category"],
                    radar_reason=clsf["reason"],
                    buy_zone=buy_zone,
                    analysis_for_beginner=(
                        f"{name} 当前量能与资金活跃度较高，属于 {clsf['category']} 机会形态，"
                        "建议结合盘中成交与风险承受能力分批观察。"
                    ),
                    disclaimer="本功能为量化筛选辅助信息，不构成任何投资建议，市场有风险，决策需谨慎。",
                )
            )

        candidates.sort(key=lambda x: (x.bull_eye_score, x.amount, x.turnover_rate), reverse=True)
        rows = [item.to_dict() for item in candidates[:20]]
        cls._save_cache(today_key, rows)
        return rows
