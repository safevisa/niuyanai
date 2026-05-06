'use client';

import { useEffect, useState } from 'react';
import { Filter, SlidersHorizontal, Search, Star, RotateCcw, Crown, Lock, Layers, GitCompare, Bell, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { bindInviteCode, checkPriceAlerts, confirmPaymentOrder, createPaymentOrder, createPriceAlert, deletePriceAlert, fetchInviteProfile, fetchPaymentOrder, fetchPaymentOrders, fetchPriceAlerts, runBacktest, runBatchPortfolioAnalysis, runPatternMatch, runStockScreener, type BacktestResult, type BatchPortfolioResult, type InviteProfile, type PatternMatchResult, type PriceAlertItem, type ScreenerResultItem } from '@/lib/api';
import { t, tf } from '@/lib/i18n';

function StockScreener() {
  const [filters, setFilters] = useState({
    minScore: '60',
    maxPE: '50',
    minCapital: '净流入',
    industry: '全部',
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResultItem[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await runStockScreener({
        minScore: Number(filters.minScore),
        maxPE: Number(filters.maxPE),
        minCapital: filters.minCapital,
        industry: filters.industry,
        limit: 20,
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={16} className="text-orange-400" />
          <span className="font-semibold text-sm">筛选条件</span>
          <div className="ml-auto tag tag-accent text-xs flex items-center gap-1">
            <Crown size={10} />
            PRO
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">最低评分</label>
            <select
              className="input-dark text-sm"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
            >
              {['60', '70', '75', '80', '85'].map((v) => (
                <option key={v} value={v}>{v}分以上</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">最大PE</label>
            <select
              className="input-dark text-sm"
              value={filters.maxPE}
              onChange={(e) => setFilters({ ...filters, maxPE: e.target.value })}
            >
              {['30', '40', '50', '60', '80', '100'].map((v) => (
                <option key={v} value={v}>PE &lt;{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">资金流向</label>
            <select
              className="input-dark text-sm"
              value={filters.minCapital}
              onChange={(e) => setFilters({ ...filters, minCapital: e.target.value })}
            >
              {['全部', '净流入', '主力净流入'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">行业</label>
            <select
              className="input-dark text-sm"
              value={filters.industry}
              onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            >
              {['全部', '白酒', '新能源', '银行', '医药', '科技'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
          onClick={handleSearch}
          disabled={loading}
        >
          <Search size={14} />
          {loading ? '筛选中...' : '开始筛选'}
        </button>
      </div>

      <div className="card">
        <div className="text-xs text-dark-400 mb-3">筛选结果 · {results.length} 支</div>
        <div className="space-y-3">
          {results.map((s) => (
            <div key={s.code} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/4 transition-colors">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}
              >
                {s.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-dark-100">{s.name}</span>
                  <span className="text-xs text-dark-400">{s.code}</span>
                </div>
                <div className="flex gap-3 text-xs text-dark-400 mt-0.5">
                  <span>PE {s.pe}</span>
                  <span>{s.industry}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-orange-400">{s.score}分</div>
                <div className={`text-xs ${s.pct_change >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {s.capital} {s.pct_change >= 0 ? '+' : ''}{s.pct_change.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {!loading && results.length === 0 && (
            <div className="text-xs text-dark-500 py-3">暂无符合条件结果，请调整筛选条件后重试。</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Watchlist() {
  const watchlist = [
    { code: '600519', name: '贵州茅台', price: '1688.00', change: '+1.2%', note: '关注回调机会' },
    { code: '300750', name: '宁德时代', price: '198.50', change: '+3.1%', note: '等待量能配合' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Star size={16} className="text-orange-400" />
        <span className="font-semibold text-sm">自选股</span>
        <button className="ml-auto btn-ghost py-1 px-3 text-xs">管理</button>
      </div>
      {watchlist.length === 0 ? (
        <div className="text-center py-8 text-dark-400 text-sm">暂无自选股，去分析页添加</div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((s) => (
            <div key={s.code} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}
              >
                {s.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-dark-100">{s.name}</div>
                <div className="text-xs text-dark-500 mt-0.5">{s.note}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-dark-100">¥{s.price}</div>
                <div className={`text-xs font-medium ${s.change.startsWith('+') ? 'text-bull' : 'text-bear'}`}>
                  {s.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BacktestTool() {
  const [stockCode, setStockCode] = useState('600519');
  const [strategy, setStrategy] = useState<'ma_cross' | 'breakout' | 'mean_revert'>('ma_cross');
  const [lookbackDays, setLookbackDays] = useState('120');
  const [initialCapital, setInitialCapital] = useState('100000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const onRun = async () => {
    setLoading(true);
    try {
      const data = await runBacktest({
        stockCode: stockCode.trim(),
        strategy,
        lookbackDays: Number(lookbackDays),
        initialCapital: Number(initialCapital),
      });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold text-sm text-dark-100 mb-3">回测参数</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">股票代码</label>
            <input className="input-dark text-sm" value={stockCode} onChange={(e) => setStockCode(e.target.value)} placeholder="例如 600519" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">策略</label>
            <select className="input-dark text-sm" value={strategy} onChange={(e) => setStrategy(e.target.value as 'ma_cross' | 'breakout' | 'mean_revert')}>
              <option value="ma_cross">均线交叉</option>
              <option value="breakout">突破策略</option>
              <option value="mean_revert">均值回归</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">回测天数</label>
            <select className="input-dark text-sm" value={lookbackDays} onChange={(e) => setLookbackDays(e.target.value)}>
              {['60', '90', '120', '180', '240'].map((v) => <option key={v} value={v}>{v}天</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">初始资金</label>
            <select className="input-dark text-sm" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)}>
              {['50000', '100000', '200000', '500000'].map((v) => <option key={v} value={v}>¥{Number(v).toLocaleString('zh-CN')}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary w-full mt-3 flex items-center justify-center gap-2" onClick={onRun} disabled={loading}>
          <RotateCcw size={14} />
          {loading ? '回测中...' : '开始回测'}
        </button>
      </div>

      {result && (
        <div className="card">
          <div className="font-semibold text-sm text-dark-100 mb-3">回测结果 · {result.stock_name}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="card card-sm"><div className="text-dark-400">总收益</div><div className={`font-bold ${result.total_return_pct >= 0 ? 'text-bull' : 'text-bear'}`}>{result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct.toFixed(2)}%</div></div>
            <div className="card card-sm"><div className="text-dark-400">年化收益</div><div className={`font-bold ${result.annualized_return_pct >= 0 ? 'text-bull' : 'text-bear'}`}>{result.annualized_return_pct >= 0 ? '+' : ''}{result.annualized_return_pct.toFixed(2)}%</div></div>
            <div className="card card-sm"><div className="text-dark-400">胜率</div><div className="font-bold text-dark-100">{result.win_rate_pct.toFixed(2)}%</div></div>
            <div className="card card-sm"><div className="text-dark-400">最大回撤</div><div className="font-bold text-bear">{result.max_drawdown_pct.toFixed(2)}%</div></div>
            <div className="card card-sm"><div className="text-dark-400">Sharpe</div><div className="font-bold text-dark-100">{result.sharpe.toFixed(2)}</div></div>
            <div className="card card-sm"><div className="text-dark-400">交易次数</div><div className="font-bold text-dark-100">{result.trades}</div></div>
          </div>
          <p className="text-[11px] text-dark-500 mt-3">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function BatchPortfolioTool() {
  const { positions } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchPortfolioResult | null>(null);

  const onAnalyze = async () => {
    setLoading(true);
    try {
      const data = await runBatchPortfolioAnalysis(
        positions.map((p) => ({
          stock_code: p.stock_code,
          cost_price: p.cost_price,
          shares: p.shares,
        }))
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold text-sm text-dark-100 mb-2">批量持仓分析</div>
        <p className="text-xs text-dark-400 mb-3">基于当前持仓一键生成风险排序、总仓盈亏和高风险仓位数量。</p>
        <div className="text-xs text-dark-500 mb-3">当前可分析持仓：{positions.length} 支</div>
        <button className="btn-primary w-full" onClick={onAnalyze} disabled={loading || positions.length === 0}>
          {loading ? '分析中...' : '开始批量分析'}
        </button>
        {positions.length === 0 && (
          <p className="text-xs text-dark-500 mt-2">请先在“持仓页”添加持仓后再分析。</p>
        )}
      </div>

      {result && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="card card-sm"><div className="text-dark-400">总成本</div><div className="font-bold text-dark-100">¥{result.summary.total_cost.toLocaleString('zh-CN')}</div></div>
            <div className="card card-sm"><div className="text-dark-400">总市值</div><div className="font-bold text-dark-100">¥{result.summary.total_value.toLocaleString('zh-CN')}</div></div>
            <div className="card card-sm"><div className="text-dark-400">总盈亏</div><div className={`font-bold ${result.summary.total_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{result.summary.total_pnl >= 0 ? '+' : ''}¥{Math.abs(result.summary.total_pnl).toLocaleString('zh-CN')}</div></div>
            <div className="card card-sm"><div className="text-dark-400">高风险仓位</div><div className="font-bold text-bear">{result.summary.high_risk_count}</div></div>
          </div>
          <div className="space-y-2">
            {result.positions.slice(0, 10).map((p) => (
              <div key={p.stock_code} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div>
                  <div className="text-sm text-dark-100">{p.stock_name} <span className="text-xs text-dark-500">{p.stock_code}</span></div>
                  <div className="text-xs text-dark-500">{p.industry} · 风险{p.risk_score}({p.risk_level})</div>
                </div>
                <div className={`text-sm font-bold ${p.pnl_pct >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-dark-500">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function PatternMatchTool() {
  const [stockCode, setStockCode] = useState('600519');
  const [lookbackDays, setLookbackDays] = useState('120');
  const [topK, setTopK] = useState('5');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternMatchResult | null>(null);

  const onMatch = async () => {
    setLoading(true);
    try {
      const data = await runPatternMatch({
        stockCode: stockCode.trim(),
        lookbackDays: Number(lookbackDays),
        topK: Number(topK),
      });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold text-sm text-dark-100 mb-3">历史相似形态匹配</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">股票代码</label>
            <input className="input-dark text-sm" value={stockCode} onChange={(e) => setStockCode(e.target.value)} placeholder="例如 600519" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">回看区间</label>
            <select className="input-dark text-sm" value={lookbackDays} onChange={(e) => setLookbackDays(e.target.value)}>
              {['60', '120', '180', '240'].map((v) => <option key={v} value={v}>{v}天</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">匹配数量</label>
            <select className="input-dark text-sm" value={topK} onChange={(e) => setTopK(e.target.value)}>
              {['3', '5', '8', '10'].map((v) => <option key={v} value={v}>{v}条</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary w-full mt-3" onClick={onMatch} disabled={loading}>
          {loading ? '匹配中...' : '开始形态匹配'}
        </button>
      </div>

      {result && (
        <div className="card space-y-3">
          <div className="text-xs text-dark-400">
            目标：{result.target.stock_name}({result.target.stock_code}) · {result.target.industry}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="card card-sm"><div className="text-dark-400">样本5日均值</div><div className={`font-bold ${result.stats.avg_follow_5d_pct >= 0 ? 'text-bull' : 'text-bear'}`}>{result.stats.avg_follow_5d_pct >= 0 ? '+' : ''}{result.stats.avg_follow_5d_pct.toFixed(2)}%</div></div>
            <div className="card card-sm"><div className="text-dark-400">样本20日均值</div><div className={`font-bold ${result.stats.avg_follow_20d_pct >= 0 ? 'text-bull' : 'text-bear'}`}>{result.stats.avg_follow_20d_pct >= 0 ? '+' : ''}{result.stats.avg_follow_20d_pct.toFixed(2)}%</div></div>
          </div>
          <div className="space-y-2">
            {result.matches.map((m) => (
              <div key={m.stock_code} className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-dark-100">{m.stock_name} <span className="text-xs text-dark-500">{m.stock_code}</span></div>
                  <span className="text-xs text-orange-300">相似度 {m.similarity}%</span>
                </div>
                <div className="text-xs text-dark-500 mt-0.5">{m.pattern}</div>
                <div className="text-xs mt-1">
                  <span className={`${m.follow_5d_pct >= 0 ? 'text-bull' : 'text-bear'}`}>5日 {m.follow_5d_pct >= 0 ? '+' : ''}{m.follow_5d_pct.toFixed(2)}%</span>
                  <span className={`ml-3 ${m.follow_20d_pct >= 0 ? 'text-bull' : 'text-bear'}`}>20日 {m.follow_20d_pct >= 0 ? '+' : ''}{m.follow_20d_pct.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-dark-500">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function AlertTool() {
  const { token } = useAppStore();
  const [stockCode, setStockCode] = useState('600519');
  const [triggerPrice, setTriggerPrice] = useState('1800');
  const [alertType, setAlertType] = useState<'price_above' | 'price_below'>('price_above');
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    if (!token) return;
    const list = await fetchPriceAlerts(token);
    setAlerts(list);
  };

  const onCreate = async () => {
    if (!token) {
      setNotice(t('tools.loginRequired'));
      return;
    }
    setLoading(true);
    try {
      await createPriceAlert(
        {
          stockCode: stockCode.trim(),
          alertType,
          triggerPrice: Number(triggerPrice),
        },
        token
      );
      await refresh();
      setNotice(t('tools.alertCreateSuccess'));
    } catch {
      setNotice(t('tools.alertCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onCheck = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await checkPriceAlerts(token);
      await refresh();
      setNotice(data?.count ? tf('tools.alertCheckHit', { count: data.count }) : t('tools.alertCheckNone'));
    } catch {
      setNotice(t('tools.alertCheckFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    await deletePriceAlert(id, token);
    await refresh();
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold text-sm text-dark-100 mb-3">价格预警</div>
        <div className="grid grid-cols-3 gap-3">
          <input className="input-dark text-sm" value={stockCode} onChange={(e) => setStockCode(e.target.value)} placeholder="股票代码" />
          <select className="input-dark text-sm" value={alertType} onChange={(e) => setAlertType(e.target.value as 'price_above' | 'price_below')}>
            <option value="price_above">高于价格</option>
            <option value="price_below">低于价格</option>
          </select>
          <input className="input-dark text-sm" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} placeholder="触发价" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="btn-primary" onClick={onCreate} disabled={loading}>创建预警</button>
          <button className="btn-ghost" onClick={onCheck} disabled={loading}>检测触发</button>
        </div>
        {notice && <p className="text-xs text-dark-400 mt-2">{notice}</p>}
      </div>

      <div className="card space-y-2">
        <div className="text-xs text-dark-400">我的预警 · {alerts.length} 条</div>
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="text-xs">
              <div className="text-dark-100">{a.stock_code}</div>
              <div className="text-dark-500">{a.alert_type === 'price_above' ? '高于' : '低于'} ¥{a.trigger_price} · {a.is_triggered ? '已触发' : '监控中'}</div>
            </div>
            <button className="text-dark-500 hover:text-bear" onClick={() => void onDelete(a.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {alerts.length === 0 && <div className="text-xs text-dark-500">暂无预警记录</div>}
      </div>
    </div>
  );
}

function InviteTool() {
  const { token } = useAppStore();
  const [profile, setProfile] = useState<InviteProfile | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!token) return;
    const data = await fetchInviteProfile(token);
    setProfile(data);
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onBind = async () => {
    if (!token) {
      setNotice(t('tools.loginRequired'));
      return;
    }
    setLoading(true);
    try {
      await bindInviteCode(codeInput.trim().toUpperCase(), token);
      setNotice(t('tools.inviteBindSuccess'));
      setCodeInput('');
      await load();
    } catch {
      setNotice(t('tools.inviteBindFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!profile?.my_code) return;
    try {
      await navigator.clipboard.writeText(profile.my_code);
      setNotice(t('tools.inviteCopySuccess'));
    } catch {
      setNotice(t('tools.inviteCopyFailed'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="font-semibold text-sm text-dark-100 mb-2">邀请中心</div>
        <div className="text-xs text-dark-400">我的邀请码</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="px-3 py-2 rounded-lg bg-white/5 text-sm font-bold tracking-wider">{profile?.my_code ?? '----'}</div>
          <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => void copyCode()}>复制</button>
        </div>
        <div className="text-xs text-dark-500 mt-2">累计邀请：{profile?.invited_count ?? 0} 人</div>
      </div>
      <div className="card">
        <div className="text-xs text-dark-400 mb-2">绑定邀请码</div>
        <div className="flex gap-2">
          <input className="input-dark text-sm flex-1" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="输入邀请码" />
          <button className="btn-primary text-sm px-4" onClick={() => void onBind()} disabled={loading || !!profile?.has_bound_inviter}>
            {loading ? '绑定中...' : (profile?.has_bound_inviter ? '已绑定' : '绑定')}
          </button>
        </div>
        {notice && <p className="text-xs text-dark-400 mt-2">{notice}</p>}
      </div>
    </div>
  );
}

const tools = [
  { id: 'screener',  label: '选股器',     icon: Filter,          desc: '多因子量化筛选',   pro: true },
  { id: 'alert',     label: '价格预警',   icon: Bell,            desc: '价格触发提醒',     pro: false },
  { id: 'batch',     label: '批量持仓分析', icon: Layers,         desc: '组合风险排序',     pro: true },
  { id: 'pattern',   label: '形态匹配',   icon: GitCompare,      desc: '历史相似形态',     pro: true },
  { id: 'watchlist', label: '自选股管理', icon: Star,            desc: '个人关注池',       pro: false },
  { id: 'backtest',  label: '回测工具',   icon: RotateCcw,       desc: '策略历史验证',     pro: true },
];

export default function ToolsPage() {
  const { user, token, setUser } = useAppStore();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const vipLevel = user?.vip_level ?? 0;

  const canUsePro = vipLevel >= 2;
  const canUseVip = vipLevel >= 1;

  const isToolLocked = (toolId: string) => {
    if (toolId === 'screener' || toolId === 'backtest' || toolId === 'batch' || toolId === 'pattern') return !canUsePro;
    return false;
  };

  const handleUpgrade = async (plan: 'vip' | 'pro') => {
    if (!token || !user) {
      setPaymentNotice(t('tools.loginRequired'));
      return;
    }
    setPaymentLoading(true);
    try {
      const order = await createPaymentOrder(plan, token);
      await confirmPaymentOrder(order.order_no, token);
      let isPaid = false;
      for (let i = 0; i < 6; i += 1) {
        const latest = await fetchPaymentOrder(order.order_no, token);
        if (latest.status === 'paid') {
          isPaid = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (isPaid) {
        await fetchPaymentOrders(token);
        const nextVipLevel: 1 | 2 = plan === 'pro' ? 2 : 1;
        setUser({
          ...user,
          vip_level: nextVipLevel,
        });
      } else {
        throw new Error('Payment status timeout');
      }
      setPaymentNotice(tf('tools.paymentSuccess', { plan: plan.toUpperCase(), order: order.order_no.slice(-8) }));
    } catch {
      setPaymentNotice(t('tools.paymentFailed'));
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="text-lg font-bold text-dark-100">{t('tools.title')}</h1>
        <p className="text-xs text-dark-400 mt-0.5">{t('tools.subtitle')}</p>
      </div>

      {/* Tool tabs */}
      <div className="grid grid-cols-2 gap-3">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          const locked = isToolLocked(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(isActive ? null : t.id)}
              className={`card text-left transition-all ${isActive ? 'border-orange-500/40' : ''}`}
              style={isActive ? { borderColor: 'rgba(249,115,22,0.4)' } : {}}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? '#f97316' : '#64748b' }} />
                </div>
                {t.pro && (
                  <div className="tag tag-accent text-xs flex items-center gap-1">
                    <Crown size={9} />
                    PRO
                  </div>
                )}
              </div>
              <div className="font-medium text-sm text-dark-100">{t.label}</div>
              <div className="text-xs text-dark-400 mt-0.5">
                {t.desc}
                {locked ? ' · 未解锁' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active tool content */}
      {activeTool === 'screener' && (canUsePro ? (
        <StockScreener />
      ) : (
        <div className="card text-center py-10">
          <Lock size={28} className="text-dark-500 mx-auto mb-3" />
          <p className="font-semibold text-dark-200">选股器未解锁</p>
          <p className="text-xs text-dark-400 mt-1 mb-4">升级到 PRO 后可使用多因子筛选</p>
          <button className="btn-primary" onClick={() => void handleUpgrade('pro')} disabled={paymentLoading}>升级PRO · ¥99/月</button>
        </div>
      ))}
      {activeTool === 'watchlist' && <Watchlist />}
      {activeTool === 'alert' && <AlertTool />}
      {activeTool === 'batch' && (
        canUsePro ? (
          <BatchPortfolioTool />
        ) : (
          <div className="card text-center py-10">
            <Lock size={28} className="text-dark-500 mx-auto mb-3" />
            <p className="font-semibold text-dark-200">批量持仓分析</p>
            <p className="text-xs text-dark-400 mt-1 mb-4">该功能为PRO专属，升级后可一键做组合风险扫描</p>
            <button className="btn-primary" onClick={() => void handleUpgrade('pro')} disabled={paymentLoading}>升级PRO · ¥99/月</button>
          </div>
        )
      )}
      {activeTool === 'pattern' && (
        canUsePro ? (
          <PatternMatchTool />
        ) : (
          <div className="card text-center py-10">
            <Lock size={28} className="text-dark-500 mx-auto mb-3" />
            <p className="font-semibold text-dark-200">历史相似形态匹配</p>
            <p className="text-xs text-dark-400 mt-1 mb-4">该功能为PRO专属，升级后可查看历史近似形态样本</p>
            <button className="btn-primary" onClick={() => void handleUpgrade('pro')} disabled={paymentLoading}>升级PRO · ¥99/月</button>
          </div>
        )
      )}
      {activeTool === 'backtest' && (
        canUsePro ? (
          <BacktestTool />
        ) : (
          <div className="card text-center py-10">
            <Lock size={28} className="text-dark-500 mx-auto mb-3" />
            <p className="font-semibold text-dark-200">回测工具</p>
            <p className="text-xs text-dark-400 mt-1 mb-4">该功能为PRO专属，升级后即可使用策略历史回测</p>
            <button className="btn-primary" onClick={() => void handleUpgrade('pro')} disabled={paymentLoading}>升级PRO · ¥99/月</button>
          </div>
        )
      )}
      {/* Membership card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(251,191,36,0.06))',
          border: '1px solid rgba(249,115,22,0.25)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Crown size={20} className="text-orange-400" />
          <div>
            <div className="font-bold text-dark-100">升级VIP / PRO</div>
            <div className="text-xs text-dark-400">
              当前等级：{vipLevel === 2 ? 'PRO' : vipLevel === 1 ? 'VIP' : '免费版'}
              {canUseVip ? ' · 已开通VIP能力' : ''}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-sm py-2" onClick={() => void handleUpgrade('vip')} disabled={paymentLoading}>VIP ¥39/月</button>
          <button className="btn-primary text-sm py-2" onClick={() => void handleUpgrade('pro')} disabled={paymentLoading}>PRO ¥99/月</button>
        </div>
        {paymentNotice && <p className="text-xs text-dark-400 mt-2">{paymentNotice}</p>}
      </div>
    </div>
  );
}
