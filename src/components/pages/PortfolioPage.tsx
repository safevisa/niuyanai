'use client';

import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/store';
import type { Position, TrapLevel, TrapAnalysis } from '@/types';
import { generateMockTrapAnalysis } from '@/lib/mockData';
import { getPositionActionByUrgency, getUrgencyLevelColorClass } from '@/lib/portfolioRules';
import Disclaimer from '@/components/Disclaimer';

function trapLevelInfo(level: TrapLevel) {
  const map = {
    profit:  { label: '盈利中',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   tagClass: 'tag-bull' },
    light:   { label: '轻度套牢',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  tagClass: 'tag-neutral' },
    medium:  { label: '中度套牢',  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  tagClass: 'tag-accent' },
    deep:    { label: '深度套牢',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   tagClass: 'tag-bear' },
    extreme: { label: '极度套牢',  color: '#dc2626', bg: 'rgba(220,38,38,0.15)',  tagClass: 'tag-bear' },
  };
  return map[level];
}

function calcTrapLevel(pct: number): TrapLevel {
  if (pct >= 0)   return 'profit';
  if (pct >= -15) return 'light';
  if (pct >= -30) return 'medium';
  if (pct >= -50) return 'deep';
  return 'extreme';
}

function AddPositionModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (p: Omit<Position, 'id' | 'trap_level' | 'profit_loss' | 'profit_loss_pct'>) => void;
}) {
  const [form, setForm] = useState({
    stock_code: '',
    stock_name: '',
    cost_price: '',
    shares: '',
    current_price: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(form.cost_price);
    const curr = parseFloat(form.current_price);
    const shares = parseInt(form.shares);
    if (!cost || !curr || !shares) return;

    onAdd({
      stock_code: form.stock_code,
      stock_name: form.stock_name || form.stock_code,
      cost_price: cost,
      shares,
      current_price: curr,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-dark-100">添加持仓</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">股票代码</label>
              <input
                className="input-dark"
                placeholder="如 600519"
                value={form.stock_code}
                onChange={(e) => setForm({ ...form, stock_code: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">股票名称</label>
              <input
                className="input-dark"
                placeholder="如 贵州茅台"
                value={form.stock_name}
                onChange={(e) => setForm({ ...form, stock_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">买入价格</label>
              <input
                type="number"
                step="0.01"
                className="input-dark"
                placeholder="¥"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">持有数量</label>
              <input
                type="number"
                className="input-dark"
                placeholder="股"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">当前价格</label>
              <input
                type="number"
                step="0.01"
                className="input-dark"
                placeholder="¥"
                value={form.current_price}
                onChange={(e) => setForm({ ...form, current_price: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">
            确认添加
          </button>
        </form>
      </div>
    </div>
  );
}

function TrapAnalysisModal({ position, onClose }: { position: Position; onClose: () => void }) {
  const [selectedPath, setSelectedPath] = useState<'A' | 'B' | 'C' | null>(null);
  const trap = generateMockTrapAnalysis(position.cost_price, position.current_price, position.stock_name);

  const paths = [
    { id: 'A' as const, data: trap.path_a },
    { id: 'B' as const, data: trap.path_b },
    { id: 'C' as const, data: trap.path_c },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
    >
      <div className="min-h-full flex items-start justify-center pt-4 pb-20 px-4">
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-bold text-dark-100">套牢解套分析</h3>
            <button onClick={onClose} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
          </div>
          <div className="p-4 space-y-4">
            {/* Stock info */}
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">{position.stock_name} ({position.stock_code})</span>
                <span className="text-bear font-bold">{position.profit_loss_pct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs text-dark-400 mt-1">
                <span>成本 ¥{position.cost_price}</span>
                <span>现价 ¥{position.current_price}</span>
                <span>浮亏 ¥{Math.abs(position.profit_loss).toFixed(0)}</span>
              </div>
            </div>

            <p className="text-sm text-dark-300 leading-relaxed">{trap.trap_assessment}</p>

            {/* Paths */}
            <div className="space-y-3">
              {paths.map(({ id, data }) => (
                <button
                  key={id}
                  onClick={() => setSelectedPath(selectedPath === id ? null : id)}
                  className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                    trap.recommended_path === id ? 'border-orange-500/40' : 'border-white/6'
                  }`}
                  style={{ border: '1px solid' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ background: trap.recommended_path === id ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: trap.recommended_path === id ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)',
                          color: trap.recommended_path === id ? '#f97316' : '#64748b',
                        }}
                      >
                        {id}
                      </div>
                      <span className="font-medium text-sm text-dark-100">{data.title}</span>
                      {trap.recommended_path === id && (
                        <span className="tag tag-accent text-xs">推荐</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${
                          data.risk_level === '低' ? 'text-bull' :
                          data.risk_level === '中' ? 'text-neutral' : 'text-bear'
                        }`}
                      >
                        {data.risk_level}风险
                      </span>
                      <ChevronRight
                        size={14}
                        className={`text-dark-400 transition-transform ${selectedPath === id ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>
                  {selectedPath === id && (
                    <div className="px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-xs text-dark-300 leading-relaxed">{data.analysis}</p>
                      {data.key_signals_to_watch && (
                        <div className="space-y-1">
                          {data.key_signals_to_watch.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                              <span className="text-xs text-dark-400">{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {data.reference_exit_zone && (
                        <div className="text-xs text-dark-400">{data.reference_exit_zone}</div>
                      )}
                      {data.time_estimate && (
                        <div className="text-xs text-dark-400">预计时间：{data.time_estimate}</div>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
              <p className="text-xs text-orange-300/80 leading-relaxed">{trap.psychological_note}</p>
            </div>

            <Disclaimer compact />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { positions, addPosition, removePosition, priorityPinnedCodes, togglePriorityPinnedCode } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [trapPosition, setTrapPosition] = useState<Position | null>(null);

  const handleAdd = (p: Omit<Position, 'id' | 'trap_level' | 'profit_loss' | 'profit_loss_pct'>) => {
    const plPct = ((p.current_price - p.cost_price) / p.cost_price) * 100;
    const pl = (p.current_price - p.cost_price) * p.shares;
    const pos: Position = {
      ...p,
      id: Date.now().toString(),
      profit_loss: +pl.toFixed(2),
      profit_loss_pct: +plPct.toFixed(2),
      trap_level: calcTrapLevel(plPct),
    };
    addPosition(pos);
  };

  const totalValue  = positions.reduce((s, p) => s + p.current_price * p.shares, 0);
  const totalCost   = positions.reduce((s, p) => s + p.cost_price * p.shares, 0);
  const totalPL     = totalValue - totalCost;
  const totalPLPct  = totalCost ? (totalPL / totalCost) * 100 : 0;

  const trappedPositions = positions.filter((p) => ['medium', 'deep', 'extreme'].includes(p.trap_level));
  const profitPositions = positions.filter((p) => p.profit_loss_pct >= 0);
  const heavyLossPositions = positions.filter((p) => p.profit_loss_pct <= -15);
  const concentration = totalValue > 0
    ? Math.max(...positions.map((p) => (p.current_price * p.shares) / totalValue))
    : 0;
  const compareAddedPositions = positions
    .filter((p) => p.origin_tag?.startsWith('对比页'))
    .sort((a, b) => Number(b.id.split('-')[0] || 0) - Number(a.id.split('-')[0] || 0));

  const rebalancePriorityRaw = positions
    .map((p) => {
      const weight = totalValue > 0 ? (p.current_price * p.shares) / totalValue : 0;
      const drawdownRisk = p.profit_loss_pct < 0 ? Math.min(60, Math.abs(p.profit_loss_pct) * 1.5) : 0;
      const concentrationRisk = weight * 100;
      const levelRisk = p.trap_level === 'extreme' ? 30 : p.trap_level === 'deep' ? 20 : p.trap_level === 'medium' ? 12 : 4;
      const urgency = Math.round(drawdownRisk + concentrationRisk + levelRisk);
      return {
        ...p,
        weight,
        urgency,
      };
    })
    .sort((a, b) => b.urgency - a.urgency);

  const rebalancePriority = [
    ...rebalancePriorityRaw
      .filter((p) => priorityPinnedCodes.includes(p.stock_code))
      .sort((a, b) => b.urgency - a.urgency),
    ...rebalancePriorityRaw.filter((p) => !priorityPinnedCodes.includes(p.stock_code)),
  ];

  return (
    <div className="space-y-4 page-enter">
      {/* Summary */}
      {positions.length > 0 && (
        <div
          className="card"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), transparent)' }}
        >
          <div className="text-xs text-dark-400 mb-2">总持仓概览</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-dark-100">
                ¥{totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-dark-400 mt-0.5">市值</div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-black ${totalPL >= 0 ? 'text-bull' : 'text-bear'}`}>
                {totalPL >= 0 ? '+' : ''}¥{Math.abs(totalPL).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </div>
              <div className={`text-sm font-medium ${totalPL >= 0 ? 'text-bull' : 'text-bear'}`}>
                {totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trap alert */}
      {trappedPositions.length > 0 && (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-bear" />
            <span className="text-sm font-semibold text-bear">套牢专区</span>
            <span className="tag tag-bear text-xs">{trappedPositions.length}支</span>
          </div>
          <p className="text-xs text-dark-400 mb-3">以下持仓套牢幅度较大，点击查看AI解套分析</p>
          <div className="space-y-2">
            {trappedPositions.map((p) => {
              const info = trapLevelInfo(p.trap_level);
              return (
                <button
                  key={p.id}
                  onClick={() => setTrapPosition(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/4"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-dark-100">{p.stock_name}</span>
                      <span className={`tag ${info.tagClass} text-xs`}>{info.label}</span>
                    </div>
                    <div className="text-xs text-dark-400 mt-0.5">
                      成本 ¥{p.cost_price} → 现价 ¥{p.current_price}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-bear">{p.profit_loss_pct.toFixed(2)}%</div>
                    <ChevronRight size={14} className="text-dark-500 ml-auto mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="card space-y-3">
          <div className="text-sm font-semibold text-dark-200">客观组合诊断</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="card card-sm">
              <div className="text-dark-400">盈利仓位</div>
              <div className="font-bold text-bull">{profitPositions.length}/{positions.length}</div>
            </div>
            <div className="card card-sm">
              <div className="text-dark-400">深亏仓位</div>
              <div className="font-bold text-bear">{heavyLossPositions.length}</div>
            </div>
            <div className="card card-sm">
              <div className="text-dark-400">最大集中度</div>
              <div className={`font-bold ${concentration > 0.35 ? 'text-bear' : 'text-dark-100'}`}>
                {(concentration * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="space-y-1 text-xs text-dark-300">
            {concentration > 0.35 && <div>• 单一仓位占比偏高，建议分散到 3-6 支标的降低波动风险。</div>}
            {heavyLossPositions.length > 0 && <div>• 深亏仓位建议优先处理：先看成交量与关键支撑，避免无限摊平。</div>}
            {totalPLPct > 15 && <div>• 当前浮盈较高，建议部分止盈并上移防守位保护收益。</div>}
            {totalPLPct < -10 && <div>• 组合进入回撤区间，建议先降杠杆与仓位，再择机优化结构。</div>}
            {concentration <= 0.35 && heavyLossPositions.length === 0 && (
              <div>• 组合结构整体健康，建议持续跟踪行业轮动并定期再平衡。</div>
            )}
          </div>
        </div>
      )}

      {compareAddedPositions.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-dark-200">来自对比页的新增持仓</div>
            <div className="text-xs text-dark-500">{compareAddedPositions.length} 支</div>
          </div>
          <div className="space-y-2">
            {compareAddedPositions.slice(0, 5).map((p) => (
              <div key={`new-${p.id}`} className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-dark-100">
                    {p.stock_name} <span className="text-xs text-dark-500">{p.stock_code}</span>
                  </div>
                  <button
                    className="btn-ghost text-[11px] px-2 py-1"
                    onClick={() => togglePriorityPinnedCode(p.stock_code)}
                  >
                    {priorityPinnedCodes.includes(p.stock_code) ? '取消置顶' : '加入优先队列'}
                  </button>
                </div>
                <div className="text-xs text-dark-400 mt-1">
                  成本 ¥{p.cost_price} · 现价 ¥{p.current_price} · 浮盈亏 {p.profit_loss_pct >= 0 ? '+' : ''}
                  {p.profit_loss_pct.toFixed(2)}%
                </div>
                {p.origin_tag && <div className="text-[11px] text-dark-500 mt-1">{p.origin_tag}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {positions.length > 0 && (
        <div className="card space-y-3">
          <div className="text-sm font-semibold text-dark-200">调仓优先级（建议先处理）</div>
          <div className="space-y-2">
            {rebalancePriority.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-dark-100">
                    #{idx + 1} {p.stock_name} <span className="text-xs text-dark-500">{p.stock_code}</span>
                  </div>
                  <div className={`text-xs font-semibold ${getUrgencyLevelColorClass(p.urgency)}`}>
                    紧急度 {p.urgency}
                  </div>
                </div>
                <div className="text-xs text-dark-400 mt-1">
                  仓位占比 {(p.weight * 100).toFixed(1)}% · 浮盈亏 {p.profit_loss_pct >= 0 ? '+' : ''}{p.profit_loss_pct.toFixed(2)}%
                </div>
                <div className="text-[11px] text-dark-500 mt-1">
                  {getPositionActionByUrgency(p.urgency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All positions */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-dark-200">我的持仓 ({positions.length})</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary py-2 px-4 text-sm"
          id="add-position-btn"
        >
          <Plus size={14} className="mr-1" />
          添加持仓
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(249,115,22,0.08)' }}>
            <TrendingUp size={28} className="text-orange-400" />
          </div>
          <p className="font-semibold text-dark-200">还没有持仓</p>
          <p className="text-xs text-dark-400 mt-1">添加持仓，AI将帮你分析套牢解套路径</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mt-4"
          >
            <Plus size={14} className="mr-1" />
            添加第一支持仓
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => {
            const info = trapLevelInfo(p.trap_level);
            const isProfit = p.profit_loss_pct >= 0;
            return (
              <div key={p.id} className="card glass-hover">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: info.bg, color: info.color }}
                  >
                    {p.stock_name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-dark-100">{p.stock_name}</span>
                      <span className={`tag ${info.tagClass} text-xs`}>{info.label}</span>
                      {p.origin_tag && <span className="tag text-xs">{p.origin_tag}</span>}
                    </div>
                    <div className="text-xs text-dark-400 mt-0.5">{p.stock_code} · {p.shares}股</div>
                    <div className="flex gap-4 mt-2 text-xs text-dark-400">
                      <span>成本 ¥{p.cost_price}</span>
                      <span>现价 ¥{p.current_price}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black text-lg ${isProfit ? 'text-bull' : 'text-bear'}`}>
                      {isProfit ? '+' : ''}{p.profit_loss_pct.toFixed(2)}%
                    </div>
                    <div className={`text-xs ${isProfit ? 'text-bull' : 'text-bear'}`}>
                      {isProfit ? '+' : ''}¥{Math.abs(p.profit_loss).toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {!isProfit && (
                    <button
                      onClick={() => setTrapPosition(p)}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                    >
                      <AlertTriangle size={12} />
                      套牢分析
                    </button>
                  )}
                  <button
                    onClick={() => removePosition(p.id)}
                    className="py-1.5 px-3 text-xs font-medium rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddPositionModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
      {trapPosition && (
        <TrapAnalysisModal position={trapPosition} onClose={() => setTrapPosition(null)} />
      )}
    </div>
  );
}
