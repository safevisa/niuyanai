'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import type { SearchResult, StockAnalysis } from '@/types';
import { getAnalysisWithCache, isAnalysisFresh } from '@/lib/analysisCache';
import CacheStatusNotice from '@/components/CacheStatusNotice';

const WATCHLIST_REFRESH_TTL_MS = 45_000;
const WATCHLIST_REFRESH_COOLDOWN_MS = 15_000;

export default function PriorityWatchlistPage() {
  const {
    token,
    positions,
    comparePool,
    priorityPinnedCodes,
    addPosition,
    togglePriorityPinnedCode,
    toggleCompareStock,
    setCurrentAnalysis,
    setActiveTab,
  } = useAppStore();
  const [rowMap, setRowMap] = useState<Record<string, { analysis: StockAnalysis; loadedAt: number }>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'risk_desc'>('score_desc');
  const [lastRefreshAt, setLastRefreshAt] = useState(0);
  const [notice, setNotice] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  useEffect(() => {
    const load = async (force = false) => {
      if (priorityPinnedCodes.length === 0) {
        setRowMap({});
        return;
      }
      const now = Date.now();
      if (!force && now - lastRefreshAt < WATCHLIST_REFRESH_COOLDOWN_MS) {
        return;
      }

      const targets: SearchResult[] = priorityPinnedCodes.map((code) => {
        const pos = positions.find((p) => p.stock_code === code);
        const cmp = comparePool.find((p) => p.code === code);
        return {
          code,
          name: pos?.stock_name || cmp?.name || `股票${code}`,
          market: cmp?.market || 'SH',
          industry: cmp?.industry || '',
          as_of: cmp?.as_of,
        };
      });
      try {
        setLoading(true);
        const missingOrExpired = targets.filter((t) => {
          const cached = rowMap[t.code];
          if (!cached) return true;
          return now - cached.loadedAt > WATCHLIST_REFRESH_TTL_MS;
        });
        const allFresh = targets.length > 0 && targets.every((t) => isAnalysisFresh(t));
        if (missingOrExpired.length > 0) {
          const results = await Promise.all(
            missingOrExpired.map((t) => getAnalysisWithCache(t, token ?? undefined, force))
          );
          setRowMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              next[r.stock_code] = { analysis: r, loadedAt: Date.now() };
            });
            // 移除已取消置顶的缓存，保持状态干净
            Object.keys(next).forEach((code) => {
              if (!priorityPinnedCodes.includes(code)) delete next[code];
            });
            return next;
          });
        } else {
          // 即使不请求，也清理已取消置顶的数据
          setRowMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((code) => {
              if (!priorityPinnedCodes.includes(code)) delete next[code];
            });
            return next;
          });
        }
        setLastRefreshAt(Date.now());
        setNotice(allFresh ? '观察池数据来自缓存（45秒内）' : '观察池数据已刷新');
      } catch {
        setNotice('刷新失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    void load(refreshNonce > 0);
  }, [priorityPinnedCodes, positions, comparePool, token, refreshNonce]);

  const rows = priorityPinnedCodes
    .map((code) => rowMap[code]?.analysis)
    .filter((item): item is StockAnalysis => Boolean(item));

  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === 'score_desc') return b.bull_eye_score - a.bull_eye_score;
    if (sortBy === 'score_asc') return a.bull_eye_score - b.bull_eye_score;
    // risk_desc: score越低风险越高
    return a.bull_eye_score - b.bull_eye_score;
  });

  const toggleSelected = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addToPortfolioIfMissing = (r: StockAnalysis, sourceTag = '观察池·批量加入') => {
    if (positions.some((p) => p.stock_code === r.stock_code)) return;
    addPosition({
      id: `${Date.now()}-${r.stock_code}`,
      stock_code: r.stock_code,
      stock_name: r.stock_name,
      cost_price: Number(r.market_price || 0),
      shares: 100,
      current_price: Number(r.market_price || 0),
      profit_loss: 0,
      profit_loss_pct: 0,
      trap_level: 'profit',
      origin_tag: sourceTag,
      latest_analysis: r,
    });
  };

  const handleBatchUnpin = () => {
    const count = selectedCodes.length;
    selectedCodes.forEach((code) => {
      if (priorityPinnedCodes.includes(code)) togglePriorityPinnedCode(code);
    });
    setNotice(`已取消置顶 ${count} 支`);
    setSelectedCodes([]);
  };

  const handleBatchCompare = () => {
    const targets = sortedRows.filter((r) => selectedCodes.includes(r.stock_code));
    let added = 0;
    let skipped = 0;
    targets.forEach((r) => {
      const exists = comparePool.some((c) => c.code === r.stock_code);
      if (exists) {
        skipped += 1;
        return;
      }
      toggleCompareStock({
        code: r.stock_code,
        name: r.stock_name,
        market: r.market || 'SH',
        industry: r.industry || '',
        as_of: r.data_as_of,
      });
      added += 1;
    });
    setNotice(`加入对比 ${added} 支，跳过 ${skipped} 支`);
  };

  const handleBatchPortfolio = () => {
    const targets = sortedRows.filter((r) => selectedCodes.includes(r.stock_code));
    let added = 0;
    let skipped = 0;
    targets.forEach((r) => {
      const exists = positions.some((p) => p.stock_code === r.stock_code);
      if (exists) {
        skipped += 1;
        return;
      }
      addToPortfolioIfMissing(r);
      added += 1;
    });
    setNotice(`加入持仓 ${added} 支，跳过 ${skipped} 支`);
    setActiveTab('portfolio');
  };

  const handleRefreshOne = async (r: StockAnalysis) => {
    const target: SearchResult = {
      code: r.stock_code,
      name: r.stock_name,
      market: r.market || 'SH',
      industry: r.industry || '',
      as_of: r.data_as_of,
    };
    try {
      setLoading(true);
      const latest = await getAnalysisWithCache(target, token ?? undefined, true);
      setRowMap((prev) => ({
        ...prev,
        [latest.stock_code]: { analysis: latest, loadedAt: Date.now() },
      }));
      setNotice(`已刷新 ${latest.stock_name}，更新时间 ${formatTime(Date.now())}`);
      setLastRefreshAt(Date.now());
    } catch {
      setNotice(`刷新 ${r.stock_name} 失败，请稍后重试`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="text-lg font-bold text-dark-100">优先观察池</h1>
        <p className="text-xs text-dark-400 mt-0.5">集中跟踪置顶标的与优先动作建议</p>
      </div>

      {priorityPinnedCodes.length === 0 ? (
        <div className="card text-xs text-dark-400">当前没有置顶股票，可在搜索/首页/市场页一键置顶。</div>
      ) : loading ? (
        <div className="card text-xs text-dark-400">加载中...</div>
      ) : (
        <div className="space-y-3">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-dark-100">批量操作</div>
              <div className="text-xs text-dark-500">已选 {selectedCodes.length} 支</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input-dark text-xs py-1.5"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="score_desc">按评分从高到低</option>
                <option value="score_asc">按评分从低到高</option>
                <option value="risk_desc">按风险从高到低</option>
              </select>
              <button className="btn-ghost text-xs px-3 py-1.5" onClick={handleBatchUnpin}>批量取消置顶</button>
              <button className="btn-ghost text-xs px-3 py-1.5" onClick={handleBatchCompare}>批量加入对比</button>
              <button className="btn-primary text-xs px-3 py-1.5" onClick={handleBatchPortfolio}>批量加入持仓</button>
              <button
                className="btn-ghost text-xs px-3 py-1.5"
                onClick={() => {
                  setLastRefreshAt(0);
                  setNotice('');
                  setRefreshNonce((v) => v + 1);
                }}
              >
                刷新
              </button>
            </div>
            <CacheStatusNotice
              message={notice}
              updatedAt={lastRefreshAt > 0 ? lastRefreshAt : null}
              prefix="最近更新于"
              className="py-1 px-0 bg-transparent border-0"
            />
          </div>

          {sortedRows.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(r.stock_code)}
                      onChange={() => toggleSelected(r.stock_code)}
                    />
                    <span className="text-sm font-semibold text-dark-100">{r.stock_name}（{r.stock_code}）</span>
                  </label>
                  <div className="text-xs text-dark-400 mt-1">
                    现价 ¥{r.market_price} · 牛眼评分 {r.bull_eye_score}
                  </div>
                  <div className="text-[11px] text-dark-500 mt-1">{r.personal_take}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-xs px-3 py-1.5"
                    onClick={() => {
                      setCurrentAnalysis(r);
                      setActiveTab('stock');
                    }}
                  >
                    去分析
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() =>
                      toggleCompareStock({
                        code: r.stock_code,
                        name: r.stock_name,
                        market: r.market || 'SH',
                        industry: r.industry || '',
                        as_of: r.data_as_of,
                      })
                    }
                  >
                    加入对比
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => {
                      addToPortfolioIfMissing(r, '观察池·单只加入');
                      setActiveTab('portfolio');
                    }}
                  >
                    加入持仓
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => togglePriorityPinnedCode(r.stock_code)}
                  >
                    取消置顶
                  </button>
                  <button
                    className="btn-ghost text-xs px-3 py-1.5"
                    onClick={() => void handleRefreshOne(r)}
                  >
                    刷新
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
