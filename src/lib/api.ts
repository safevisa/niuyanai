import type { SearchResult, StockAnalysis, User } from '@/types';
import { generateMockAnalysis } from '@/lib/mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type AnalysisApiResponse = {
  status?: string;
  data?: Partial<StockAnalysis>;
};

type LoginResponse = {
  token: string;
  user: User;
};

export type LoginAccountType = 'phone' | 'email';

export type AnalysisHistoryItem = {
  id: string;
  stock_code: string;
  stock_name: string;
  analysis_date: string | null;
  data_as_of?: string | null;
  bull_eye_score: number;
  market_price: number | null;
  market?: string;
  industry?: string;
  created_at: string | null;
};

type AnalysisHistoryResponse = {
  status?: string;
  data?: AnalysisHistoryItem[];
};

type SearchStocksResponse = {
  status?: string;
  data?: SearchResult[];
  total?: number;
};

export type StockProviderStatus = {
  provider: string;
  realtime_source?: string;
  tushare_enabled: boolean;
  mode: string;
  fallback_active: boolean;
  last_real_provider_error: string;
  last_real_search_error?: string;
};

type StockProviderStatusResponse = {
  status?: string;
  data?: StockProviderStatus;
};

export type IndustryRotationItem = {
  name: string;
  week_change: number;
  month_change: number;
  trend: 'up' | 'down' | 'neutral';
  lead_stock?: string;
  strength?: string;
};

type IndustryRotationResponse = {
  status?: string;
  data?: IndustryRotationItem[];
};

export type MarketStockItem = {
  code: string;
  name: string;
  market: string;
  industry: string;
  price: number;
  pct_change: number;
  pe: number;
  pb: number;
  as_of?: string;
};

type MarketStocksResponse = {
  status?: string;
  data?: MarketStockItem[];
  total?: number;
};

export type MarketStocksPage = {
  rows: MarketStockItem[];
  total: number;
};

export type ScreenerRequest = {
  minScore: number;
  maxPE: number;
  minCapital: string;
  industry: string;
  limit?: number;
};

export type ScreenerResultItem = {
  code: string;
  name: string;
  market: string;
  industry: string;
  price: number;
  pe: number;
  score: number;
  capital: string;
  pct_change: number;
  as_of?: string;
};

type ScreenerResponse = {
  status?: string;
  data?: ScreenerResultItem[];
};

export type BacktestRequest = {
  stockCode: string;
  strategy: 'ma_cross' | 'breakout' | 'mean_revert';
  lookbackDays: number;
  initialCapital: number;
};

export type BacktestResult = {
  stock_code: string;
  stock_name: string;
  strategy: string;
  lookback_days: number;
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  annualized_return_pct: number;
  win_rate_pct: number;
  max_drawdown_pct: number;
  sharpe: number;
  trades: number;
  data_as_of?: string;
  disclaimer: string;
};

type BacktestResponse = {
  status?: string;
  data?: BacktestResult;
};

export type BatchPortfolioPosition = {
  stock_code: string;
  cost_price: number;
  shares: number;
};

export type BatchPortfolioResult = {
  summary: {
    positions_count: number;
    total_cost: number;
    total_value: number;
    total_pnl: number;
    total_pnl_pct: number;
    high_risk_count: number;
  };
  positions: Array<{
    stock_code: string;
    stock_name: string;
    industry: string;
    cost_price: number;
    current_price: number;
    shares: number;
    position_cost: number;
    position_value: number;
    pnl: number;
    pnl_pct: number;
    risk_score: number;
    risk_level: string;
    data_as_of?: string;
  }>;
  disclaimer: string;
};

type BatchPortfolioResponse = {
  status?: string;
  data?: BatchPortfolioResult;
};

export type PatternMatchRequest = {
  stockCode: string;
  lookbackDays: number;
  topK: number;
};

export type PatternMatchResult = {
  target: {
    stock_code: string;
    stock_name: string;
    industry: string;
    lookback_days: number;
    data_as_of?: string;
  };
  matches: Array<{
    stock_code: string;
    stock_name: string;
    industry: string;
    similarity: number;
    pattern: string;
    follow_5d_pct: number;
    follow_20d_pct: number;
  }>;
  stats: {
    avg_follow_5d_pct: number;
    avg_follow_20d_pct: number;
  };
  disclaimer: string;
};

type PatternMatchResponse = {
  status?: string;
  data?: PatternMatchResult;
};

export type PriceAlertItem = {
  id: string;
  stock_code: string;
  alert_type: 'price_above' | 'price_below' | string;
  trigger_price: number;
  is_triggered: boolean;
  created_at?: string | null;
};

type PriceAlertListResponse = {
  status?: string;
  data?: PriceAlertItem[];
};

type CreatePriceAlertRequest = {
  stockCode: string;
  alertType: 'price_above' | 'price_below';
  triggerPrice: number;
};

type CreatePriceAlertResponse = {
  status?: string;
  data?: { id: string };
};

type CheckAlertsResponse = {
  status?: string;
  data?: {
    triggered: Array<{
      id: string;
      stock_code: string;
      current_price: number;
      trigger_price: number;
      alert_type: string;
    }>;
    count: number;
  };
};

export type DailyReport = {
  report_date: string;
  user_id: string;
  history_count: number;
  summary: string[];
  top_rotation: {
    up?: { name: string; week_change: number; month_change: number };
    down?: { name: string; week_change: number; month_change: number };
  };
  focus_stocks: Array<{
    stock_code: string;
    stock_name: string;
    score: number;
    pct_change: number;
    industry: string;
  }>;
  risk_tips: string[];
  disclaimer: string;
};

type DailyReportResponse = {
  status?: string;
  data?: DailyReport;
};

export type InviteProfile = {
  my_code: string;
  invited_count: number;
  has_bound_inviter: boolean;
};

type InviteProfileResponse = {
  status?: string;
  data?: InviteProfile;
};

export type PaymentOrder = {
  order_no: string;
  plan: string;
  amount: number;
  status: string;
  created_at?: string | null;
  paid_at?: string | null;
};

type CreatePaymentResponse = {
  status?: string;
  data?: {
    order_no: string;
    plan: string;
    amount: number;
    payment_url: string;
    status: string;
  };
};

type CreatePaymentData = NonNullable<CreatePaymentResponse['data']>;

type PaymentOrdersResponse = {
  status?: string;
  data?: PaymentOrder[];
};

function authHeaders(token?: string): HeadersInit {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAnalysis(stock: SearchResult, data: Partial<StockAnalysis>): StockAnalysis {
  const fallback = generateMockAnalysis(stock.code);

  return {
    ...fallback,
    ...data,
    id: data.id ?? fallback.id,
    stock_code: data.stock_code ?? stock.code,
    stock_name: data.stock_name ?? stock.name,
    market: data.market ?? stock.market,
    industry: data.industry ?? stock.industry,
    data_as_of: data.data_as_of ?? stock.as_of,
    analysis_date: data.analysis_date ?? fallback.analysis_date,
    market_price: asNumber(data.market_price, fallback.market_price),
    bull_eye_score: asNumber(data.bull_eye_score, fallback.bull_eye_score),
    scores: {
      trend: asNumber(data.scores?.trend, fallback.scores.trend),
      capital: asNumber(data.scores?.capital, fallback.scores.capital),
      chip: asNumber(data.scores?.chip, fallback.scores.chip),
      sentiment: asNumber(data.scores?.sentiment, fallback.scores.sentiment),
      fundamental: asNumber(data.scores?.fundamental, fallback.scores.fundamental),
    },
    buy_signals: Array.isArray(data.buy_signals) ? data.buy_signals : fallback.buy_signals,
    sell_signals: Array.isArray(data.sell_signals) ? data.sell_signals : fallback.sell_signals,
    risk_factors: Array.isArray(data.risk_factors) ? data.risk_factors : fallback.risk_factors,
  };
}

export async function requestStockAnalysis(stock: SearchResult, token?: string): Promise<StockAnalysis> {
  const response = await fetch(
    `${API_BASE_URL}/api/analysis/stock/${encodeURIComponent(stock.code)}`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );

  if (!response.ok) {
    let detail = '';
    try {
      const errPayload = (await response.json()) as { detail?: string };
      detail = errPayload.detail ?? '';
    } catch {
      detail = '';
    }
    if (response.status === 429) {
      throw new Error(`QUOTA_EXCEEDED:${detail || 'Daily quota exceeded'}`);
    }
    throw new Error(`Analysis request failed: ${response.status}`);
  }

  const payload = (await response.json()) as AnalysisApiResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid analysis response payload');
  }

  return normalizeAnalysis(stock, payload.data);
}

export async function loginDemoUser(): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: '13800000000',
      code: '000000',
      nickname: '演示用户',
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  return (await response.json()) as LoginResponse;
}

export async function sendLoginCode(account: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ account }),
  });
  if (!response.ok) {
    throw new Error(`Send code failed: ${response.status}`);
  }
}

export async function loginWithAccount(
  account: string,
  code: string,
  accountType: LoginAccountType,
  nickname?: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account,
      phone: accountType === 'phone' ? account : undefined,
      email: accountType === 'email' ? account : undefined,
      code,
      nickname,
    }),
  });
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  return (await response.json()) as LoginResponse;
}

export async function loginWithPhone(phone: string, nickname?: string): Promise<LoginResponse> {
  return loginWithAccount(phone, '000000', 'phone', nickname);
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Fetch user failed: ${response.status}`);
  }
  return (await response.json()) as User;
}

export async function fetchAnalysisHistory(token: string, limit = 20, offset = 0): Promise<AnalysisHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/history?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Fetch history failed: ${response.status}`);
  }

  const payload = (await response.json()) as AnalysisHistoryResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid history response payload');
  }

  return payload.data;
}

export async function searchStocksRemote(query: string, limit = 12): Promise<SearchResult[]> {
  const page = await searchStocksRemotePage(query, limit);
  return page.rows;
}

export async function searchStocksRemotePage(query: string, limit = 12): Promise<{ rows: SearchResult[]; total: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/search/stocks?q=${encodeURIComponent(query)}&limit=${limit}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const payload = (await response.json()) as SearchStocksResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid search response payload');
  }
  return {
    rows: payload.data,
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : payload.data.length,
  };
}

export async function fetchStockProviderStatus(): Promise<StockProviderStatus> {
  const response = await fetch(`${API_BASE_URL}/api/stock/provider/status`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Fetch provider status failed: ${response.status}`);
  }
  const payload = (await response.json()) as StockProviderStatusResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid provider status payload');
  }
  return payload.data;
}

export async function fetchIndustryRotation(limit = 8): Promise<IndustryRotationItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/market/industry-rotation?limit=${limit}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Fetch industry rotation failed: ${response.status}`);
  }
  const payload = (await response.json()) as IndustryRotationResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid industry rotation payload');
  }
  return payload.data;
}

export async function fetchMarketStocks(query = '', limit = 30, offset = 0): Promise<MarketStockItem[]> {
  const page = await fetchMarketStocksPage(query, limit, offset);
  return page.rows;
}

export async function fetchMarketStocksPage(query = '', limit = 30, offset = 0): Promise<MarketStocksPage> {
  const response = await fetch(
    `${API_BASE_URL}/api/market/stocks?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  );
  if (!response.ok) {
    throw new Error(`Fetch market stocks failed: ${response.status}`);
  }
  const payload = (await response.json()) as MarketStocksResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid market stocks payload');
  }
  return {
    rows: payload.data,
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : payload.data.length,
  };
}

export async function runStockScreener(params: ScreenerRequest): Promise<ScreenerResultItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/tools/screener`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Screener failed: ${response.status}`);
  }
  const payload = (await response.json()) as ScreenerResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid screener payload');
  }
  return payload.data;
}

export async function runBacktest(params: BacktestRequest): Promise<BacktestResult> {
  const response = await fetch(`${API_BASE_URL}/api/tools/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Backtest failed: ${response.status}`);
  }
  const payload = (await response.json()) as BacktestResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid backtest payload');
  }
  return payload.data;
}

export async function runBatchPortfolioAnalysis(positions: BatchPortfolioPosition[]): Promise<BatchPortfolioResult> {
  const response = await fetch(`${API_BASE_URL}/api/tools/portfolio-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
  if (!response.ok) {
    throw new Error(`Batch portfolio analysis failed: ${response.status}`);
  }
  const payload = (await response.json()) as BatchPortfolioResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid batch portfolio payload');
  }
  return payload.data;
}

export async function runPatternMatch(params: PatternMatchRequest): Promise<PatternMatchResult> {
  const response = await fetch(`${API_BASE_URL}/api/tools/pattern-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Pattern match failed: ${response.status}`);
  }
  const payload = (await response.json()) as PatternMatchResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid pattern match payload');
  }
  return payload.data;
}

export async function fetchPriceAlerts(token: string): Promise<PriceAlertItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/alerts`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Fetch alerts failed: ${response.status}`);
  }
  const payload = (await response.json()) as PriceAlertListResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid alerts payload');
  }
  return payload.data;
}

export async function createPriceAlert(input: CreatePriceAlertRequest, token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Create alert failed: ${response.status}`);
  }
  const payload = (await response.json()) as CreatePriceAlertResponse;
  if (payload.status !== 'success' || !payload.data?.id) {
    throw new Error('Invalid create alert payload');
  }
  return payload.data.id;
}

export async function deletePriceAlert(alertId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${encodeURIComponent(alertId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Delete alert failed: ${response.status}`);
  }
}

export async function checkPriceAlerts(token: string): Promise<CheckAlertsResponse['data']> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/check`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Check alerts failed: ${response.status}`);
  }
  const payload = (await response.json()) as CheckAlertsResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid check alerts payload');
  }
  return payload.data;
}

export async function generateDailyReport(token: string, focusIndustry = '全部'): Promise<DailyReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ focusIndustry }),
  });
  if (!response.ok) {
    throw new Error(`Generate daily report failed: ${response.status}`);
  }
  const payload = (await response.json()) as DailyReportResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid daily report payload');
  }
  return payload.data;
}

export async function fetchInviteProfile(token: string): Promise<InviteProfile> {
  const response = await fetch(`${API_BASE_URL}/api/invite/me`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Fetch invite profile failed: ${response.status}`);
  }
  const payload = (await response.json()) as InviteProfileResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid invite profile payload');
  }
  return payload.data;
}

export async function bindInviteCode(code: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/invite/bind`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(`Bind invite code failed: ${response.status}`);
  }
}

export async function createPaymentOrder(plan: 'vip' | 'pro', token: string): Promise<CreatePaymentData> {
  const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ plan }),
  });
  if (!response.ok) {
    throw new Error(`Create payment order failed: ${response.status}`);
  }
  const payload = (await response.json()) as CreatePaymentResponse;
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid create payment payload');
  }
  return payload.data;
}

export async function confirmPaymentOrder(orderNo: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/payments/mock-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ orderNo }),
  });
  if (!response.ok) {
    throw new Error(`Confirm payment failed: ${response.status}`);
  }
}

export async function fetchPaymentOrders(token: string): Promise<PaymentOrder[]> {
  const response = await fetch(`${API_BASE_URL}/api/payments/orders`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Fetch payment orders failed: ${response.status}`);
  }
  const payload = (await response.json()) as PaymentOrdersResponse;
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Invalid payment orders payload');
  }
  return payload.data;
}

export async function fetchPaymentOrder(orderNo: string, token: string): Promise<PaymentOrder> {
  const response = await fetch(`${API_BASE_URL}/api/payments/orders/${encodeURIComponent(orderNo)}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Fetch payment order failed: ${response.status}`);
  }
  const payload = (await response.json()) as { status?: string; data?: PaymentOrder };
  if (payload.status !== 'success' || !payload.data) {
    throw new Error('Invalid payment order payload');
  }
  return payload.data;
}
