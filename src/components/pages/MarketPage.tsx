'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Zap, Activity, ArrowRight } from 'lucide-react';
import { getMockMarketOverview } from '@/lib/mockData';
import type { MarketOverview } from '@/types';
import { fetchIndustryRotation, fetchMarketStocksPage, fetchStockProviderStatus, type IndustryRotationItem, type MarketStockItem, type StockProviderStatus } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAppStore } from '@/store';
import { getAnalysisCacheLoadedAt, getAnalysisWithCache, isAnalysisFresh } from '@/lib/analysisCache';
import CacheStatusNotice from '@/components/CacheStatusNotice';

function SectorFlow({ sectors }: { sectors: MarketOverview['hot_sectors'] }) {
  const max = Math.max(...sectors.map((s) => Math.abs(s.capital_net)));
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-orange-400" />
        <span className="font-semibold text-sm">{t('market.sectorCapitalFlow')}</span>
      </div>
      {sectors.map((s) => {
        const isPositive = s.capital_net >= 0;
        const barWidth = (Math.abs(s.capital_net) / max) * 100;
        return (
          <div key={s.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-dark-100">{s.name}</span>
                <span className={`text-xs font-bold ${isPositive ? 'text-bull' : 'text-bear'}`}>
                  {isPositive ? '+' : ''}{s.change_pct}%
                </span>
              </div>
              <span className={`text-sm font-bold ${isPositive ? 'text-bull' : 'text-bear'}`}>
                {isPositive ? '+' : ''}{s.capital_net}亿
              </span>
            </div>
            <div className="h-2 rounded-full bg-dark-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${barWidth}%`,
                  background: isPositive
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
                }}
              />
            </div>
            <div className="text-xs text-dark-500">领涨：{s.lead_stock}</div>
          </div>
        );
      })}
    </div>
  );
}

function AnomalyRadar() {
  const anomalies = [
    { name: '贵州茅台', code: '600519', type: '主力大单净流入', detail: '+4.2亿', color: '#22c55e' },
    { name: '宁德时代', code: '300750', type: '涨停板', detail: '+10%', color: '#22c55e' },
    { name: '比亚迪',  code: '002594', type: '高换手异动', detail: '换手12.3%', color: '#f59e0b' },
    { name: '万科A',   code: '000002', type: '主力持续净流出', detail: '-2.8亿', color: '#ef4444' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} className="text-orange-400" />
        <span className="font-semibold text-sm">{t('market.anomalyRadar')}</span>
      </div>
      <div className="space-y-3">
        {anomalies.map((a) => (
          <div key={a.code} className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-dark-100">{a.name}</span>
                <span className="text-xs text-dark-400">{a.code}</span>
              </div>
              <div className="text-xs text-dark-400 mt-0.5">{a.type}</div>
            </div>
            <span className="text-sm font-bold" style={{ color: a.color }}>{a.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndustryRotation({ rotations }: { rotations: IndustryRotationItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rotations : rotations.slice(0, 8);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-orange-400" />
          <span className="font-semibold text-sm">{t('market.industryRotation')}</span>
        </div>
        <button className="text-xs text-orange-400 flex items-center gap-1" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('market.collapse') : t('market.viewAll')} <ArrowRight size={12} />
        </button>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-dark-400">
              <th className="text-left py-1.5 px-1">{t('market.industry')}</th>
              <th className="text-right py-1.5 px-1">{t('market.week')}</th>
              <th className="text-right py-1.5 px-1">{t('market.month')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {visible.map((r) => (
              <tr key={r.name}>
                <td className="py-2 px-1">
                  <div className="flex items-center gap-2">
                    {r.trend === 'up' ? (
                      <TrendingUp size={12} className="text-bull" />
                    ) : r.trend === 'down' ? (
                      <TrendingDown size={12} className="text-bear" />
                    ) : (
                      <div className="w-3 h-0.5 bg-neutral rounded" />
                    )}
                    <span className="text-dark-100 text-xs">{r.name}</span>
                    {r.strength && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        r.trend === 'up' ? 'text-bull bg-bull/10' : r.trend === 'down' ? 'text-bear bg-bear/10' : 'text-neutral bg-white/10'
                      }`}>
                        {r.strength}
                      </span>
                    )}
                  </div>
                  {r.lead_stock && (
                    <div className="text-[10px] text-dark-500 mt-0.5">领涨：{r.lead_stock}</div>
                  )}
                </td>
                <td className={`text-right py-2 px-1 text-xs font-bold ${r.week_change >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {r.week_change >= 0 ? '+' : ''}{r.week_change.toFixed(2)}%
                </td>
                <td className={`text-right py-2 px-1 text-xs font-bold ${r.month_change >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {r.month_change >= 0 ? '+' : ''}{r.month_change.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const {
    token,
    setActiveTab,
    setCurrentAnalysis,
    setIsAnalyzing,
    comparePool,
    toggleCompareStock,
    priorityPinnedCodes,
  } = useAppStore();
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [providerStatus, setProviderStatus] = useState<StockProviderStatus | null>(null);
  const [rotation, setRotation] = useState<IndustryRotationItem[]>([]);
  const [marketStocks, setMarketStocks] = useState<MarketStockItem[]>([]);
  const [stockKeyword, setStockKeyword] = useState('');
  const [stockOffset, setStockOffset] = useState(0);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [marketTotal, setMarketTotal] = useState(0);
  const [analysisCacheNotice, setAnalysisCacheNotice] = useState('');
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    setTimeout(() => setOverview(getMockMarketOverview()), 400);
    const loadProviderStatus = async () => {
      try {
        const status = await fetchStockProviderStatus();
        setProviderStatus(status);
      } catch {
        setProviderStatus(null);
      }
    };
    const loadRotation = async () => {
      try {
        const data = await fetchIndustryRotation(8);
        setRotation(data);
      } catch {
        setRotation([
          { name: '人工智能', week_change: 8.2, month_change: 15.4, trend: 'up' },
          { name: '新能源汽车', week_change: 5.1, month_change: 12.1, trend: 'up' },
          { name: '半导体', week_change: 3.8, month_change: 8.6, trend: 'up' },
          { name: '房地产', week_change: -4.2, month_change: -11.3, trend: 'down' },
          { name: '银行', week_change: 0.8, month_change: 2.1, trend: 'neutral' },
        ]);
      }
    };
    const loadMarketStocks = async (keyword = '', offset = 0, append = false) => {
      try {
        setStocksLoading(true);
        const page = await fetchMarketStocksPage(keyword, 30, offset);
        const rows = page.rows;
        setMarketTotal(page.total);
        setMarketStocks((prev) => (append ? [...prev, ...rows] : rows));
      } catch {
        setMarketStocks([]);
        setMarketTotal(0);
      } finally {
        setStocksLoading(false);
      }
    };
    void loadProviderStatus();
    void loadRotation();
    void loadMarketStocks('', 0, false);
  }, []);

  const handleSearchStocks = async () => {
    setStockOffset(0);
    await fetchMarketStocksPage(stockKeyword, 30, 0)
      .then((page) => {
        setMarketStocks(page.rows);
        setMarketTotal(page.total);
      })
      .catch(() => {
        setMarketStocks([]);
        setMarketTotal(0);
      });
  };

  const handleLoadMore = async () => {
    const nextOffset = stockOffset + 30;
    setStockOffset(nextOffset);
    const rows = await fetchMarketStocksPage(stockKeyword, 30, nextOffset)
      .then((page) => {
        setMarketTotal(page.total);
        return page.rows;
      })
      .catch(() => []);
    setMarketStocks((prev) => [...prev, ...rows]);
  };

  const handleAnalyze = async (item: MarketStockItem, force = false) => {
    setActiveTab('stock');
    setIsAnalyzing(true);
    const stock = { code: item.code, name: item.name, market: item.market, industry: item.industry, as_of: item.as_of };
    const wasFresh = !force && isAnalysisFresh(stock);
    try {
      const analysis = await getAnalysisWithCache(stock, token ?? undefined, force);
      setCurrentAnalysis(analysis);
      setAnalysisCacheNotice(wasFresh ? '已使用缓存分析（45秒内）' : '分析数据已刷新');
      setAnalysisUpdatedAt(getAnalysisCacheLoadedAt(stock));
    } catch {
      setCurrentAnalysis(null);
      setAnalysisCacheNotice('');
      setAnalysisUpdatedAt(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sentimentScore = overview?.sentiment_score ?? 0;
  const getLabel = (s: number) =>
    s >= 80 ? '🔥 市场过热，历史上此类阶段短期风险加大'
    : s >= 60 ? '📈 偏热状态，行情尚可但需警惕情绪反转'
    : s >= 40 ? '⚖️ 市场中性，方向较为均衡'
    : s >= 20 ? '📉 市场偏冷，历史上此类阶段底部特征明显'
    : '🧊 极度悲观，历史上罕见，风险与机会并存';

  return (
    <div className="space-y-4 page-enter">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-dark-100">{t('market.title')}</h1>
          <a href="/market/radar" className="btn-ghost text-xs px-3 py-1.5">
            {t('market.radarTitle')}
          </a>
        </div>
        <p className="text-xs text-dark-400 mt-0.5">
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · {t('market.dateHint')}
        </p>
        {providerStatus && (
          <p className="text-[11px] text-dark-500 mt-1">
            {t('market.dataSource')}{providerStatus.mode}
            {providerStatus.fallback_active ? '（fallback）' : ''}
          </p>
        )}
      </div>
      <CacheStatusNotice message={analysisCacheNotice} updatedAt={analysisUpdatedAt} />

      {/* Sentiment */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">{t('market.sentimentMeter')}</span>
          <span className="text-2xl font-black" style={{
            color: sentimentScore >= 60 ? '#ef4444' : sentimentScore >= 40 ? '#f59e0b' : '#22c55e'
          }}>
            {sentimentScore}/100
          </span>
        </div>
        <div
          className="relative h-3 rounded-full overflow-hidden mb-3"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #22c55e 30%, #f59e0b 60%, #f97316 80%, #ef4444)' }}
        >
          <div
            className="absolute top-0 h-3 w-1 bg-white rounded-full shadow-lg transition-all duration-1000"
            style={{ left: `${sentimentScore}%`, boxShadow: '0 0 8px rgba(255,255,255,0.9)' }}
          />
        </div>
        <p className="text-xs text-dark-300 leading-relaxed">{getLabel(sentimentScore)}</p>
      </div>

      {/* Market stats grid */}
      {overview && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '上涨家数', value: overview.advance_count.toLocaleString(), color: '#22c55e' },
            { label: '下跌家数', value: overview.decline_count.toLocaleString(), color: '#ef4444' },
            { label: '涨停家数', value: overview.limit_up.toString(), color: '#22c55e' },
            { label: '跌停家数', value: overview.limit_down.toString(), color: '#ef4444' },
            { label: '主力净流入', value: `+${overview.main_capital_net}亿`, color: '#22c55e' },
            { label: '情绪读数', value: `${overview.sentiment_score}`, color: '#f97316' },
          ].map((s) => (
            <div key={s.label} className="card card-sm text-center">
              <div className="text-xs text-dark-400 mb-1">{s.label}</div>
              <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {overview && <SectorFlow sectors={overview.hot_sectors} />}
      <AnomalyRadar />
      <IndustryRotation rotations={rotation} />

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-dark-100">全市场股票总览</span>
          <span className="text-xs text-dark-500">当前 {marketStocks.length} 条 / 全市场 {marketTotal} 条</span>
        </div>
        <div className="flex gap-2">
          <input
            className="input-dark text-sm flex-1"
            placeholder="输入股票代码或名称"
            value={stockKeyword}
            onChange={(e) => setStockKeyword(e.target.value)}
          />
          <button className="btn-ghost text-sm px-3" onClick={() => void handleSearchStocks()}>
            搜索
          </button>
        </div>
        {stocksLoading && marketStocks.length === 0 ? (
          <div className="text-xs text-dark-500">加载中...</div>
        ) : marketStocks.length === 0 ? (
          <div className="text-xs text-dark-500">暂无结果，请更换关键词</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {marketStocks.map((s) => (
              <div key={`${s.code}-${s.as_of ?? ''}`} className="p-2 rounded-lg bg-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-dark-100">
                      {s.name} ({s.code})
                      {priorityPinnedCodes.includes(s.code) && <span className="tag text-[10px] ml-2">优先队列</span>}
                    </div>
                    <div className="text-dark-500">{s.industry} · {s.market}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-dark-100">¥{s.price}</div>
                    <div className={s.pct_change >= 0 ? 'text-bull' : 'text-bear'}>
                      {s.pct_change >= 0 ? '+' : ''}{s.pct_change}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-dark-500">PE {s.pe} / PB {s.pb}</div>
                  <div className="flex gap-2">
                    <button
                      className="btn-ghost text-[11px] px-2 py-1"
                      onClick={() =>
                        toggleCompareStock({
                          code: s.code,
                          name: s.name,
                          market: s.market,
                          industry: s.industry,
                          as_of: s.as_of,
                        })
                      }
                    >
                      {comparePool.some((item) => item.code === s.code) ? '取消对比' : '加入对比'}
                    </button>
                    <button className="btn-primary text-[11px] px-2 py-1" onClick={() => void handleAnalyze(s)}>
                      去分析
                    </button>
                    <button className="btn-ghost text-[11px] px-2 py-1" onClick={() => void handleAnalyze(s, true)}>
                      刷新
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="btn-ghost w-full text-sm py-2" onClick={() => void handleLoadMore()}>
          加载更多
        </button>
      </div>

      {comparePool.length > 0 && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm text-dark-100">分析对比池（最多3只）</div>
            <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setActiveTab('compare')}>
              进入对比页
            </button>
          </div>
          {marketStocks
            .filter((item) => comparePool.some((c) => c.code === item.code))
            .map((item) => (
              <div key={`cmp-${item.code}`} className="p-2 rounded-lg bg-white/5 text-xs">
                <div className="text-dark-100 font-medium">
                  {item.name} ({item.code})
                  {priorityPinnedCodes.includes(item.code) && <span className="tag text-[10px] ml-2">优先队列</span>}
                </div>
                <div className="text-dark-400 mt-1">
                  价格 ¥{item.price} · 涨跌 {item.pct_change >= 0 ? '+' : ''}{item.pct_change}% · PE {item.pe} · PB {item.pb}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
