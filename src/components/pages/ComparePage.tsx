'use client';

import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAppStore } from '@/store';
import type { StockAnalysis } from '@/types';
import { calcUrgencyByScores, getPositionActionByUrgency, getUrgencyLevelColorClass } from '@/lib/portfolioRules';
import { getAnalysisCacheLoadedAt, getAnalysisWithCache, isAnalysisFresh } from '@/lib/analysisCache';
import CacheStatusNotice from '@/components/CacheStatusNotice';

export default function ComparePage() {
  const {
    comparePool,
    token,
    positions,
    priorityPinnedCodes,
    addPosition,
    setActiveTab,
    setCurrentAnalysis,
    clearComparePool,
  } = useAppStore();
  const [rows, setRows] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [positionForm, setPositionForm] = useState<{
    open: boolean;
    stockCode: string;
    stockName: string;
    shares: string;
    costPrice: string;
  }>({
    open: false,
    stockCode: '',
    stockName: '',
    shares: '100',
    costPrice: '',
  });
  const [cacheNotice, setCacheNotice] = useState('');
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<number | null>(null);

  const ranked = [...rows].sort((a, b) => b.bull_eye_score - a.bull_eye_score);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const avgScore = rows.length > 0
    ? rows.reduce((sum, item) => sum + item.bull_eye_score, 0) / rows.length
    : 0;
  const scoreSpan = rows.length > 1
    ? best.bull_eye_score - worst.bull_eye_score
    : 0;

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const handleConfirmAddToPortfolio = (
    r: StockAnalysis,
    sharesInput: number,
    costPriceInput: number,
    sourceTag?: string
  ) => {
    const exists = positions.some((p) => p.stock_code === r.stock_code);
    if (exists) {
      return;
    }
    const shares = Math.max(1, Math.round(sharesInput));
    const costPrice = Math.max(0.01, Number(costPriceInput || r.market_price || 0));
    const currentPrice = Math.max(0.01, Number(r.market_price || costPrice));
    const urgency = calcUrgencyByScores(r.bull_eye_score);
    const position = {
      id: `${Date.now()}-${r.stock_code}`,
      stock_code: r.stock_code,
      stock_name: r.stock_name,
      cost_price: costPrice,
      shares,
      current_price: currentPrice,
      profit_loss: 0,
      profit_loss_pct: 0,
      trap_level: 'profit' as const,
      origin_tag: sourceTag || `对比页·紧急度${urgency}`,
      latest_analysis: r,
    };
    addPosition(position);
  };

  const openPositionForm = (r: StockAnalysis) => {
    setPositionForm({
      open: true,
      stockCode: r.stock_code,
      stockName: r.stock_name,
      shares: '100',
      costPrice: String(r.market_price || ''),
    });
  };

  const submitPositionForm = () => {
    const r = rows.find((item) => item.stock_code === positionForm.stockCode);
    if (!r) return;
    handleConfirmAddToPortfolio(
      r,
      Number(positionForm.shares),
      Number(positionForm.costPrice),
      `对比页·自定义建仓`
    );
    setPositionForm({
      open: false,
      stockCode: '',
      stockName: '',
      shares: '100',
      costPrice: '',
    });
    setActiveTab('portfolio');
  };

  const handleBatchAdd = () => {
    const targets = rows.filter((r) => selectedCodes.includes(r.stock_code));
    if (targets.length === 0) return;
    targets.forEach((r) => {
      handleConfirmAddToPortfolio(r, 100, Number(r.market_price || 0), '对比页·批量加入');
    });
    setActiveTab('portfolio');
  };

  const toSearchResult = (r: StockAnalysis) => ({
    code: r.stock_code,
    name: r.stock_name,
    market: r.market || 'SH',
    industry: r.industry || '',
    as_of: r.data_as_of,
  });

  const handleRefreshOne = async (row: StockAnalysis) => {
    const stock = toSearchResult(row);
    try {
      setLoading(true);
      const latest = await getAnalysisWithCache(stock, token ?? undefined, true);
      setRows((prev) => prev.map((item) => (item.stock_code === latest.stock_code ? latest : item)));
      const loadedAt = getAnalysisCacheLoadedAt(stock);
      setCacheUpdatedAt(loadedAt ?? Date.now());
      setCacheNotice('对比结果已刷新');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (comparePool.length === 0) {
        setRows([]);
        setCacheUpdatedAt(null);
        return;
      }
      try {
        setLoading(true);
        const allFresh = comparePool.length > 0 && comparePool.every((item) => isAnalysisFresh(item));
        const result = await Promise.all(
          comparePool.map((item) => getAnalysisWithCache(item, token ?? undefined))
        );
        setRows(result);
        setCacheNotice(allFresh ? '对比结果来自缓存（45秒内）' : '对比结果已刷新');
        const latestLoadedAt = comparePool.reduce<number | null>((maxTs, item) => {
          const ts = getAnalysisCacheLoadedAt(item);
          if (!ts) return maxTs;
          if (!maxTs || ts > maxTs) return ts;
          return maxTs;
        }, null);
        setCacheUpdatedAt(latestLoadedAt);
      } catch {
        setRows([]);
        setCacheNotice('');
        setCacheUpdatedAt(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [comparePool, token]);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-dark-100">股票分析对比</h1>
          <p className="text-xs text-dark-400 mt-0.5">最多同时对比 3 只股票</p>
        </div>
        <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => clearComparePool()}>
          清空
        </button>
      </div>
      <CacheStatusNotice message={cacheNotice} updatedAt={cacheUpdatedAt} />

      {comparePool.length === 0 ? (
        <div className="card text-xs text-dark-400">请先在“市场总览”把股票加入对比池。</div>
      ) : loading ? (
        <div className="card text-xs text-dark-400">正在加载对比数据...</div>
      ) : (
        <>
          <div className="card space-y-2">
            <div className="font-semibold text-sm text-dark-100">自动对比结论</div>
            <div className="text-xs text-dark-300">
              当前对比池平均牛眼评分 <span className="text-orange-300 font-semibold">{avgScore.toFixed(1)}</span>，
              {scoreSpan >= 15
                ? '标的分化明显，建议优先处理高分与低分两端。'
                : '标的差异较小，可结合持仓结构和行业偏好选择。'}
            </div>
            {best && (
              <div className="text-xs text-bull">
                优先关注：{best.stock_name}（{best.stock_code}）· 评分 {best.bull_eye_score}
              </div>
            )}
            {rows.length > 1 && worst && (
              <div className="text-xs text-bear">
                风险关注：{worst.stock_name}（{worst.stock_code}）· 评分 {worst.bull_eye_score}
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-dark-500">已选中 {selectedCodes.length} 只</div>
              <button className="btn-ghost text-xs py-1.5 px-3" onClick={handleBatchAdd}>
                批量加入持仓
              </button>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-orange-400" />
              <span className="font-semibold text-sm text-dark-100">核心指标横向对比</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="text-dark-400">
                    <th className="text-left py-2">股票</th>
                    <th className="text-right py-2">价格</th>
                    <th className="text-right py-2">牛眼评分</th>
                    <th className="text-right py-2">趋势</th>
                    <th className="text-right py-2">资金</th>
                    <th className="text-right py-2">筹码</th>
                    <th className="text-right py-2">情绪</th>
                    <th className="text-right py-2">基本面</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">
                        <div className="text-dark-100 font-medium">{r.stock_name}</div>
                        <div className="text-dark-500">{r.stock_code}</div>
                      </td>
                      <td className="text-right py-2 text-dark-100">¥{r.market_price}</td>
                      <td className="text-right py-2 text-orange-300 font-semibold">{r.bull_eye_score}</td>
                      <td className="text-right py-2">{r.scores.trend}</td>
                      <td className="text-right py-2">{r.scores.capital}</td>
                      <td className="text-right py-2">{r.scores.chip}</td>
                      <td className="text-right py-2">{r.scores.sentiment}</td>
                      <td className="text-right py-2">{r.scores.fundamental}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="font-semibold text-sm text-dark-100">评分雷达（简版）</div>
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={`radar-${r.id}`} className="space-y-2">
                  <div className="text-xs text-dark-200">{r.stock_name}（{r.stock_code}）</div>
                  {[
                    { key: '趋势', value: r.scores.trend },
                    { key: '资金', value: r.scores.capital },
                    { key: '筹码', value: r.scores.chip },
                    { key: '情绪', value: r.scores.sentiment },
                    { key: '基本面', value: r.scores.fundamental },
                  ].map((item) => (
                    <div key={`${r.id}-${item.key}`} className="flex items-center gap-2 text-xs">
                      <div className="w-12 text-dark-500">{item.key}</div>
                      <div className="flex-1 h-2 rounded-full bg-dark-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, item.value))}%`,
                            background: 'linear-gradient(90deg, #FFD700, #FFA000)',
                          }}
                        />
                      </div>
                      <div className="w-8 text-right text-dark-200">{item.value}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={`summary-${r.id}`} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(r.stock_code)}
                        onChange={() => toggleSelect(r.stock_code)}
                      />
                      <span className="text-sm font-semibold text-dark-100">{r.stock_name}（{r.stock_code}）</span>
                      {priorityPinnedCodes.includes(r.stock_code) && (
                        <span className="tag text-xs">优先队列</span>
                      )}
                    </label>
                    <div className="text-xs text-dark-400 mt-1">{r.personal_take}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {(() => {
                        const urgency = calcUrgencyByScores(r.bull_eye_score);
                        return (
                          <>
                            <span className={`text-xs font-semibold ${getUrgencyLevelColorClass(urgency)}`}>
                              调整紧急度 {urgency}
                            </span>
                            <span className="text-[11px] text-dark-500">{getPositionActionByUrgency(urgency)}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    className="btn-primary text-xs px-3 py-1.5"
                    onClick={() => {
                      setCurrentAnalysis(r);
                      setActiveTab('stock');
                    }}
                  >
                    查看详情
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => openPositionForm(r)}
                  >
                    加入持仓
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => void handleRefreshOne(r)}
                  >
                    刷新
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {positionForm.open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setPositionForm((s) => ({ ...s, open: false }))}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-6 pb-8"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-sm font-semibold text-dark-100 mb-3">加入持仓 - {positionForm.stockName}</div>
            <div className="space-y-3">
              <input
                className="input-dark"
                value={positionForm.shares}
                onChange={(e) => setPositionForm((s) => ({ ...s, shares: e.target.value }))}
                placeholder="持有股数"
                type="number"
              />
              <input
                className="input-dark"
                value={positionForm.costPrice}
                onChange={(e) => setPositionForm((s) => ({ ...s, costPrice: e.target.value }))}
                placeholder="成本价"
                type="number"
                step="0.01"
              />
              <div className="flex gap-2">
                <button
                  className="btn-ghost flex-1 text-sm py-2"
                  onClick={() => setPositionForm((s) => ({ ...s, open: false }))}
                >
                  取消
                </button>
                <button className="btn-primary flex-1 text-sm py-2" onClick={submitPositionForm}>
                  确认加入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
