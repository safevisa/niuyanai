import { useState, useEffect, useRef } from "react";

const mockData = {
  stock: { code: "600519", name: "贵州茅台", price: 1678.5, change: 12.3, changePct: 0.74 },
  bullEyeScore: 82,
  scores: { trend: 85, capital: 88, chip: 72, sentiment: 65, fundamental: 90 },
  trendStatus: "温和上行",
  trendPosition: "中位",
  capitalStatus: "主力持续流入",
  chipStatus: "筹码适度集中",
  sentiment: "中性",
  keySupport: 1620,
  keyResistance: 1750,
  buyZone: { low: 1635, high: 1665 },
  sellZone: { low: 1730, high: 1760 },
  riskFactors: ["高估值溢价，PE处于历史75%分位", "白酒板块近期有政策观望情绪", "高位震荡，短期波动加大"],
  personalTake: "如果是我来看这支股票，我会这样理解：茅台目前处于上升趋势的中位区间，主力资金持续流入是积极信号。但高位震荡意味着短期波动加剧，若无放量突破1750，不宜追涨。关键支撑1620若有效回踩，可能是更合适的关注位置。",
};

const klineData = [
  { open: 1580, close: 1610, high: 1625, low: 1572, vol: 45000 },
  { open: 1610, close: 1598, high: 1618, low: 1590, vol: 38000 },
  { open: 1598, close: 1635, high: 1642, low: 1595, vol: 62000 },
  { open: 1635, close: 1628, high: 1648, low: 1620, vol: 41000 },
  { open: 1628, close: 1660, high: 1668, low: 1625, vol: 71000 },
  { open: 1660, close: 1645, high: 1672, low: 1638, vol: 55000 },
  { open: 1645, close: 1678, high: 1685, low: 1640, vol: 80000 },
];

const marketData = {
  upCount: 2847,
  downCount: 1623,
  flatCount: 312,
  sentiment: 72,
  hotSectors: [
    { name: "AI算力", flow: "+38.2亿", trend: "up" },
    { name: "新能源车", flow: "+22.1亿", trend: "up" },
    { name: "创新药", flow: "+15.8亿", trend: "up" },
  ],
  coldSectors: [
    { name: "房地产", flow: "-18.5亿", trend: "down" },
    { name: "消费零售", flow: "-9.2亿", trend: "down" },
  ],
};

const portfolioData = [
  { code: "600519", name: "贵州茅台", cost: 1550, current: 1678.5, shares: 10, score: 82, trapped: false },
  { code: "300750", name: "宁德时代", cost: 280, current: 198.3, shares: 100, score: 34, trapped: true },
  { code: "000001", name: "平安银行", cost: 12.8, current: 13.5, shares: 1000, score: 58, trapped: false },
];

// Radar chart component
function RadarChart({ scores }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const labels = [
    { key: "trend", label: "趋势" },
    { key: "capital", label: "资金" },
    { key: "chip", label: "筹码" },
    { key: "sentiment", label: "情绪" },
    { key: "fundamental", label: "基本面" },
  ];

  const angles = labels.map((_, i) => (i * 2 * Math.PI) / labels.length - Math.PI / 2);

  const getPoint = (angle, radius) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = labels.map((l, i) => getPoint(angles[i], (scores[l.key] / 100) * r));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <svg width={size} height={size}>
      {gridLevels.map((level) => {
        const points = angles.map((a) => getPoint(a, r * level));
        const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return <path key={level} d={path} fill="none" stroke="rgba(255,200,0,0.15)" strokeWidth="1" />;
      })}
      {angles.map((a, i) => {
        const end = getPoint(a, r);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,200,0,0.2)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(255,200,0,0.2)" stroke="#FFD700" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#FFD700" />
      ))}
      {labels.map((l, i) => {
        const pos = getPoint(angles[i], r + 16);
        return (
          <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fill="#aaa" fontSize="9">
            {l.label}
          </text>
        );
      })}
    </svg>
  );
}

// Score ring animation
function ScoreRing({ score }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let start = 0;
    const timer = setInterval(() => {
      start += 2;
      if (start >= score) { setDisplayed(score); clearInterval(timer); }
      else setDisplayed(start);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (displayed / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.03s linear" }} />
      </svg>
      <div className="flex flex-col items-center">
        <span style={{ fontSize: 36, fontWeight: 900, color, fontFamily: "'Bebas Neue', cursive", letterSpacing: 2 }}>{displayed}</span>
        <span style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>牛眼评分</span>
      </div>
    </div>
  );
}

// Mini KLine chart
function MiniKLine() {
  const w = 380, h = 140;
  const padL = 10, padR = 60, padT = 16, padB = 16;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const allPrices = klineData.flatMap((d) => [d.high, d.low]);
  const minP = Math.min(...allPrices) - 10;
  const maxP = Math.max(...allPrices) + 10;
  const colW = chartW / klineData.length;
  const toY = (p) => padT + ((maxP - p) / (maxP - minP)) * chartH;
  const toX = (i) => padL + i * colW + colW / 2;

  const buyY = toY(mockData.buyZone.high);
  const sellY = toY(mockData.sellZone.low);

  return (
    <svg width={w} height={h} style={{ width: "100%" }}>
      {/* buy zone */}
      <rect x={padL} y={toY(mockData.buyZone.high)} width={chartW} height={toY(mockData.buyZone.low) - toY(mockData.buyZone.high)}
        fill="rgba(34,197,94,0.12)" />
      {/* sell zone */}
      <rect x={padL} y={toY(mockData.sellZone.high)} width={chartW} height={toY(mockData.sellZone.low) - toY(mockData.sellZone.high)}
        fill="rgba(239,68,68,0.12)" />

      {klineData.map((d, i) => {
        const x = toX(i);
        const isUp = d.close >= d.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const bodyTop = toY(Math.max(d.open, d.close));
        const bodyH = Math.max(1, Math.abs(toY(d.open) - toY(d.close)));
        return (
          <g key={i}>
            <line x1={x} y1={toY(d.high)} x2={x} y2={toY(d.low)} stroke={color} strokeWidth="1.5" />
            <rect x={x - 7} y={bodyTop} width={14} height={bodyH} fill={color} rx="1" />
          </g>
        );
      })}

      {/* Labels */}
      <text x={w - padR + 4} y={buyY + 4} fill="#22c55e" fontSize="9" fontWeight="700">参考买点</text>
      <text x={w - padR + 4} y={sellY + 4} fill="#ef4444" fontSize="9" fontWeight="700">参考卖点</text>
      <text x={w - padR + 4} y={toY(mockData.keySupport) + 4} fill="#3b82f6" fontSize="9">支撑</text>
      <line x1={padL} y1={toY(mockData.keySupport)} x2={padL + chartW} y2={toY(mockData.keySupport)}
        stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
    </svg>
  );
}

// Sentiment thermometer
function SentimentBar({ value }) {
  const color = value > 75 ? "#ef4444" : value > 50 ? "#f59e0b" : value > 25 ? "#22c55e" : "#3b82f6";
  const label = value > 75 ? "市场过热" : value > 50 ? "情绪偏热" : value > 25 ? "情绪正常" : "情绪偏冷";
  return (
    <div>
      <div className="flex justify-between mb-1" style={{ fontSize: 11, color: "#aaa" }}>
        <span>冰点</span><span style={{ color, fontWeight: 700 }}>{label} {value}</span><span>沸点</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: `linear-gradient(90deg, #3b82f6, ${color})`, borderRadius: 8, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

export default function BullEyeApp() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [userLevel, setUserLevel] = useState("beginner");
  const [showTrap, setShowTrap] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const tabs = [
    { id: "home", label: "首页", icon: "◉" },
    { id: "analysis", label: "分析", icon: "📊" },
    { id: "portfolio", label: "持仓", icon: "💼" },
    { id: "market", label: "市场", icon: "🌐" },
  ];

  const getLevelText = (level) => {
    if (level === "beginner") return mockData.personalTake;
    if (level === "intermediate")
      return `技术面：均线多头排列（5>10>20>60），MACD金叉后小幅回踩，布林带上轨附近震荡。量价关系：近7日资金流累计净流入约23亿，主力资金持续布局。筹码结构：低位筹码集中度68%，获利盘约35%，浮动筹码偏少。综合判断：趋势健康，但高位震荡需等待方向选择，关注1678能否有效站稳。`;
    return `量价筹码综合分析：MA多头排列，斜率约18°，趋势强度ADX=28（强趋势阈值）。MACD柱子收窄，DIF与DEA间距压缩，短期可能再次金叉。筹码：成本密集区1580-1650（占比42%），当前价上方套牢盘约35%构成阻力，但均为小仓位分散分布，压力有限。主力5日累计净流入+23.4亿，超大单净流入+18.1亿（占比78%），机构特征明显。参考买点区间1635-1665（基于成交密集区下沿支撑），参考减仓观察区1730-1760（历史套牢密集区）。`;
  };

  return (
    <div style={{
      background: "#0a0a0f",
      minHeight: "100vh",
      maxWidth: 420,
      margin: "0 auto",
      fontFamily: "'Noto Sans SC', sans-serif",
      color: "#f0f0f0",
      position: "relative",
      paddingBottom: 72,
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #111118 0%, #0a0a0f 100%)",
        padding: "20px 20px 0",
        borderBottom: "1px solid rgba(255,215,0,0.1)",
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22, color: "#FFD700" }}>🎯</span>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, color: "#FFD700", fontFamily: "'Bebas Neue', cursive" }}>BULL EYE AI</span>
          </div>
          <div style={{ background: "linear-gradient(135deg, #FFD700, #f59e0b)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#000", fontWeight: 700 }}>
            VIP
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1" style={{ paddingTop: 12 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "8px 4px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: activeTab === t.id ? "rgba(255,215,0,0.15)" : "transparent",
                color: activeTab === t.id ? "#FFD700" : "#666",
                borderBottom: activeTab === t.id ? "2px solid #FFD700" : "2px solid transparent",
                transition: "all 0.2s",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 0 16px" }}>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div style={{ padding: "16px" }}>
            {/* Market sentiment */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 16, border: "1px solid rgba(255,215,0,0.15)" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>今日市场情绪</span>
                <span style={{ fontSize: 11, color: "#666" }}>05/04 收盘</span>
              </div>
              <SentimentBar value={marketData.sentiment} />
              <div className="flex justify-between" style={{ marginTop: 12, fontSize: 12 }}>
                <span style={{ color: "#22c55e" }}>↑ 上涨 {marketData.upCount}</span>
                <span style={{ color: "#888" }}>横盘 {marketData.flatCount}</span>
                <span style={{ color: "#ef4444" }}>↓ 下跌 {marketData.downCount}</span>
              </div>
            </div>

            {/* Quick search */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                <span style={{ color: "#555", fontSize: 14 }}>输入股票代码或名称...</span>
              </div>
            </div>

            {/* Hot sectors */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔥 今日资金热点</div>
              {marketData.hotSectors.map((s, i) => (
                <div key={i} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ background: "#22c55e", borderRadius: 4, width: 4, height: 16 }} />
                    <span style={{ fontSize: 13 }}>{s.name}</span>
                  </div>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>{s.flow}</span>
                </div>
              ))}
              {marketData.coldSectors.map((s, i) => (
                <div key={i} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: i < marketData.coldSectors.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ background: "#ef4444", borderRadius: 4, width: 4, height: 16 }} />
                    <span style={{ fontSize: 13 }}>{s.name}</span>
                  </div>
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>{s.flow}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === "analysis" && (
          <div>
            {/* Stock header */}
            <div style={{ background: "linear-gradient(135deg, #111118, #1a1a28)", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,215,0,0.1)" }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{mockData.stock.name}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{mockData.stock.code} · 沪市主板</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#22c55e", fontFamily: "monospace" }}>¥{mockData.stock.price}</div>
                  <div style={{ fontSize: 12, color: "#22c55e" }}>+{mockData.stock.change} (+{mockData.stock.changePct}%)</div>
                </div>
              </div>
            </div>

            {/* Score + Radar */}
            <div style={{ background: "rgba(255,215,0,0.04)", borderBottom: "1px solid rgba(255,215,0,0.1)", padding: "20px" }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <ScoreRing score={mockData.bullEyeScore} />
                  <div style={{ marginTop: 8, fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1 }}>▲ 多方偏强</div>
                </div>
                <RadarChart scores={mockData.scores} />
              </div>

              {/* Score breakdown */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {[
                  { label: "趋势", val: mockData.scores.trend, color: "#22c55e" },
                  { label: "资金", val: mockData.scores.capital, color: "#3b82f6" },
                  { label: "筹码", val: mockData.scores.chip, color: "#a855f7" },
                  { label: "情绪", val: mockData.scores.sentiment, color: "#f59e0b" },
                  { label: "基本面", val: mockData.scores.fundamental, color: "#06b6d4" },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, minWidth: 56, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* KLine with signals */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>K线 · AI信号标注</span>
                <div className="flex gap-3" style={{ fontSize: 10 }}>
                  <span style={{ color: "#22c55e" }}>■ 参考买区</span>
                  <span style={{ color: "#ef4444" }}>■ 参考卖区</span>
                </div>
              </div>
              <MiniKLine />
              <div className="flex justify-between" style={{ marginTop: 8, fontSize: 11 }}>
                <div style={{ background: "rgba(34,197,94,0.15)", borderRadius: 6, padding: "4px 10px", color: "#22c55e", fontWeight: 700 }}>
                  参考买点 {mockData.buyZone.low}-{mockData.buyZone.high}
                </div>
                <div style={{ background: "rgba(239,68,68,0.15)", borderRadius: 6, padding: "4px 10px", color: "#ef4444", fontWeight: 700 }}>
                  参考卖点 {mockData.sellZone.low}-{mockData.sellZone.high}
                </div>
              </div>
            </div>

            {/* Analysis text - user level selector */}
            <div style={{ padding: "16px 20px" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>AI 分析解读</span>
                <div className="flex gap-1">
                  {[["beginner", "新手"], ["intermediate", "进阶"], ["advanced", "专业"]].map(([k, l]) => (
                    <button key={k} onClick={() => setUserLevel(k)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                        background: userLevel === k ? "#FFD700" : "rgba(255,255,255,0.08)",
                        color: userLevel === k ? "#000" : "#666",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: "rgba(255,215,0,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(255,215,0,0.15)", fontSize: 13, lineHeight: 1.7, color: "#ddd" }}>
                {getLevelText(userLevel)}
              </div>

              {/* Risk factors */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#f59e0b" }}>⚠️ 风险因素</div>
                {mockData.riskFactors.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start" style={{ marginBottom: 6, fontSize: 12, color: "#aaa" }}>
                    <span style={{ color: "#f59e0b", marginTop: 2 }}>•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              {/* Key levels */}
              <div className="flex gap-3 mt-4">
                <div style={{ flex: 1, background: "rgba(59,130,246,0.1)", borderRadius: 10, padding: 12, border: "1px solid rgba(59,130,246,0.3)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#3b82f6", marginBottom: 4 }}>关键支撑</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#3b82f6" }}>{mockData.keySupport}</div>
                </div>
                <div style={{ flex: 1, background: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12, border: "1px solid rgba(239,68,68,0.3)", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 4 }}>关键阻力</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#ef4444" }}>{mockData.keyResistance}</div>
                </div>
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 10, color: "#555", lineHeight: 1.6, borderLeft: "3px solid rgba(255,255,255,0.1)" }}>
                ⚠️ 以上内容由AI基于历史数据生成，为参考性标注，不构成投资建议，买卖决策风险由用户自行承担。市场有风险，投资需谨慎。
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === "portfolio" && (
          <div style={{ padding: 16 }}>
            {/* Summary */}
            <div style={{ background: "linear-gradient(135deg, #1a1a28, #111118)", borderRadius: 16, padding: 16, marginBottom: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>总持仓市值</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#f0f0f0" }}>¥ 58,385.00</div>
              <div className="flex gap-6 mt-2">
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>总浮盈/亏</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>+¥ 6,185</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#666" }}>收益率</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>+11.84%</div>
                </div>
              </div>
            </div>

            {/* Position list */}
            {portfolioData.map((pos) => {
              const pnl = (pos.current - pos.cost) * pos.shares;
              const pnlPct = ((pos.current - pos.cost) / pos.cost) * 100;
              const isUp = pnl >= 0;
              const scoreColor = pos.score >= 70 ? "#22c55e" : pos.score >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <div key={pos.code} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 10, border: pos.trapped ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)" }}
                  onClick={() => { if (pos.trapped) { setSelectedPosition(pos); setShowTrap(true); } }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{pos.name}</span>
                        {pos.trapped && <span style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>套牢</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{pos.code} · 成本 ¥{pos.cost}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: isUp ? "#22c55e" : "#ef4444" }}>
                        {isUp ? "+" : ""}{pnl.toFixed(0)}
                      </div>
                      <div style={{ fontSize: 11, color: isUp ? "#22c55e" : "#ef4444" }}>{pnlPct.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div style={{ fontSize: 12, color: "#888" }}>现价 ¥{pos.current} · {pos.shares}股</div>
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: 10, color: "#666" }}>牛眼</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor }}>{pos.score}</span>
                      {pos.trapped && <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 6 }}>👆点击查看解套分析</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Trap analysis modal */}
            {showTrap && selectedPosition && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
                onClick={() => setShowTrap(false)}>
                <div style={{ background: "#111118", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "80vh", overflowY: "auto", border: "1px solid rgba(239,68,68,0.3)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <div style={{ width: 40, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 16px" }} />
                  <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 4 }}>🔴 套牢解套分析</div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>{selectedPosition.name} · 套牢 {(((selectedPosition.current - selectedPosition.cost) / selectedPosition.cost) * 100).toFixed(1)}%</div>

                  {[
                    { path: "A", title: "路径A：等待趋势修复", color: "#22c55e", risk: "中", desc: "当前牛眼评分34，趋势偏弱但未完全破位。若关键支撑185元守住，可观察是否出现量缩价稳信号。预计需要1-3个月观察期。适合有耐心的投资者。", watch: "关注185元支撑 + 主力资金是否回流" },
                    { path: "B", title: "路径B：逢反弹减仓", color: "#f59e0b", risk: "低", desc: "若股价出现反弹至220-235元区间，可参考分批减仓离场，降低持仓风险。此路径以控制损失为优先，适合风险承受能力较低的投资者。", watch: "等待反弹至220以上，量能是否配合" },
                    { path: "C", title: "路径C：继续观察", color: "#3b82f6", risk: "高", desc: "当前趋势整体偏弱，继续持有的时间成本较高。若大盘持续走强，可能带动个股修复；但若破位185支撑，下方空间较大，风险需注意。", watch: "大盘方向 + 新能源板块整体表现" },
                  ].map((p) => (
                    <div key={p.path} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${p.color}22` }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: p.color }}>{p.title}</span>
                        <span style={{ fontSize: 10, background: `${p.color}22`, color: p.color, padding: "2px 8px", borderRadius: 4 }}>风险：{p.risk}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#ccc", lineHeight: 1.6, margin: "0 0 8px" }}>{p.desc}</p>
                      <div style={{ fontSize: 11, color: "#888" }}>👁 关注：{p.watch}</div>
                    </div>
                  ))}

                  <div style={{ fontSize: 10, color: "#444", lineHeight: 1.6, padding: "10px 0" }}>
                    ⚠️ 以上为AI参考性分析，不构成投资建议，解套决策须结合个人实际情况，风险自担。
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {activeTab === "market" && (
          <div style={{ padding: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 16, border: "1px solid rgba(255,215,0,0.15)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>市场情绪温度计</div>
              <SentimentBar value={marketData.sentiment} />
              <div style={{ marginTop: 12, fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
                今日市场呈<span style={{ color: "#f59e0b", fontWeight: 700 }}>结构性分化</span>格局，科技板块强势，传统板块承压。整体情绪偏热，短期需防范高位调整风险。
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>板块资金流向</div>
            {[...marketData.hotSectors, ...marketData.coldSectors].map((s, i) => {
              const isHot = s.trend === "up";
              const pct = isHot ? Math.random() * 30 + 60 : Math.random() * 30;
              return (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: `1px solid ${isHot ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isHot ? "#22c55e" : "#ef4444" }}>{s.flow}</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct.toFixed(0)}%`, height: "100%", background: isHot ? "#22c55e" : "#ef4444", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "rgba(10,10,15,0.95)", borderTop: "1px solid rgba(255,215,0,0.15)", padding: "8px 0 16px", backdropFilter: "blur(20px)" }}>
        <div className="flex">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "6px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: activeTab === t.id ? "#FFD700" : "#555" }}>{t.label}</span>
              {activeTab === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFD700" }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
