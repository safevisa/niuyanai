import type {
  StockBasic, StockAnalysis, SearchResult,
  MarketOverview, Position, TrapAnalysis
} from '@/types';

// ====== Mock Search Results ======
const MOCK_STOCKS: SearchResult[] = [
  { code: '600519', name: '贵州茅台', market: 'SH', industry: '白酒' },
  { code: '000858', name: '五粮液',   market: 'SZ', industry: '白酒' },
  { code: '300750', name: '宁德时代', market: 'SZ', industry: '新能源' },
  { code: '600036', name: '招商银行', market: 'SH', industry: '银行' },
  { code: '601318', name: '中国平安', market: 'SH', industry: '保险' },
  { code: '000002', name: '万科A',   market: 'SZ', industry: '房地产' },
  { code: '600900', name: '长江电力', market: 'SH', industry: '电力' },
  { code: '002594', name: '比亚迪',  market: 'SZ', industry: '新能源汽车' },
  { code: '601012', name: '隆基绿能', market: 'SH', industry: '光伏' },
  { code: '600276', name: '恒瑞医药', market: 'SH', industry: '医药' },
  { code: '000001', name: '平安银行', market: 'SZ', industry: '银行' },
  { code: '601888', name: '中国中免', market: 'SH', industry: '免税' },
];

export function searchStocks(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return MOCK_STOCKS.filter(
    (s) => s.code.includes(q) || s.name.includes(query)
  ).slice(0, 6);
}

// ====== Mock Stock Basic ======
export function getMockStockBasic(code: string): StockBasic {
  const stock = MOCK_STOCKS.find((s) => s.code === code);
  const seed = parseInt(code.slice(-2)) || 50;
  const basePrice = 50 + seed * 8;
  const change = ((seed % 5) - 2) * 0.5;
  return {
    code,
    name: stock?.name ?? '未知股票',
    price: basePrice,
    change,
    changePercent: (change / basePrice) * 100,
    volume: 120000 + seed * 5000,
    turnover: (120000 + seed * 5000) * basePrice,
    marketCap: basePrice * 1000000000,
    pe: 15 + seed * 0.5,
    pb: 1.5 + seed * 0.03,
  };
}

// ====== Mock Analysis Generator ======
export function generateMockAnalysis(code: string): StockAnalysis {
  const stock = MOCK_STOCKS.find((s) => s.code === code);
  const basic = getMockStockBasic(code);
  const seed = parseInt(code.slice(-2)) || 50;

  const trendScore      = Math.min(95, 45 + (seed % 50));
  const capitalScore    = Math.min(90, 40 + ((seed * 3) % 50));
  const chipScore       = Math.min(88, 35 + ((seed * 7) % 55));
  const sentimentScore  = Math.min(85, 30 + ((seed * 11) % 55));
  const fundamentalScore= Math.min(92, 50 + ((seed * 13) % 45));

  const bullEyeScore = Math.round(
    trendScore * 0.25 +
    capitalScore * 0.25 +
    chipScore * 0.20 +
    sentimentScore * 0.15 +
    fundamentalScore * 0.15
  );

  const trendStatuses = ['强势上行', '温和上行', '横盘震荡', '温和下行', '强势下行'] as const;
  const trendPositions = ['高位', '中高位', '中位', '中低位', '低位'] as const;
  const capitalStatuses = ['主力持续流入', '主力小幅流入', '资金平衡', '主力小幅流出', '主力持续流出'] as const;

  const trendStatus    = trendStatuses[seed % 5];
  const trendPosition  = trendPositions[(seed * 3) % 5];
  const capitalStatus  = capitalStatuses[(seed * 7) % 5];

  const price = basic.price;
  const hasBuySignal  = bullEyeScore >= 60;
  const hasSellSignal = bullEyeScore <= 40;

  return {
    id: `analysis-${code}-${Date.now()}`,
    stock_code: code,
    stock_name: stock?.name ?? '未知股票',
    analysis_date: new Date().toISOString().slice(0, 10),
    market_price: price,

    bull_eye_score: bullEyeScore,
    scores: {
      trend: trendScore,
      capital: capitalScore,
      chip: chipScore,
      sentiment: sentimentScore,
      fundamental: fundamentalScore,
    },

    trend_status: trendStatus,
    trend_position: trendPosition,
    capital_status: capitalStatus,
    chip_status: seed % 3 === 0 ? '筹码集中低位' : seed % 3 === 1 ? '筹码分散' : '筹码集中高位',
    sentiment: seed % 5 === 0 ? '过热' : seed % 5 === 1 ? '偏热' : seed % 5 === 2 ? '中性' : seed % 5 === 3 ? '偏冷' : '极度悲观',

    buy_signals: hasBuySignal ? [
      {
        type: 'B2',
        description: `价格回踩至20日均线附近，资金呈现净流入，历史上类似位置有较好的支撑效果`,
        zone_low:  +(price * 0.97).toFixed(2),
        zone_high: +(price * 1.02).toFixed(2),
        strength: bullEyeScore >= 75 ? '强' : '中',
        conditions_met: 3,
      }
    ] : [],
    sell_signals: hasSellSignal ? [
      {
        type: 'S2',
        description: `价格跌破20日均线且资金持续流出，历史上类似形态后续有一定压力`,
        zone_low:  +(price * 0.96).toFixed(2),
        zone_high: +(price * 0.99).toFixed(2),
        strength: '中',
      }
    ] : [],

    analysis_for_beginner: `这只股票目前整体${bullEyeScore >= 60 ? '表现不错，大资金在买入' : bullEyeScore >= 40 ? '处于观望状态，方向不明' : '走势偏弱，大资金在减少'}，普通投资者需谨慎操作，做好风险控制。`,
    analysis_for_intermediate: `技术面来看，${trendStatus}趋势，位于${trendPosition}区域。${capitalStatus === '主力持续流入' ? 'MACD金叉配合量能放大' : '量能有所萎缩'}，筹码结构显示${seed % 3 === 0 ? '浮筹减少，控盘程度较高' : '筹码较为分散，换手较为充分'}。关键支撑位在 ¥${(price * 0.95).toFixed(2)}，阻力位在 ¥${(price * 1.08).toFixed(2)}。`,
    analysis_for_advanced: `量价关系分析：${capitalStatus}，近5日主力净流入${capitalScore > 60 ? '+' : '-'}${Math.abs(seed * 1.2).toFixed(1)}亿元。筹码结构：${seed % 3 === 0 ? '获利盘' : '套牢盘'}比例约 ${30 + seed % 40}%，成本密集区在 ¥${(price * 0.92).toFixed(2)}-¥${(price * 0.98).toFixed(2)}。情绪温度计读数 ${sentimentScore}/100，${sentimentScore > 70 ? '市场情绪偏热，需警惕短期风险' : sentimentScore > 50 ? '情绪适中，趋势相对稳定' : '情绪偏冷，历史上此类位置往往处于阶段性底部区域'}。`,

    key_support:    +(price * 0.95).toFixed(2),
    key_resistance: +(price * 1.08).toFixed(2),

    risk_factors: [
      bullEyeScore < 50 ? '技术面走势偏弱，注意止损纪律' : '高位区域注意控制仓位',
      '市场整体波动风险，注意大盘系统性风险',
      '信息披露风险，请关注公司重大公告',
    ],

    personal_take: `如果是我来看这支股票，我会这样理解：当前${trendStatus}，资金面${capitalStatus}，评分${bullEyeScore}分处于${bullEyeScore >= 60 ? '相对偏多' : bullEyeScore >= 40 ? '中性偏震荡' : '偏空'}区间。${bullEyeScore >= 60 ? '如果大盘配合，可以关注回调至支撑位的机会，但仍须做好风险控制。' : '当前阶段以观察为主，等待信号更明确后再做判断。'}`,

    disclaimer: '以上分析为AI基于历史数据的参考性解读，不构成投资建议，市场有风险，请独立判断。',
  };
}

// ====== Mock Market Overview ======
export function getMockMarketOverview(): MarketOverview {
  return {
    sentiment_score: 62,
    sentiment_label: '偏热',
    advance_count: 2847,
    decline_count: 1523,
    limit_up: 67,
    limit_down: 8,
    main_capital_net: 42.8,
    hot_sectors: [
      { name: '人工智能',   change_pct: 3.47,  capital_net: 18.6, lead_stock: '科大讯飞' },
      { name: '新能源汽车', change_pct: 2.18,  capital_net: 12.4, lead_stock: '比亚迪' },
      { name: '半导体',    change_pct: 1.92,  capital_net: 9.8,  lead_stock: '中芯国际' },
      { name: '医疗器械',  change_pct: -0.65, capital_net: -3.2, lead_stock: '迈瑞医疗' },
    ],
    cold_sectors: [
      { name: '房地产',   change_pct: -2.34, capital_net: -8.5, lead_stock: '万科A' },
      { name: '消费零售', change_pct: -1.87, capital_net: -5.2, lead_stock: '永辉超市' },
      { name: '航空机场', change_pct: -1.42, capital_net: -3.8, lead_stock: '中国国航' },
    ],
  };
}

// ====== Mock Trap Analysis ======
export function generateMockTrapAnalysis(
  costPrice: number,
  currentPrice: number,
  stockName: string
): TrapAnalysis {
  const lossPct = ((currentPrice - costPrice) / costPrice) * 100;
  const isDeep = lossPct < -30;
  const isMedium = lossPct < -15 && lossPct >= -30;

  return {
    trap_assessment: `当前持有${stockName}，买入成本 ¥${costPrice}，当前价格 ¥${currentPrice}，浮亏 ${Math.abs(lossPct).toFixed(1)}%。从历史数据看，A股类似套牢深度的个股，约有${isDeep ? '35%' : isMedium ? '55%' : '70%'}在6个月内回到成本附近。`,
    path_a: {
      title: '路径A：等待修复',
      applicable: true,
      conditions: '股票基本面无重大问题，技术面有企稳迹象',
      analysis: `若该股票基本面未发生根本性变化，当前下跌可能属于市场系统性压力或短期情绪扰动。历史数据显示，在资金面无持续大额净流出的情况下，等待技术面修复是可行方向。关键是观察 ¥${(currentPrice * 0.95).toFixed(2)} 支撑是否稳固。`,
      key_signals_to_watch: [
        `价格能否在 ¥${(currentPrice * 0.97).toFixed(2)} 附近稳住，并出现缩量企稳`,
        '主力资金是否停止净流出，甚至出现回流迹象',
      ],
      reference_exit_zone: `参考减仓区间：¥${(costPrice * 0.92).toFixed(2)}-¥${(costPrice * 0.98).toFixed(2)}（逢反弹分批轻减）`,
      time_estimate: isDeep ? '预计需要3-12个月' : '预计需要1-6个月',
      risk_level: isDeep ? '高' : '中',
    },
    path_b: {
      title: '路径B：逢反弹减仓',
      applicable: true,
      conditions: '技术面继续走弱，或有消息面利空风险',
      analysis: `若该股票技术面持续恶化，资金持续净流出，建议把握反弹窗口分批减仓，控制风险优先。历史数据显示，持续下跌趋势中的反弹往往是出逃窗口而非买入机会。`,
      reference_rebound_zone: `参考关注区间：¥${(currentPrice * 1.03).toFixed(2)}-¥${(currentPrice * 1.08).toFixed(2)}（反弹幅度约3-8%）`,
      risk_if_not_executed: '若趋势继续恶化，套牢深度可能进一步加深，心理压力加大，容易在底部割肉',
      risk_level: '中',
    },
    path_c: {
      title: '路径C：观察等待',
      applicable: true,
      conditions: '趋势不明朗，资金无明显方向',
      analysis: '当前信号不够明确，不急于操作是一种选择。设置好关键价格观察点，等待市场给出更清晰的方向信号，再做决策。时间成本是持有等待的主要代价。',
      key_price_levels: {
        must_hold: +(currentPrice * 0.93).toFixed(2),
        break_above: +(currentPrice * 1.07).toFixed(2),
      },
      waiting_cost: `若持有${isDeep ? '12' : '6'}个月等待解套，时间成本约为本金的${isDeep ? '10-15%' : '5-8%'}（机会成本）`,
      risk_level: '低',
    },
    recommended_path: lossPct < -30 ? 'B' : lossPct < -15 ? 'C' : 'A',
    recommendation_reason: `基于当前套牢幅度和技术面状态，${lossPct < -30 ? '建议优先考虑逢反弹减仓，控制风险，避免损失进一步扩大' : lossPct < -15 ? '建议先观察等待，设置关键价格位，等信号明确后再操作' : '技术面有修复迹象，可以耐心等待，同时严格设置下行止损点'}。`,
    psychological_note: '被套是所有投资者都会经历的事，关键是保持理性判断，不被情绪左右。无论市场如何波动，做好风险控制，保留资金是最重要的。',
    disclaimer: '以上为AI基于数据的参考性分析，不构成投资建议，解套策略需结合个人实际情况判断，市场有风险。',
  };
}

// ====== Mock K-Line Data ======
export function generateMockKLineData(code: string) {
  const seed = parseInt(code.slice(-2)) || 50;
  const basePrice = 50 + seed * 8;
  const data: [string, number, number, number, number, number][] = [];

  let price = basePrice * 0.85;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  for (let i = 0; i < 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dayStr = d.toISOString().slice(0, 10);

    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const change = (Math.random() - 0.45) * 0.04 * price;
    const open  = +price.toFixed(2);
    const close = +(price + change).toFixed(2);
    const high  = +(Math.max(open, close) + Math.random() * 0.01 * price).toFixed(2);
    const low   = +(Math.min(open, close) - Math.random() * 0.01 * price).toFixed(2);
    const volume= Math.round(50000 + Math.random() * 200000);

    data.push([dayStr, open, close, low, high, volume]);
    price = close;
  }

  return data;
}
