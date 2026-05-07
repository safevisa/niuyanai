'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Flame, ArrowRight, Zap } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { getMockMarketOverview } from '@/lib/mockData';
import type { MarketOverview, SearchResult } from '@/types';
import { useAppStore } from '@/store';
import { generateDailyReport, type DailyReport } from '@/lib/api';
import { fetchIndustryRotation, fetchMarketStocksPage } from '@/lib/api';
import { t } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { getAnalysisWithCache, isAnalysisFresh } from '@/lib/analysisCache';

function SentimentThermometer({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#f59e0b';
    if (score >= 20) return '#22c55e';
    return '#3b82f6';
  };
  const getLabel = () => {
    if (score >= 80) return '🔥 过热';
    if (score >= 60) return '📈 偏热';
    if (score >= 40) return '⚖️ 中性';
    if (score >= 20) return '📉 偏冷';
    return '🧊 极冷';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-dark-400 mb-1">今日市场情绪</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black" style={{ color: getColor() }}>{score}</span>
            <span className="text-sm font-medium text-dark-300">{getLabel()}</span>
          </div>
        </div>
        <Activity size={28} style={{ color: getColor() }} />
      </div>

      {/* Gradient bar */}
      <div
        className="relative h-3 rounded-full overflow-hidden mb-1"
        style={{ background: 'linear-gradient(90deg, #3b82f6, #22c55e 30%, #f59e0b 60%, #f97316 80%, #ef4444)' }}
      >
        <div
          className="absolute top-0 h-3 w-0.5 bg-white rounded-full shadow-lg transition-all duration-1000"
          style={{ left: `${score}%`, boxShadow: '0 0 8px rgba(255,255,255,0.8)' }}
        />
      </div>
      <div className="flex justify-between text-xs text-dark-500 mt-1">
        <span>极冷</span>
        <span>中性</span>
        <span>过热</span>
      </div>
    </div>
  );
}

function MarketStats({ overview }: { overview: MarketOverview }) {
  const advanceRatio = Math.round(
    (overview.advance_count / (overview.advance_count + overview.decline_count)) * 100
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card card-sm">
        <div className="text-xs text-dark-400 mb-1">涨跌家数</div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-bull">{overview.advance_count.toLocaleString()}</span>
          <span className="text-dark-500">/</span>
          <span className="text-lg font-bold text-bear">{overview.decline_count.toLocaleString()}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-dark-800">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${advanceRatio}%`,
              background: 'linear-gradient(90deg, #22c55e, #84cc16)',
            }}
          />
        </div>
        <div className="text-xs text-dark-400 mt-1">上涨 {advanceRatio}%</div>
      </div>

      <div className="card card-sm">
        <div className="text-xs text-dark-400 mb-1">涨跌停</div>
        <div className="flex items-center gap-3 mt-1">
          <div>
            <div className="text-xs text-dark-500">涨停</div>
            <div className="text-xl font-bold text-bull">{overview.limit_up}</div>
          </div>
          <div className="h-8 w-px bg-dark-700" />
          <div>
            <div className="text-xs text-dark-500">跌停</div>
            <div className="text-xl font-bold text-bear">{overview.limit_down}</div>
          </div>
        </div>
      </div>

      <div className="card card-sm col-span-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-dark-400">今日主力净流入</div>
          <Zap size={14} className="text-orange-400" />
        </div>
        <div
          className="text-2xl font-black mt-1"
          style={{ color: overview.main_capital_net >= 0 ? '#22c55e' : '#ef4444' }}
        >
          {overview.main_capital_net >= 0 ? '+' : ''}{overview.main_capital_net}亿
        </div>
      </div>
    </div>
  );
}

function ColdSectors({ sectors }: { sectors: MarketOverview['cold_sectors'] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color: '#64748b' }}>❄️</span>
          <span className="font-semibold text-sm">冷门板块</span>
        </div>
        <span className="text-xs text-dark-400">资金持续流出</span>
      </div>
      <div className="space-y-3">
        {sectors.map((s, i) => (
          <div key={s.name} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: 'rgba(100,116,139,0.2)',
                color: '#64748b',
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-100">{s.name}</span>
                <span
                  className={`text-sm font-bold ${s.change_pct >= 0 ? 'text-bull' : 'text-bear'}`}
                >
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-dark-500">拖累：{s.lead_stock}</span>
                <span
                  className={`text-xs ${s.capital_net >= 0 ? 'text-bull' : 'text-bear'}`}
                >
                  {s.capital_net}亿
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HotSectors({ sectors }: { overview: MarketOverview; sectors: MarketOverview['hot_sectors'] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-400" />
          <span className="font-semibold text-sm">热点板块</span>
        </div>
        <span className="text-xs text-dark-400">实时资金流向</span>
      </div>
      <div className="space-y-3">
        {sectors.map((s, i) => (
          <div key={s.name} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: i === 0 ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? '#f97316' : '#64748b',
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-100">{s.name}</span>
                <span
                  className={`text-sm font-bold ${s.change_pct >= 0 ? 'text-bull' : 'text-bear'}`}
                >
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-dark-500">领涨：{s.lead_stock}</span>
                <span
                  className={`text-xs ${s.capital_net >= 0 ? 'text-bull' : 'text-bear'}`}
                >
                  {s.capital_net >= 0 ? '+' : ''}{s.capital_net}亿
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [analysisCacheNotice, setAnalysisCacheNotice] = useState<string | null>(null);
  const { user, token, priorityPinnedCodes, togglePriorityPinnedCode, setActiveTab, setCurrentAnalysis, setIsAnalyzing } = useAppStore();
  const remaining = Math.max(0, (user?.daily_quota ?? 3) - (user?.daily_used ?? 0));

  useEffect(() => {
    setMounted(true);
    const loadOverview = async () => {
      try {
        const [market, sectors] = await Promise.all([
          fetchMarketStocksPage('', 200, 0),
          fetchIndustryRotation(8),
        ]);
        const rows = market.rows;
        if (!rows.length) {
          setOverview(getMockMarketOverview());
          return;
        }
        const rise = rows.filter((r) => (r.pct_change ?? 0) >= 0).length;
        const fall = Math.max(0, rows.length - rise);
        const avgPct = rows.reduce((sum, r) => sum + (r.pct_change ?? 0), 0) / rows.length;
        const sentimentScore = Math.max(0, Math.min(100, Math.round(50 + avgPct * 4)));
        const hotSectors = sectors.slice(0, 4).map((s) => ({
          name: s.name,
          change_pct: Number(s.week_change ?? 0),
          capital_net: Number(s.week_change ?? 0),
          lead_stock: s.lead_stock ?? s.name,
        }));
        const coldSectors = [...hotSectors]
          .sort((a, b) => a.change_pct - b.change_pct)
          .slice(0, 3);

        setOverview({
          sentiment_score: sentimentScore,
          sentiment_label: sentimentScore >= 60 ? '偏热' : sentimentScore <= 40 ? '偏冷' : '中性',
          advance_count: rise,
          decline_count: fall,
          limit_up: rows.filter((r) => (r.pct_change ?? 0) >= 9.5).length,
          limit_down: rows.filter((r) => (r.pct_change ?? 0) <= -9.5).length,
          main_capital_net: Number(avgPct.toFixed(2)),
          hot_sectors: hotSectors.length ? hotSectors : getMockMarketOverview().hot_sectors,
          cold_sectors: coldSectors.length ? coldSectors : getMockMarketOverview().cold_sectors,
        });
      } catch {
        setOverview(getMockMarketOverview());
      }
    };
    void loadOverview();
    const timer = window.setInterval(() => void loadOverview(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleStockSelect = async (stock: SearchResult) => {
    trackEvent('home_select_stock', { code: stock.code });
    setActiveTab('stock');
    setIsAnalyzing(true);
    const wasFresh = isAnalysisFresh(stock);

    await new Promise((r) => setTimeout(r, 600));
    try {
      const analysis = await getAnalysisWithCache(stock, token ?? undefined);
      setCurrentAnalysis(analysis);
      setNotice(null);
      setAnalysisCacheNotice(wasFresh ? '已使用缓存分析（45秒内）' : '分析数据已刷新');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.startsWith('QUOTA_EXCEEDED:')) {
        setCurrentAnalysis(null);
        setNotice(t('stock.quotaExceeded'));
      } else {
        const { generateMockAnalysis } = await import('@/lib/mockData');
        const analysis = generateMockAnalysis(stock.code);
        setCurrentAnalysis(analysis);
      }
      setAnalysisCacheNotice(null);
    }
    setIsAnalyzing(false);
  };

  const hotStocks = [
    { code: '600519', name: '贵州茅台', change: '+2.35%', score: 78 },
    { code: '300750', name: '宁德时代', change: '+3.14%', score: 82 },
    { code: '002594', name: '比亚迪',  change: '+1.87%', score: 71 },
    { code: '601012', name: '隆基绿能', change: '-0.92%', score: 45 },
  ];

  const handleGenerateReport = async () => {
    trackEvent('home_generate_daily_report_click');
    if (!token) {
      const fallback: DailyReport = {
        report_date: new Date().toISOString().slice(0, 10),
        user_id: 'guest',
        history_count: 0,
        summary: [
          '当前处于游客模式，已为你生成本地参考日报。',
          '建议登录后生成个性化日报，结合你的历史分析与持仓更准确。',
          '今日热点与量能分化明显，建议优先关注高质量龙头。'
        ],
        top_rotation: {},
        focus_stocks: hotStocks.map((s) => ({
          stock_code: s.code,
          stock_name: s.name,
          score: s.score,
          pct_change: Number(s.change.replace('%', '')),
          industry: '待识别',
        })),
        risk_tips: ['控制仓位，避免追高。', '出现放量滞涨时减仓。'],
        disclaimer: '游客模式日报为本地参考版，不构成投资建议。',
      };
      setDailyReport(fallback);
      setNotice('当前为游客模式，已生成参考日报。');
      trackEvent('home_generate_daily_report_guest');
      return;
    }
    setReportLoading(true);
    try {
      const report = await generateDailyReport(token, '全部');
      setDailyReport(report);
      setNotice(null);
      trackEvent('home_generate_daily_report_success');
    } catch {
      setNotice(t('stock.reportFailed'));
      trackEvent('home_generate_daily_report_failed');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-4 page-enter">
      {/* Hero search */}
      <div
        className="relative rounded-2xl overflow-visible p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(10,15,30,0) 60%)',
          border: '1px solid rgba(255,215,0,0.15)',
        }}
      >
        <div className="mb-1">
          <p className="text-xs text-dark-400">今日 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
          <h2 className="text-lg font-bold text-dark-100 mt-0.5">找一支股票分析</h2>
        </div>
        <div className="mt-3">
          <SearchBar onSelect={handleStockSelect} large />
        </div>

        {/* Quick access chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { name: '贵州茅台', code: '600519' },
            { name: '宁德时代', code: '300750' },
            { name: '比亚迪',  code: '002594' },
            { name: '招商银行', code: '600036' },
          ].map((s) => (
            <button
              key={s.code}
              onClick={() => handleStockSelect({ code: s.code, name: s.name, market: 'SH', industry: '' })}
              className="tag tag-accent text-xs cursor-pointer hover:bg-yellow-500/20 transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      {notice && (
        <div
          className="card py-2 px-3 text-xs text-orange-300"
          style={{ border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.08)' }}
        >
          {notice}
        </div>
      )}
      {analysisCacheNotice && (
        <div className="card py-2 px-3 text-xs text-dark-300">
          {analysisCacheNotice}
        </div>
      )}

      <div className="card py-2.5 px-3 flex items-center justify-between">
        <span className="text-xs text-dark-400">{t('stock.quotaRemaining')}</span>
        <span className={`text-sm font-bold ${remaining > 0 ? 'text-orange-300' : 'text-bear'}`}>
          {remaining}
        </span>
      </div>
      {!token && (
        <div className="card py-2 px-3 text-xs text-dark-300">
          {t('stock.guestHint')}
        </div>
      )}

      {mounted && overview ? (
        <SentimentThermometer score={overview.sentiment_score} />
      ) : (
        <div className="card">
          <div className="skeleton h-20 w-full" />
        </div>
      )}

      {/* Market stats */}
      {mounted && overview ? (
        <MarketStats overview={overview} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="card"><div className="skeleton h-16 w-full" /></div>
          <div className="card"><div className="skeleton h-16 w-full" /></div>
          <div className="card col-span-2"><div className="skeleton h-12 w-full" /></div>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{t('stock.dailyReport')}</span>
          <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => void handleGenerateReport()} disabled={reportLoading}>
            {reportLoading ? t('stock.reportGenerating') : t('stock.generateDailyReport')}
          </button>
        </div>
        {dailyReport ? (
          <div className="space-y-2">
            {dailyReport.summary.map((line, idx) => (
              <div key={idx} className="text-xs text-dark-300 leading-relaxed">{line}</div>
            ))}
            <div className="text-xs text-dark-500">
              {t('stock.reportFocusStocksPrefix')}{dailyReport.focus_stocks.map((s) => `${s.stock_name}(${s.stock_code})`).join('、') || t('stock.reportFocusStocksEmpty')}
            </div>
          </div>
        ) : (
          <div className="text-xs text-dark-500">{t('stock.reportHint')}</div>
        )}
      </div>

      {/* Hot sectors */}
      {mounted && overview && (
        <HotSectors overview={overview} sectors={overview.hot_sectors} />
      )}

      {/* Cold sectors */}
      {mounted && overview && overview.cold_sectors && (
        <ColdSectors sectors={overview.cold_sectors} />
      )}

      {/* Watch list */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" />
            <span className="font-semibold text-sm">{t('stock.hotWatch')}</span>
          </div>
          <button
            className="text-xs text-orange-400 flex items-center gap-1"
            onClick={() => setActiveTab('market')}
          >
            {t('stock.viewMore')} <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {hotStocks.map((s) => (
            <div
              key={s.code}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/4 transition-colors text-left"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}
              >
                {s.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-dark-100">
                  {s.name}
                  {priorityPinnedCodes.includes(s.code) && <span className="tag text-[10px] ml-2">优先队列</span>}
                </div>
                <div className="text-xs text-dark-400">{s.code}</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold ${s.change.startsWith('+') ? 'text-bull' : 'text-bear'}`}
                >
                  {s.change}
                </div>
                <div className="text-xs text-dark-400">{t('stock.scoreLabel')} {s.score}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-primary text-[11px] px-2 py-1"
                  onClick={() => handleStockSelect({ code: s.code, name: s.name, market: 'SH', industry: '' })}
                >
                  分析
                </button>
                <button
                  className="btn-ghost text-[11px] px-2 py-1"
                  onClick={() => togglePriorityPinnedCode(s.code)}
                >
                  {priorityPinnedCodes.includes(s.code) ? '取消置顶' : '置顶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
