// Stock types
export interface StockBasic {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  marketCap: number;
  pe: number;
  pb: number;
}

export interface ScoreBreakdown {
  trend: number;
  capital: number;
  chip: number;
  sentiment: number;
  fundamental: number;
}

export type TrendStatus = '强势上行' | '温和上行' | '横盘震荡' | '温和下行' | '强势下行';
export type TrendPosition = '高位' | '中高位' | '中位' | '中低位' | '低位';
export type CapitalStatus = '主力持续流入' | '主力小幅流入' | '资金平衡' | '主力小幅流出' | '主力持续流出';
export type ChipStatus = '筹码集中低位' | '筹码分散' | '筹码集中高位';
export type SentimentLevel = '过热' | '偏热' | '中性' | '偏冷' | '极度悲观';
export type SignalStrength = '强' | '中' | '弱';
export type BuySignalType = 'B1' | 'B2' | 'B3';
export type SellSignalType = 'S1' | 'S2' | 'S3';

export interface BuySignal {
  type: BuySignalType;
  description: string;
  zone_low: number;
  zone_high: number;
  strength: SignalStrength;
  conditions_met: number;
}

export interface SellSignal {
  type: SellSignalType;
  description: string;
  zone_low: number;
  zone_high: number;
  strength: SignalStrength;
}

export interface StockAnalysis {
  id: string;
  stock_code: string;
  stock_name: string;
  market?: string;
  industry?: string;
  data_as_of?: string;
  analysis_date: string;
  market_price: number;

  bull_eye_score: number;
  scores: ScoreBreakdown;

  trend_status: TrendStatus;
  trend_position: TrendPosition;
  capital_status: CapitalStatus;
  chip_status: ChipStatus;
  sentiment: SentimentLevel;

  buy_signals: BuySignal[];
  sell_signals: SellSignal[];

  analysis_for_beginner: string;
  analysis_for_intermediate: string;
  analysis_for_advanced: string;

  key_support: number;
  key_resistance: number;

  risk_factors: string[];
  personal_take: string;
  disclaimer: string;
}

// Portfolio types
export type TrapLevel = 'profit' | 'light' | 'medium' | 'deep' | 'extreme';

export interface Position {
  id: string;
  stock_code: string;
  stock_name: string;
  cost_price: number;
  shares: number;
  current_price: number;
  profit_loss: number;
  profit_loss_pct: number;
  trap_level: TrapLevel;
  origin_tag?: string;
  latest_analysis?: StockAnalysis;
}

// Trap analysis
export interface TrapPath {
  title: string;
  applicable: boolean;
  conditions: string;
  analysis: string;
  key_signals_to_watch?: string[];
  reference_exit_zone?: string;
  time_estimate?: string;
  reference_rebound_zone?: string;
  risk_if_not_executed?: string;
  key_price_levels?: { must_hold: number; break_above: number };
  waiting_cost?: string;
  risk_level: '高' | '中' | '低';
}

export interface TrapAnalysis {
  trap_assessment: string;
  path_a: TrapPath;
  path_b: TrapPath;
  path_c: TrapPath;
  recommended_path: 'A' | 'B' | 'C';
  recommendation_reason: string;
  psychological_note: string;
  disclaimer: string;
}

// Market overview
export interface MarketOverview {
  sentiment_score: number;
  sentiment_label: SentimentLevel;
  advance_count: number;
  decline_count: number;
  limit_up: number;
  limit_down: number;
  main_capital_net: number;
  hot_sectors: SectorData[];
  cold_sectors: SectorData[];
}

export interface SectorData {
  name: string;
  change_pct: number;
  capital_net: number;
  lead_stock: string;
}

// User
export interface User {
  id: string;
  phone: string;
  nickname: string;
  vip_level: 0 | 1 | 2;
  vip_expire_at?: string;
  daily_quota: number;
  daily_used: number;
}

// Search result
export interface SearchResult {
  code: string;
  name: string;
  market: string;
  industry: string;
  as_of?: string;
}
