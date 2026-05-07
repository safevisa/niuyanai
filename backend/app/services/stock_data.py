import random
from typing import Dict, Any, List
from datetime import datetime, timezone
import httpx
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.domain import StockMaster

class StockDataService:
    """
    Mocked Stock Data Service.
    In production, this would integrate with Tushare Pro or AkShare.
    """

    STOCK_UNIVERSE: List[Dict[str, str]] = [
        {"code": "600519", "name": "贵州茅台", "market": "SH", "industry": "白酒"},
        {"code": "000858", "name": "五粮液", "market": "SZ", "industry": "白酒"},
        {"code": "300750", "name": "宁德时代", "market": "SZ", "industry": "新能源"},
        {"code": "002594", "name": "比亚迪", "market": "SZ", "industry": "新能源汽车"},
        {"code": "600036", "name": "招商银行", "market": "SH", "industry": "银行"},
        {"code": "000001", "name": "平安银行", "market": "SZ", "industry": "银行"},
        {"code": "600030", "name": "中信证券", "market": "SH", "industry": "券商"},
        {"code": "600276", "name": "恒瑞医药", "market": "SH", "industry": "医药"},
        {"code": "300760", "name": "迈瑞医疗", "market": "SZ", "industry": "医疗器械"},
        {"code": "600000", "name": "浦发银行", "market": "SH", "industry": "银行"},
        {"code": "601318", "name": "中国平安", "market": "SH", "industry": "保险"},
        {"code": "601166", "name": "兴业银行", "market": "SH", "industry": "银行"},
        {"code": "601288", "name": "农业银行", "market": "SH", "industry": "银行"},
        {"code": "601398", "name": "工商银行", "market": "SH", "industry": "银行"},
        {"code": "601939", "name": "建设银行", "market": "SH", "industry": "银行"},
        {"code": "601988", "name": "中国银行", "market": "SH", "industry": "银行"},
        {"code": "600900", "name": "长江电力", "market": "SH", "industry": "电力"},
        {"code": "600309", "name": "万华化学", "market": "SH", "industry": "化工"},
        {"code": "600887", "name": "伊利股份", "market": "SH", "industry": "食品饮料"},
        {"code": "601899", "name": "紫金矿业", "market": "SH", "industry": "有色金属"},
        {"code": "601012", "name": "隆基绿能", "market": "SH", "industry": "光伏"},
        {"code": "688981", "name": "中芯国际", "market": "SH", "industry": "半导体"},
        {"code": "688041", "name": "海光信息", "market": "SH", "industry": "半导体"},
        {"code": "000333", "name": "美的集团", "market": "SZ", "industry": "家电"},
        {"code": "000651", "name": "格力电器", "market": "SZ", "industry": "家电"},
        {"code": "600690", "name": "海尔智家", "market": "SH", "industry": "家电"},
        {"code": "600031", "name": "三一重工", "market": "SH", "industry": "机械"},
        {"code": "601668", "name": "中国建筑", "market": "SH", "industry": "建筑"},
        {"code": "601888", "name": "中国中免", "market": "SH", "industry": "免税"},
        {"code": "000002", "name": "万科A", "market": "SZ", "industry": "房地产"},
        {"code": "600048", "name": "保利发展", "market": "SH", "industry": "房地产"},
        {"code": "300059", "name": "东方财富", "market": "SZ", "industry": "金融科技"},
        {"code": "002415", "name": "海康威视", "market": "SZ", "industry": "安防"},
        {"code": "000725", "name": "京东方A", "market": "SZ", "industry": "面板"},
        {"code": "002230", "name": "科大讯飞", "market": "SZ", "industry": "人工智能"},
        {"code": "600809", "name": "山西汾酒", "market": "SH", "industry": "白酒"},
        {"code": "000568", "name": "泸州老窖", "market": "SZ", "industry": "白酒"},
        {"code": "600999", "name": "招商证券", "market": "SH", "industry": "券商"},
        {"code": "601688", "name": "华泰证券", "market": "SH", "industry": "券商"},
        {"code": "601336", "name": "新华保险", "market": "SH", "industry": "保险"},
    ]
    _last_real_provider_error: str = ""
    _last_real_search_error: str = ""
    _universe_cache: List[Dict[str, str]] = []
    _universe_cache_loaded_at: datetime | None = None
    _universe_cache_ttl_seconds: int = 6 * 60 * 60
    _stock_master_synced_at: datetime | None = None
    _stock_master_target_min_count: int = 5000

    @classmethod
    def sync_stock_master(cls, db: Session) -> int:
        universe = cls._get_stock_universe()
        if not universe:
            return 0
        codes = [item["code"] for item in universe]
        existing_rows = db.query(StockMaster).filter(StockMaster.code.in_(codes)).all()
        existing_map = {row.code: row for row in existing_rows}
        upserted = 0
        for item in universe:
            row = existing_map.get(item["code"])
            if row:
                row.name = item["name"]
                row.market = item["market"]
                row.industry = item.get("industry", "未知") or "未知"
                row.list_status = "listed"
            else:
                db.add(
                    StockMaster(
                        code=item["code"],
                        name=item["name"],
                        market=item["market"],
                        industry=item.get("industry", "未知") or "未知",
                        list_status="listed",
                    )
                )
            upserted += 1
        db.commit()
        cls._stock_master_synced_at = datetime.now(timezone.utc)
        return upserted

    @classmethod
    def _get_stock_universe_db(cls, db: Session) -> List[Dict[str, str]]:
        rows = db.query(StockMaster).filter(StockMaster.list_status == "listed").order_by(StockMaster.code.asc()).all()
        return [
            {
                "code": row.code,
                "name": row.name,
                "market": row.market,
                "industry": row.industry or "未知",
            }
            for row in rows
        ]

    @classmethod
    def ensure_stock_master(cls, db: Session, force: bool = False) -> int:
        count = db.query(StockMaster).filter(StockMaster.list_status == "listed").count()
        if force or count < cls._stock_master_target_min_count:
            return cls.sync_stock_master(db)
        return count

    @classmethod
    def get_stock_master_cache_status(cls, db: Session) -> Dict[str, Any]:
        count = db.query(StockMaster).filter(StockMaster.list_status == "listed").count()
        return {
            "cached_count": count,
            "target_min_count": cls._stock_master_target_min_count,
            "ready": count >= cls._stock_master_target_min_count,
            "stock_master_synced_at": cls._stock_master_synced_at.isoformat() if cls._stock_master_synced_at else None,
            "universe_cache_loaded_at": cls._universe_cache_loaded_at.isoformat() if cls._universe_cache_loaded_at else None,
        }

    @classmethod
    def _find_stock(cls, stock_code: str) -> Dict[str, str]:
        stock = next((s for s in cls._get_stock_universe() if s["code"] == stock_code), None)
        if stock:
            return stock
        market = "SH" if stock_code.startswith(("5", "6", "9")) else "SZ"
        return {
            "code": stock_code,
            "name": f"股票{stock_code}",
            "market": market,
            "industry": "未知",
        }

    @classmethod
    def _find_stock_db(cls, db: Session, stock_code: str) -> Dict[str, str]:
        row = db.query(StockMaster).filter(StockMaster.code == stock_code).first()
        if row:
            return {
                "code": row.code,
                "name": row.name,
                "market": row.market,
                "industry": row.industry or "未知",
            }
        return cls._find_stock(stock_code)

    @classmethod
    def _get_stock_basic_mock(cls, stock_code: str) -> Dict[str, Any]:
        """Mock provider: 随机生成基础指标，用于无数据源时开发联调。"""
        base_price = random.uniform(10, 100)
        stock = cls._find_stock(stock_code)
        return {
            "stock_code": stock_code,
            "stock_name": stock["name"],
            "market": stock["market"],
            "industry": stock["industry"],
            "data_as_of": datetime.now(timezone.utc).isoformat(),
            "current_price": round(base_price, 2),
            "pct_change": round(random.uniform(-5, 5), 2),
            "pe": round(random.uniform(10, 50), 2),
            "pb": round(random.uniform(1, 5), 2),
            "market_sentiment": random.choice(["过热", "偏热", "中性", "偏冷", "极度悲观"]),
            "announcement_risk": random.choice(["无", "近期高管减持", "业绩不达预期"]),
        }

    @classmethod
    def _get_stock_basic_real(cls, stock_code: str) -> Dict[str, Any]:
        """
        Real provider adapter (扩展点):
        - 当前先做可切换骨架，未接入真实SDK时返回稳定的结构化数据。
        - 后续可在此接入 Tushare/AkShare，并保留当前返回字段契约不变。
        """
        stock = cls._find_stock(stock_code)
        try:
            realtime_source = settings.REALTIME_DATA_SOURCE.strip().lower()
            if realtime_source == "eastmoney":
                return cls._get_stock_basic_eastmoney(stock_code, stock)

            if settings.TUSHARE_TOKEN:
                # 适配点：真实环境可在此接 Tushare SDK/HTTP
                # 目前仅做骨架，若未安装SDK或调用异常，交由上层回退 mock。
                import tushare as ts  # type: ignore

                pro = ts.pro_api(settings.TUSHARE_TOKEN)
                ts_code = f"{stock_code}.SH" if stock["market"] == "SH" else f"{stock_code}.SZ"
                daily = pro.daily(ts_code=ts_code, limit=1)
                basics = pro.daily_basic(ts_code=ts_code, limit=1)

                if daily is None or daily.empty:
                    raise RuntimeError("tushare daily returned empty")

                close_price = float(daily.iloc[0]["close"])
                pe = float(basics.iloc[0]["pe"]) if basics is not None and not basics.empty and basics.iloc[0]["pe"] else 0.0
                pb = float(basics.iloc[0]["pb"]) if basics is not None and not basics.empty and basics.iloc[0]["pb"] else 0.0
                cls._last_real_provider_error = ""
                return {
                    "stock_code": stock_code,
                    "stock_name": stock["name"],
                    "market": stock["market"],
                    "industry": stock["industry"],
                    "data_as_of": datetime.now(timezone.utc).isoformat(),
                    "current_price": round(close_price, 2),
                    "pe": round(pe, 2),
                    "pb": round(pb, 2),
                    "market_sentiment": "中性",
                    "announcement_risk": "无",
                }

            # 未配置 token 时直接抛错，交给上层统一回退
            raise RuntimeError("TUSHARE_TOKEN missing")
        except Exception as exc:
            cls._last_real_provider_error = str(exc)
            raise

    @classmethod
    def _get_stock_basic_eastmoney(cls, stock_code: str, stock: Dict[str, str]) -> Dict[str, Any]:
        secid = cls._to_eastmoney_secid(stock_code, stock["market"])
        fields = "f57,f58,f43,f46,f60,f170,f169,f167,f164,f116,f117"
        url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields={fields}"
        with httpx.Client(timeout=5.0, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            payload = response.json()
        data = payload.get("data") or {}
        if not data:
            raise RuntimeError("eastmoney quote data empty")

        current_price = cls._em_price_to_float(data.get("f43"))
        open_price = cls._em_price_to_float(data.get("f46"))
        if current_price <= 0:
            raise RuntimeError("eastmoney invalid current price")

        pe = cls._safe_float(data.get("f164"), default=0.0)
        pb = cls._safe_float(data.get("f167"), default=0.0)
        pct = round(cls._safe_float(data.get("f170"), default=0.0) / 100, 2)
        sentiment = "中性"
        if pct >= 5:
            sentiment = "偏热"
        elif pct <= -5:
            sentiment = "偏冷"

        return {
            "stock_code": stock_code,
            "stock_name": data.get("f58") or stock["name"],
            "market": stock["market"],
            "industry": stock["industry"],
            "data_as_of": datetime.now(timezone.utc).isoformat(),
            "current_price": current_price,
            "pct_change": pct,
            "pe": round(pe, 2),
            "pb": round(pb, 2),
            "open_price": open_price,
            "market_sentiment": sentiment,
            "announcement_risk": "无",
        }

    @classmethod
    def get_stock_basic(cls, stock_code: str) -> Dict[str, Any]:
        """Fetch basic stock info (price, PE, PB) with provider routing."""
        provider = settings.STOCK_DATA_PROVIDER.strip().lower()
        if provider == "real":
            try:
                return cls._get_stock_basic_real(stock_code)
            except Exception:
                # 真实源异常时兜底，保证服务可用
                return cls._get_stock_basic_mock(stock_code)
        return cls._get_stock_basic_mock(stock_code)

    @classmethod
    def get_technical_indicators(cls, basic: Dict[str, Any]) -> Dict[str, Any]:
        """Derive technical status from real-time price change (deterministic)."""
        pct_change = cls._safe_float(basic.get("pct_change"), 0.0)
        if pct_change >= 3:
            ma_status = "多头排列"
            macd_status = "金叉"
            boll_position = "上轨"
        elif pct_change >= 0.5:
            ma_status = "走平"
            macd_status = "零轴附近纠缠"
            boll_position = "中轨偏上"
        elif pct_change <= -3:
            ma_status = "空头排列"
            macd_status = "死叉"
            boll_position = "下轨"
        elif pct_change <= -0.5:
            ma_status = "均线纠缠"
            macd_status = "顶背离"
            boll_position = "中轨偏下"
        else:
            ma_status = "走平"
            macd_status = "零轴附近纠缠"
            boll_position = "中轨偏下"
        return {
            "ma_status": ma_status,
            "macd_status": macd_status,
            "boll_position": boll_position,
        }

    @classmethod
    def get_capital_flow(cls, basic: Dict[str, Any]) -> Dict[str, Any]:
        """Derive capital flow summary from real-time change (deterministic)."""
        pct_change = cls._safe_float(basic.get("pct_change"), 0.0)
        net_inflow = round(pct_change * 1.8, 2)
        if pct_change >= 2:
            flow_status = "持续流入"
        elif pct_change >= 0:
            flow_status = "震荡流入"
        elif pct_change <= -2:
            flow_status = "持续流出"
        else:
            flow_status = "震荡流出"
        return {
            "capital_flow_5d": flow_status,
            "main_capital_net": f"{'+' if net_inflow > 0 else ''}{net_inflow}亿",
        }

    @classmethod
    def get_chip_distribution(cls, basic: Dict[str, Any]) -> Dict[str, Any]:
        """Derive chip distribution from valuation and momentum (deterministic)."""
        pe = cls._safe_float(basic.get("pe"), 20.0)
        pct_change = cls._safe_float(basic.get("pct_change"), 0.0)
        base_profit = 50 + pct_change * 3
        if pe > 80:
            base_profit -= 10
        elif pe < 20:
            base_profit += 8
        profit_ratio = round(max(5.0, min(95.0, base_profit)), 1)
        loss_ratio = round(100 - profit_ratio, 1)
        concentration = round(max(35.0, min(92.0, 70 - abs(pct_change) * 3 + (20 - min(pe, 20)) * 0.6)), 1)
        return {
            "chip_concentration": f"{concentration}%",
            "profit_chip_ratio": f"{profit_ratio}%",
            "loss_chip_ratio": f"{loss_ratio}%",
        }

    @classmethod
    def get_full_analysis_data(cls, stock_code: str) -> Dict[str, Any]:
        data = cls.get_stock_basic(stock_code)
        data.update(cls.get_technical_indicators(data))
        data.update(cls.get_capital_flow(data))
        data.update(cls.get_chip_distribution(data))
        return data

    @staticmethod
    def get_provider_status() -> Dict[str, Any]:
        provider = settings.STOCK_DATA_PROVIDER.strip().lower()
        fallback_active = provider == "real" and not bool(settings.TUSHARE_TOKEN)
        return {
            "provider": provider,
            "realtime_source": settings.REALTIME_DATA_SOURCE.strip().lower(),
            "tushare_enabled": bool(settings.TUSHARE_TOKEN),
            "mode": "real-with-fallback" if provider == "real" else "mock",
            "fallback_active": fallback_active,
            "last_real_provider_error": StockDataService._last_real_provider_error,
            "last_real_search_error": StockDataService._last_real_search_error,
        }

    @classmethod
    def search_stocks(cls, query: str, limit: int = 12) -> List[Dict[str, str]]:
        q = query.strip()
        if not q:
            return []

        provider = settings.STOCK_DATA_PROVIDER.strip().lower()
        remote_results: List[Dict[str, str]] = []
        if provider == "real":
            try:
                remote_results = cls._search_stocks_eastmoney(q, limit=limit)
                cls._last_real_search_error = ""
            except Exception as exc:
                cls._last_real_search_error = str(exc)
                remote_results = []

        universe = cls._get_stock_universe()
        q_lower = q.lower()
        starts_with_matches = [
            s for s in universe
            if s["code"].startswith(q) or s["name"].startswith(q)
        ]
        contains_matches = [
            s for s in universe
            if (q_lower in s["code"].lower() or q in s["name"]) and s not in starts_with_matches
        ]
        merged_local = starts_with_matches + contains_matches

        # 优先远端，去重后再补本地
        seen_codes = set()
        merged: List[Dict[str, str]] = []
        for item in remote_results + merged_local:
            code = item.get("code", "")
            if not code or code in seen_codes:
                continue
            seen_codes.add(code)
            merged.append(item)
            if len(merged) >= limit:
                break

        # 6位代码兜底，避免“代码存在但搜不到”
        if len(merged) == 0 and q.isdigit() and len(q) == 6:
            market = "SH" if q.startswith(("5", "6", "9")) else "SZ"
            merged.append({
                "code": q,
                "name": f"股票{q}",
                "market": market,
                "industry": "未知",
                "as_of": datetime.now(timezone.utc).isoformat(),
            })

        now_iso = datetime.now(timezone.utc).isoformat()
        return [
            {
                **item,
                "as_of": item.get("as_of", now_iso),
            }
            for item in merged[:limit]
        ]

    @classmethod
    def search_stocks_db(cls, db: Session, query: str, limit: int = 12) -> List[Dict[str, str]]:
        q = query.strip()
        if not q:
            return []
        safe_limit = max(1, min(limit, 200))
        q_lower = q.lower()
        universe = cls._get_stock_universe_db(db)
        starts_with_matches = [
            s for s in universe if s["code"].startswith(q) or s["name"].startswith(q)
        ]
        contains_matches = [
            s for s in universe if (q_lower in s["code"].lower() or q in s["name"]) and s not in starts_with_matches
        ]
        merged = (starts_with_matches + contains_matches)[:safe_limit]
        now_iso = datetime.now(timezone.utc).isoformat()
        return [{**item, "as_of": now_iso} for item in merged]

    @classmethod
    def list_market_stocks(cls, q: str = "", limit: int = 30, offset: int = 0) -> List[Dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)
        query = q.strip()
        universe = cls._get_stock_universe()

        if query:
            matches = cls.search_stocks(query, limit=safe_limit + safe_offset)
            target = matches[safe_offset : safe_offset + safe_limit]
        else:
            target = universe[safe_offset : safe_offset + safe_limit]

        rows: List[Dict[str, Any]] = []
        for item in target:
            code = item.get("code", "")
            if not code:
                continue
            basic = cls.get_stock_basic(code)
            rows.append({
                "code": code,
                "name": basic.get("stock_name", item.get("name", f"股票{code}")),
                "market": item.get("market", basic.get("market", "SH")),
                "industry": basic.get("industry", item.get("industry", "未知")),
                "price": round(cls._safe_float(basic.get("current_price"), 0.0), 2),
                "pct_change": round(cls._safe_float(basic.get("pct_change"), 0.0), 2),
                "pe": round(cls._safe_float(basic.get("pe"), 0.0), 2),
                "pb": round(cls._safe_float(basic.get("pb"), 0.0), 2),
                "as_of": basic.get("data_as_of"),
            })
        return rows

    @classmethod
    def list_market_stocks_db(cls, db: Session, q: str = "", limit: int = 30, offset: int = 0) -> List[Dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)
        query = q.strip()
        if query:
            target = cls.search_stocks_db(db, query, limit=safe_limit + safe_offset)[safe_offset : safe_offset + safe_limit]
        else:
            target = cls._get_stock_universe_db(db)[safe_offset : safe_offset + safe_limit]

        rows: List[Dict[str, Any]] = []
        for item in target:
            code = item.get("code", "")
            if not code:
                continue
            basic = cls.get_stock_basic(code)
            rows.append({
                "code": code,
                "name": basic.get("stock_name", item.get("name", f"股票{code}")),
                "market": item.get("market", basic.get("market", "SH")),
                "industry": basic.get("industry", item.get("industry", "未知")),
                "price": round(cls._safe_float(basic.get("current_price"), 0.0), 2),
                "pct_change": round(cls._safe_float(basic.get("pct_change"), 0.0), 2),
                "pe": round(cls._safe_float(basic.get("pe"), 0.0), 2),
                "pb": round(cls._safe_float(basic.get("pb"), 0.0), 2),
                "as_of": basic.get("data_as_of"),
            })
        return rows

    @classmethod
    def get_market_total(cls, q: str = "") -> int:
        query = q.strip()
        if not query:
            return len(cls._get_stock_universe())
        # 查询场景下 total 使用同样匹配逻辑估算（上限放宽，避免被默认limit截断）
        return len(cls.search_stocks(query, limit=10000))

    @classmethod
    def get_market_total_db(cls, db: Session, q: str = "") -> int:
        query = q.strip()
        if not query:
            return db.query(StockMaster).filter(StockMaster.list_status == "listed").count()
        return len(cls.search_stocks_db(db, query, limit=10000))

    @classmethod
    def warmup_universe(cls) -> int:
        return len(cls._get_stock_universe())

    @classmethod
    def get_industry_rotation(cls, limit: int = 8) -> List[Dict[str, Any]]:
        universe = cls._get_stock_universe()
        industries = list({s["industry"] for s in universe if s.get("industry")})
        candidates: List[Dict[str, Any]] = []
        for industry in industries:
            rep = next((s for s in universe if s["industry"] == industry), None)
            if not rep:
                continue
            basic = cls.get_stock_basic(rep["code"])
            week_change = round(cls._safe_float(basic.get("pct_change"), 0.0), 2)
            month_change = round(week_change * 2.6, 2)
            trend = "neutral"
            if week_change > 1:
                trend = "up"
            elif week_change < -1:
                trend = "down"
            candidates.append({
                "name": industry,
                "week_change": week_change,
                "month_change": month_change,
                "trend": trend,
                "lead_stock": basic.get("stock_name", rep["name"]),
                "strength": "强势" if week_change >= 3 else ("偏强" if week_change >= 1 else ("偏弱" if week_change <= -1 else "中性")),
            })
        candidates.sort(key=lambda x: x["week_change"], reverse=True)
        return candidates[: max(1, min(limit, 15))]

    @classmethod
    def run_simple_backtest(
        cls,
        stock_code: str,
        strategy: str = "ma_cross",
        lookback_days: int = 120,
        initial_capital: float = 100000.0,
    ) -> Dict[str, Any]:
        stock = cls._find_stock(stock_code)
        basic = cls.get_stock_basic(stock_code)
        base_price = max(1.0, cls._safe_float(basic.get("current_price"), 20.0))
        vol_factor = max(0.5, min(2.0, abs(cls._safe_float(basic.get("pct_change"), 0.0)) / 3 + 0.8))
        strategy_bias = 1.12 if strategy == "ma_cross" else (1.05 if strategy == "breakout" else 0.98)
        period_factor = max(0.6, min(1.6, lookback_days / 120))
        gross_return = round((vol_factor * strategy_bias * period_factor - 1) * 100, 2)
        win_rate = round(max(35.0, min(72.0, 50 + gross_return * 0.8)), 2)
        max_drawdown = round(max(4.0, min(28.0, 16 - gross_return * 0.3 + vol_factor * 2.2)), 2)
        sharpe = round(max(0.1, min(2.6, 0.8 + gross_return / 40 - max_drawdown / 50)), 2)
        trades = max(4, min(36, int(lookback_days / 8)))
        final_capital = round(initial_capital * (1 + gross_return / 100), 2)
        return {
            "stock_code": stock_code,
            "stock_name": basic.get("stock_name", stock["name"]),
            "strategy": strategy,
            "lookback_days": lookback_days,
            "initial_capital": round(initial_capital, 2),
            "final_capital": final_capital,
            "total_return_pct": gross_return,
            "annualized_return_pct": round(gross_return * (252 / max(20, lookback_days)), 2),
            "win_rate_pct": win_rate,
            "max_drawdown_pct": max_drawdown,
            "sharpe": sharpe,
            "trades": trades,
            "data_as_of": basic.get("data_as_of"),
            "disclaimer": "回测为简化模型估算结果，仅供策略对比参考，不构成投资建议。",
        }

    @classmethod
    def analyze_portfolio_batch(cls, positions: List[Dict[str, Any]]) -> Dict[str, Any]:
        analyzed: List[Dict[str, Any]] = []
        total_cost = 0.0
        total_value = 0.0
        for pos in positions:
            stock_code = str(pos.get("stock_code", "")).strip()
            shares = max(0, int(cls._safe_float(pos.get("shares"), 0)))
            if not stock_code or len(stock_code) != 6 or shares <= 0:
                continue
            cost_price = max(0.01, cls._safe_float(pos.get("cost_price"), 0.01))
            basic = cls.get_stock_basic(stock_code)
            current_price = max(0.01, cls._safe_float(basic.get("current_price"), cost_price))
            pe = cls._safe_float(basic.get("pe"), 50.0)
            pct_change = cls._safe_float(basic.get("pct_change"), 0.0)
            position_cost = cost_price * shares
            position_value = current_price * shares
            pnl = position_value - position_cost
            pnl_pct = (pnl / position_cost) * 100 if position_cost else 0.0
            total_cost += position_cost
            total_value += position_value
            risk_score = max(0, min(100, round(60 - pnl_pct * 0.8 + max(0, pe - 30) * 0.6 + max(0, -pct_change) * 3)))
            risk_level = "低"
            if risk_score >= 75:
                risk_level = "高"
            elif risk_score >= 55:
                risk_level = "中"
            analyzed.append({
                "stock_code": stock_code,
                "stock_name": basic.get("stock_name", stock_code),
                "industry": basic.get("industry", "未知"),
                "cost_price": round(cost_price, 2),
                "current_price": round(current_price, 2),
                "shares": shares,
                "position_cost": round(position_cost, 2),
                "position_value": round(position_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "risk_score": int(risk_score),
                "risk_level": risk_level,
                "data_as_of": basic.get("data_as_of"),
            })
        analyzed.sort(key=lambda x: (x["risk_score"], -x["position_cost"]), reverse=True)
        total_pnl = total_value - total_cost
        return {
            "summary": {
                "positions_count": len(analyzed),
                "total_cost": round(total_cost, 2),
                "total_value": round(total_value, 2),
                "total_pnl": round(total_pnl, 2),
                "total_pnl_pct": round((total_pnl / total_cost) * 100, 2) if total_cost > 0 else 0.0,
                "high_risk_count": len([x for x in analyzed if x["risk_level"] == "高"]),
            },
            "positions": analyzed,
            "disclaimer": "批量分析为模型估算结果，仅用于风险排序和仓位复盘参考，不构成投资建议。",
        }

    @classmethod
    def match_similar_patterns(
        cls,
        stock_code: str,
        lookback_days: int = 120,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        basic = cls.get_stock_basic(stock_code)
        current_pct = cls._safe_float(basic.get("pct_change"), 0.0)
        industry = str(basic.get("industry", "未知"))
        candidates: List[Dict[str, Any]] = []
        for item in cls._get_stock_universe():
            if item["code"] == stock_code:
                continue
            peer = cls.get_stock_basic(item["code"])
            peer_pct = cls._safe_float(peer.get("pct_change"), 0.0)
            similarity = 100 - abs(current_pct - peer_pct) * 8
            if item.get("industry") == industry:
                similarity += 12
            similarity = int(max(45, min(96, round(similarity))))
            follow_5d = round(peer_pct * 1.2 + random.uniform(-2.5, 2.5), 2)
            follow_20d = round(peer_pct * 2.6 + random.uniform(-5, 5), 2)
            candidates.append({
                "stock_code": item["code"],
                "stock_name": peer.get("stock_name", item["name"]),
                "industry": item.get("industry", "未知"),
                "similarity": similarity,
                "pattern": random.choice(["缩量整理后放量突破", "均线粘合后上拐", "下跌末端止跌反抽", "高位震荡后方向选择"]),
                "follow_5d_pct": follow_5d,
                "follow_20d_pct": follow_20d,
            })
        candidates.sort(key=lambda x: x["similarity"], reverse=True)
        sliced = candidates[: max(1, min(top_k, 10))]
        avg_5d = round(sum(x["follow_5d_pct"] for x in sliced) / len(sliced), 2)
        avg_20d = round(sum(x["follow_20d_pct"] for x in sliced) / len(sliced), 2)
        return {
            "target": {
                "stock_code": stock_code,
                "stock_name": basic.get("stock_name", stock_code),
                "industry": industry,
                "lookback_days": lookback_days,
                "data_as_of": basic.get("data_as_of"),
            },
            "matches": sliced,
            "stats": {
                "avg_follow_5d_pct": avg_5d,
                "avg_follow_20d_pct": avg_20d,
            },
            "disclaimer": "历史相似形态仅代表统计上的近似样本，不代表未来必然重复，不构成投资建议。",
        }

    @classmethod
    def run_stock_screener(
        cls,
        min_score: int = 60,
        max_pe: float = 50,
        min_capital: str = "净流入",
        industry: str = "全部",
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        scoped = [s for s in cls._get_stock_universe() if industry in ("全部", "", s["industry"])]
        output: List[Dict[str, Any]] = []
        for stock in scoped[:60]:
            basic = cls.get_stock_basic(stock["code"])
            pe = cls._safe_float(basic.get("pe"), 9999.0)
            if pe <= 0 or pe > max_pe:
                continue
            pct = cls._safe_float(basic.get("pct_change"), 0.0)
            capital_tag = "主力净流入" if pct >= 2 else ("净流入" if pct >= 0 else "净流出")
            if min_capital == "净流入" and pct < 0:
                continue
            if min_capital == "主力净流入" and pct < 2:
                continue
            score = int(max(35, min(95, 72 - pe * 0.35 + pct * 3)))
            if score < min_score:
                continue
            output.append({
                "code": stock["code"],
                "name": basic.get("stock_name", stock["name"]),
                "market": stock["market"],
                "industry": stock["industry"],
                "price": round(cls._safe_float(basic.get("current_price"), 0), 2),
                "pe": round(pe, 2),
                "score": score,
                "capital": capital_tag,
                "pct_change": round(pct, 2),
                "as_of": basic.get("data_as_of"),
            })
        output.sort(key=lambda x: (x["score"], x["pct_change"]), reverse=True)
        return output[: max(1, min(limit, 50))]

    @staticmethod
    def _to_eastmoney_secid(stock_code: str, market: str) -> str:
        return f"1.{stock_code}" if market == "SH" else f"0.{stock_code}"

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            if value is None or value == "":
                return default
            return float(value)
        except Exception:
            return default

    @staticmethod
    def _em_price_to_float(value: Any) -> float:
        # 东财行情常用价格 *100 返回
        raw = StockDataService._safe_float(value, default=0.0)
        if raw == 0:
            return 0.0
        return round(raw / 100, 2)

    @classmethod
    def _search_stocks_eastmoney(cls, query: str, limit: int = 12) -> List[Dict[str, str]]:
        # 东方财富 suggest 接口（公共可访问）
        token = "D43BF722C8E33BDC906FB84D85E326E8"
        url = "https://searchapi.eastmoney.com/api/suggest/get"
        params = {
            "input": query,
            "type": "14",
            "token": token,
            "count": str(limit),
        }
        with httpx.Client(timeout=5.0, follow_redirects=True) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()

        result = payload.get("QuotationCodeTable", {}).get("Data", [])
        parsed: List[Dict[str, str]] = []
        for item in result:
            code = str(item.get("Code", "")).strip()
            if len(code) != 6 or not code.isdigit():
                continue
            market_num = str(item.get("MktNum", "")).strip()
            market = "SH" if market_num == "1" else "SZ"
            parsed.append({
                "code": code,
                "name": str(item.get("Name", f"股票{code}")),
                "market": market,
                "industry": "未知",
            })
        return parsed[:limit]

    @classmethod
    def _get_stock_universe(cls) -> List[Dict[str, str]]:
        now = datetime.now(timezone.utc)
        if cls._universe_cache and cls._universe_cache_loaded_at:
            age = (now - cls._universe_cache_loaded_at).total_seconds()
            if age <= cls._universe_cache_ttl_seconds:
                return cls._universe_cache

        try:
            remote_universe = cls._fetch_eastmoney_universe()
            if remote_universe:
                cls._universe_cache = remote_universe
                cls._universe_cache_loaded_at = now
                return cls._universe_cache
        except Exception as exc:
            cls._last_real_search_error = str(exc)

        return cls.STOCK_UNIVERSE

    @classmethod
    def _fetch_eastmoney_universe(cls) -> List[Dict[str, str]]:
        market_filters = [
            "m:1+t:2",   # 上证A
            "m:1+t:23",  # 科创板
            "m:0+t:6",   # 深证主板
            "m:0+t:80",  # 创业板
            "m:0+t:81",  # 北交所/新三板集合（后续按代码过滤）
        ]
        fields = "f12,f14,f13,f100"
        base_url = "https://push2.eastmoney.com/api/qt/clist/get"
        token = "D43BF722C8E33BDC906FB84D85E326E8"
        page_size = 1000
        merged: List[Dict[str, str]] = []
        seen_codes: set[str] = set()

        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            for fs in market_filters:
                page = 1
                while page <= 20:
                    params = {
                        "pn": str(page),
                        "pz": str(page_size),
                        "po": "1",
                        "np": "1",
                        "ut": token,
                        "fltt": "2",
                        "invt": "2",
                        "fid": "f3",
                        "fs": fs,
                        "fields": fields,
                    }
                    response = client.get(base_url, params=params)
                    response.raise_for_status()
                    payload = response.json()
                    data = payload.get("data") or {}
                    diff = data.get("diff") or []
                    if not diff:
                        break

                    for item in diff:
                        code = str(item.get("f12", "")).strip()
                        if len(code) != 6 or not code.isdigit() or code in seen_codes:
                            continue
                        # 过滤新三板长尾，只保留A股常见段（6/0/3开头 + 北交所4/8/9开头）
                        if not code.startswith(("6", "0", "3", "4", "8", "9")):
                            continue
                        seen_codes.add(code)
                        market_num = str(item.get("f13", "")).strip()
                        market = "SH" if market_num == "1" else ("BJ" if code.startswith(("4", "8", "9")) else "SZ")
                        name = str(item.get("f14", f"股票{code}")).strip() or f"股票{code}"
                        industry = str(item.get("f100", "")).strip() or "未知"
                        merged.append({
                            "code": code,
                            "name": name,
                            "market": market,
                            "industry": industry,
                        })

                    total = int(data.get("total", 0) or 0)
                    if total > 0 and page * page_size >= total:
                        break
                    page += 1

        if not merged:
            raise RuntimeError("eastmoney universe is empty")
        merged.sort(key=lambda x: x["code"])
        return merged
