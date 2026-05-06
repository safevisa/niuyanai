import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean, DECIMAL, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(11), unique=True, index=True)
    nickname = Column(String(50))
    vip_level = Column(Integer, default=0) # 0: free, 1: VIP, 2: PRO
    vip_expire_at = Column(DateTime, nullable=True)
    daily_quota = Column(Integer, default=3)
    daily_used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    stock_code = Column(String(10), index=True)
    stock_name = Column(String(50))
    analysis_date = Column(DateTime)
    bull_eye_score = Column(Integer)
    trend_score = Column(Integer)
    capital_score = Column(Integer)
    chip_score = Column(Integer)
    sentiment_score = Column(Integer)
    fundamental_score = Column(Integer)
    ai_analysis = Column(JSON) # 完整AI分析结果
    buy_zone_low = Column(DECIMAL(10, 2))
    buy_zone_high = Column(DECIMAL(10, 2))
    sell_zone_low = Column(DECIMAL(10, 2))
    sell_zone_high = Column(DECIMAL(10, 2))
    market_price = Column(DECIMAL(10, 2))
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User")

class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    stock_code = Column(String(10), index=True)
    stock_name = Column(String(50))
    cost_price = Column(DECIMAL(10, 2))
    shares = Column(Integer)
    current_price = Column(DECIMAL(10, 2))
    profit_loss = Column(DECIMAL(10, 2))
    profit_loss_pct = Column(DECIMAL(5, 2))
    trap_level = Column(String(10)) # light/medium/deep/extreme
    latest_analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    analysis = relationship("Analysis")

class TrapAnalysis(Base):
    __tablename__ = "trap_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    position_id = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    path_a = Column(JSON)
    path_b = Column(JSON)
    path_c = Column(JSON)
    recommended_path = Column(String(1))
    key_support = Column(DECIMAL(10, 2))
    key_resistance = Column(DECIMAL(10, 2))
    created_at = Column(DateTime, server_default=func.now())

    position = relationship("Position")

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    stock_code = Column(String(10))
    alert_type = Column(String(20)) # support_break / resistance_break / score_change
    trigger_price = Column(DECIMAL(10, 2))
    is_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    plan = Column(String(10)) # vip / pro
    amount = Column(DECIMAL(8, 2))
    payment_method = Column(String(20))
    started_at = Column(DateTime)
    expired_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True)
    code = Column(String(20), unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

class InviteRelation(Base):
    __tablename__ = "invite_relations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inviter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    invitee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    order_no = Column(String(40), unique=True, index=True)
    plan = Column(String(10))  # vip / pro
    amount = Column(DECIMAL(8, 2))
    payment_method = Column(String(20), default="wechat_mock")
    status = Column(String(20), default="pending")  # pending / paid / failed
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class StockMaster(Base):
    __tablename__ = "stock_master"
    __table_args__ = (
        UniqueConstraint("code", name="uq_stock_master_code"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(10), index=True, nullable=False)
    name = Column(String(100), index=True, nullable=False)
    market = Column(String(10), index=True, nullable=False)
    industry = Column(String(100), nullable=False, default="未知")
    list_status = Column(String(20), nullable=False, default="listed")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())
