'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Shield, Target, Zap, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import ScoreRing from '@/components/ScoreRing';
import RadarChart from '@/components/RadarChart';
import KLineChart from '@/components/KLineChart';
import Disclaimer from '@/components/Disclaimer';
import SearchBar from '@/components/SearchBar';
import { useAppStore } from '@/store';
import type { StockAnalysis, SearchResult } from '@/types';
import { generateMockKLineData } from '@/lib/mockData';
import { fetchAnalysisHistory, requestStockAnalysis } from '@/lib/api';
import { formatDate, t } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-yellow-500/20 border-t-yellow-500 animate-spin" />
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.1)' }}
        >
          <Target size={20} style={{ color: '#FFD700' }} />
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-dark-100">AI 正在深度分析中...</p>
        <p className="text-xs text-dark-400 mt-1">正在计算五维模型评分</p>
      </div>
      <div className="w-48 space-y-2">
        {['趋势模型', '资金流向', '筹码结构', '市场情绪', '基本面'].map((dim, i) => (
          <div key={dim} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-dark-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 animate-pulse"
                style={{
                  width: `${60 + i * 8}%`,
                  animationDelay: `${i * 0.2}s`,
                  transition: 'width 1s ease',
                }}
              />
            </div>
            <span className="text-xs text-dark-400 w-14 flex-shrink-0">{dim}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreSection({ analysis }: { analysis: StockAnalysis }) {
  const scoreColor = (s: number) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#84cc16';
    if (s >= 40) return '#f59e0b';
    if (s >= 20) return '#f97316';
    return '#ef4444';
  };

  const dimensions = [
    { key: 'trend',       label: '趋势',  score: analysis.scores.trend,       icon: TrendingUp },
    { key: 'capital',     label: '资金',  score: analysis.scores.capital,     icon: Zap },
    { key: 'chip',        label: '筹码',  score: analysis.scores.chip,        icon: Target },
    { key: 'sentiment',   label: '情绪',  score: analysis.scores.sentiment,   icon: AlertCircle },
    { key: 'fundamental', label: '基本面', score: analysis.scores.fundamental, icon: Shield },
  ];

  return (
    <div className="space-y-4">
      {/* Main score */}
      <div
        className="card flex items-center gap-6"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(10,15,30,0))' }}
      >
        <ScoreRing score={analysis.bull_eye_score} size={110} animated />
        <div className="flex-1">
          <div className="text-xs text-dark-400 mb-1">牛眼综合评分</div>
          <div className="text-sm text-dark-200 font-medium">
            {analysis.trend_status} · {analysis.trend_position}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="dot-bull" />
              <span className="text-xs text-dark-300">{analysis.capital_status}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <span className="text-xs text-dark-300">{analysis.chip_status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="card space-y-3">
        <div className="text-sm font-semibold text-dark-200 mb-2">五维评分详情</div>
        {dimensions.map(({ key, label, score, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3">
            <Icon size={14} style={{ color: scoreColor(score) }} className="flex-shrink-0" />
            <div className="w-10 text-xs text-dark-400 flex-shrink-0">{label}</div>
            <div className="flex-1 h-2 rounded-full bg-dark-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${score}%`,
                  background: `linear-gradient(90deg, ${scoreColor(score)}, ${scoreColor(score)}aa)`,
                }}
              />
            </div>
            <div className="w-8 text-xs font-bold text-right" style={{ color: scoreColor(score) }}>
              {score}
            </div>
          </div>
        ))}
      </div>

      {/* Radar */}
      <div className="card flex justify-center">
        <RadarChart scores={analysis.scores} size={260} />
      </div>
    </div>
  );
}

function SignalsSection({ analysis }: { analysis: StockAnalysis }) {
  if (!analysis.buy_signals.length && !analysis.sell_signals.length) {
    return (
      <div className="card text-center py-6">
        <AlertCircle size={24} className="text-dark-400 mx-auto mb-2" />
        <p className="text-sm text-dark-300">当前暂无明确买卖信号，建议观望</p>
        <p className="text-xs text-dark-400 mt-1">牛眼评分 {analysis.bull_eye_score} 分，处于震荡中性区间</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analysis.buy_signals.map((signal, i) => (
        <div
          key={i}
          className="card border-l-4"
          style={{ borderLeftColor: '#22c55e' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-bull" />
              <span className="font-semibold text-sm text-bull">参考买点 {signal.type}</span>
              <span className={`tag ${signal.strength === '强' ? 'tag-bull' : signal.strength === '中' ? 'tag-neutral' : 'tag-bear'} text-xs`}>
                {signal.strength}信号
              </span>
            </div>
            <span className="text-xs text-dark-400">满足 {signal.conditions_met}/5 条件</span>
          </div>
          <p className="text-xs text-dark-300 leading-relaxed">{signal.description}</p>
          <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.06)' }}>
            <span className="text-xs text-dark-400">参考区间 </span>
            <span className="text-sm font-bold text-bull">¥{signal.zone_low} — ¥{signal.zone_high}</span>
            <span className="text-xs text-dark-500 ml-2">（仅供参考，风险自担）</span>
          </div>
        </div>
      ))}

      {analysis.sell_signals.map((signal, i) => (
        <div
          key={i}
          className="card border-l-4"
          style={{ borderLeftColor: '#ef4444' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-bear" />
              <span className="font-semibold text-sm text-bear">参考卖点 {signal.type}</span>
              <span className={`tag ${signal.strength === '强' ? 'tag-bear' : 'tag-neutral'} text-xs`}>
                {signal.strength}信号
              </span>
            </div>
          </div>
          <p className="text-xs text-dark-300 leading-relaxed">{signal.description}</p>
          <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)' }}>
            <span className="text-xs text-dark-400">参考区间 </span>
            <span className="text-sm font-bold text-bear">¥{signal.zone_low} — ¥{signal.zone_high}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisTextSection({ analysis }: { analysis: StockAnalysis }) {
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const tabs = [
    { id: 'beginner' as const,     label: '新手' },
    { id: 'intermediate' as const, label: '进阶' },
    { id: 'advanced' as const,     label: '专业' },
  ];

  const textMap = {
    beginner:     analysis.analysis_for_beginner,
    intermediate: analysis.analysis_for_intermediate,
    advanced:     analysis.analysis_for_advanced,
  };

  return (
    <div className="card space-y-3">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setLevel(t.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              level === t.id
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-dark-200 leading-relaxed">{textMap[level]}</p>
      <div className="divider" />
      <div>
        <div className="text-xs text-dark-400 mb-2 flex items-center gap-1">
          <Target size={12} style={{ color: '#FFD700' }} />
          AI 视角
        </div>
        <p className="text-sm text-dark-300 leading-relaxed italic">{analysis.personal_take}</p>
      </div>
    </div>
  );
}

function KeyLevels({ analysis }: { analysis: StockAnalysis }) {
  return (
    <div className="card">
      <div className="text-sm font-semibold text-dark-200 mb-3">关键价格区间</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="text-xs text-dark-400 mb-1">关键支撑</div>
          <div className="text-xl font-black text-bull">¥{analysis.key_support}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="text-xs text-dark-400 mb-1">关键阻力</div>
          <div className="text-xl font-black text-bear">¥{analysis.key_resistance}</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {analysis.risk_factors.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <AlertCircle size={12} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-dark-300">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectiveActionCard({ analysis }: { analysis: StockAnalysis }) {
  const positives = analysis.buy_signals.length;
  const negatives = analysis.sell_signals.length;
  const score = analysis.bull_eye_score;

  let direction: '偏多' | '中性' | '偏空' = '中性';
  let suggestion = '当前信号分歧较大，建议观察量价配合后再行动。';
  let risk = '中';

  if (score >= 75 && positives >= negatives) {
    direction = '偏多';
    suggestion = '可考虑分批介入，优先等待回踩关键支撑后的确认。';
    risk = '中';
  } else if (score <= 45 || negatives > positives) {
    direction = '偏空';
    suggestion = '建议控制仓位，若跌破关键支撑应优先防守。';
    risk = '高';
  }

  return (
    <div className="card space-y-2">
      <div className="text-sm font-semibold text-dark-200">客观行动建议</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="card card-sm">
          <div className="text-dark-400">方向判断</div>
          <div className={`font-bold ${direction === '偏多' ? 'text-bull' : direction === '偏空' ? 'text-bear' : 'text-orange-300'}`}>{direction}</div>
        </div>
        <div className="card card-sm">
          <div className="text-dark-400">买入信号</div>
          <div className="font-bold text-bull">{positives}</div>
        </div>
        <div className="card card-sm">
          <div className="text-dark-400">风险等级</div>
          <div className={`font-bold ${risk === '高' ? 'text-bear' : 'text-orange-300'}`}>{risk}</div>
        </div>
      </div>
      <div className="text-xs text-dark-300 leading-relaxed">{suggestion}</div>
      <div className="text-[11px] text-dark-500">
        建议基于牛眼评分、买卖信号数量与关键支撑/阻力自动生成，仅作辅助判断。
      </div>
    </div>
  );
}

function PositionSuggestionCard({ analysis }: { analysis: StockAnalysis }) {
  const score = analysis.bull_eye_score;
  const buySignals = analysis.buy_signals.length;
  const sellSignals = analysis.sell_signals.length;

  const cautious = score >= 70 && buySignals >= sellSignals ? '20%-30%' : score >= 55 ? '10%-20%' : '0%-10%';
  const balanced = score >= 70 && buySignals >= sellSignals ? '35%-50%' : score >= 55 ? '20%-35%' : '10%-20%';
  const aggressive = score >= 75 && buySignals > sellSignals ? '50%-70%' : score >= 60 ? '30%-45%' : '10%-25%';

  const note =
    score >= 75
      ? t('stock.positionSuggestionRiskLow')
      : score >= 55
      ? t('stock.positionSuggestionRiskMedium')
      : t('stock.positionSuggestionRiskHigh');

  return (
    <div className="card space-y-3">
      <div className="text-sm font-semibold text-dark-200">{t('stock.positionSuggestionTitle')}</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="card card-sm">
          <div className="text-dark-400">{t('stock.cautiousType')}</div>
          <div className="font-bold text-dark-100 mt-1">{cautious}</div>
        </div>
        <div className="card card-sm">
          <div className="text-dark-400">{t('stock.balancedType')}</div>
          <div className="font-bold text-orange-300 mt-1">{balanced}</div>
        </div>
        <div className="card card-sm">
          <div className="text-dark-400">{t('stock.aggressiveType')}</div>
          <div className="font-bold text-bull mt-1">{aggressive}</div>
        </div>
      </div>
      <div className="text-xs text-dark-300 leading-relaxed">{note}</div>
      <div className="text-[11px] text-dark-500">{t('stock.positionSuggestionDisclaimer')}</div>
    </div>
  );
}

function StopTakeSuggestionCard({ analysis }: { analysis: StockAnalysis }) {
  const price = analysis.market_price;
  const support = analysis.key_support;
  const resistance = analysis.key_resistance;
  const fallbackStop = Number((price * 0.94).toFixed(2));
  const fallbackTake = Number((price * 1.1).toFixed(2));

  const stopLoss = support > 0 ? Number((support * 0.99).toFixed(2)) : fallbackStop;
  const takeProfit = resistance > 0 ? Number((resistance * 0.98).toFixed(2)) : fallbackTake;

  return (
    <div className="card space-y-3">
      <div className="text-sm font-semibold text-dark-200">{t('stock.stopTakeTitle')}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="card card-sm">
          <div className="text-dark-400">{t('stock.stopLossLabel')}</div>
          <div className="font-bold text-bear mt-1">¥{stopLoss}</div>
          <div className="text-[11px] text-dark-500 mt-1">{t('stock.stopLossHint')}</div>
        </div>
        <div className="card card-sm">
          <div className="text-dark-400">{t('stock.takeProfitLabel')}</div>
          <div className="font-bold text-bull mt-1">¥{takeProfit}</div>
          <div className="text-[11px] text-dark-500 mt-1">{t('stock.takeProfitHint')}</div>
        </div>
      </div>
      <div className="text-[11px] text-dark-500">{t('stock.stopTakeNote').replace('{price}', String(price)).replace('{support}', String(support)).replace('{resistance}', String(resistance))}</div>
    </div>
  );
}

export default function StockAnalysisPage() {
  const { user, token, currentAnalysis, isAnalyzing, setCurrentAnalysis, setIsAnalyzing } = useAppStore();
  const [showKLine, setShowKLine] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [historyPageSize] = useState(10);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      stock_code: string;
      stock_name: string;
      bull_eye_score: number;
      analysis_date: string | null;
      data_as_of?: string | null;
      market?: string;
      industry?: string;
    }>
  >([]);
  const [notice, setNotice] = useState<string | null>(null);
  const remaining = Math.max(0, (user?.daily_quota ?? 3) - (user?.daily_used ?? 0));
  const klineData = currentAnalysis
    ? generateMockKLineData(currentAnalysis.stock_code)
    : [];

  const loadHistory = async (reset: boolean) => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const nextOffset = reset ? 0 : historyOffset;
      const rows = await fetchAnalysisHistory(token, historyPageSize, nextOffset);
      const mapped = rows.map((r) => ({
        id: r.id,
        stock_code: r.stock_code,
        stock_name: r.stock_name,
        bull_eye_score: r.bull_eye_score,
        analysis_date: r.analysis_date,
        data_as_of: r.data_as_of,
        market: r.market,
        industry: r.industry,
      }));
      setHistory((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHistoryOffset(nextOffset + mapped.length);
      setHistoryHasMore(mapped.length === historyPageSize);
    } catch {
      if (reset) setHistory([]);
      setNotice(t('stock.historyLoadFailed'));
      setHistoryHasMore(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setHistoryOffset(0);
    void loadHistory(true);
  }, [token]);

  const handleSelect = async (stock: SearchResult) => {
    trackEvent('stock_analysis_select', { code: stock.code });
    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const analysis = await requestStockAnalysis(stock, token ?? undefined);
      setCurrentAnalysis(analysis);
      setNotice(null);
      if (token) {
        setHistoryOffset(0);
        await loadHistory(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.startsWith('QUOTA_EXCEEDED:')) {
        setCurrentAnalysis(null);
        setNotice(t('stock.quotaExceeded'));
      } else {
        setCurrentAnalysis(null);
        setNotice(t('stock.analysisRequestFailed'));
      }
      trackEvent('stock_analysis_request_failed');
    }
    setIsAnalyzing(false);
  };

  const exportShareCard = async () => {
    if (!currentAnalysis) return;
    const node = document.getElementById('analysis-full-share');
    if (!node) return;
    setShareLoading(true);
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `bulleye-share-${currentAnalysis.stock_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      trackEvent('stock_export_full_image_success', { code: currentAnalysis.stock_code });
    } catch {
      setNotice(t('stock.shareCardFailed'));
      trackEvent('stock_export_full_image_failed', { code: currentAnalysis.stock_code });
    } finally {
      setShareLoading(false);
    }
  };

  const shareToSocial = async () => {
    if (!currentAnalysis) return;
    const node = document.getElementById('analysis-full-share');
    if (!node) return;
    setShareLoading(true);
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('blob failed');
      const file = new File([blob], `bulleye-${currentAnalysis.stock_code}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${currentAnalysis.stock_name} 分析报告`,
          text: '牛眼AI个股分析分享',
          files: [file],
        });
        trackEvent('stock_system_share_success', { code: currentAnalysis.stock_code });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bulleye-share-${currentAnalysis.stock_code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setNotice('当前环境不支持直接系统分享，已为你下载图片。');
        trackEvent('stock_system_share_fallback_download', { code: currentAnalysis.stock_code });
      }
    } catch {
      setNotice(t('stock.shareCardFailed'));
      trackEvent('stock_system_share_failed', { code: currentAnalysis.stock_code });
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="space-y-4 page-enter">
      {/* Search */}
      <SearchBar onSelect={handleSelect} placeholder={t('stock.searchPlaceholder')} />

      {isAnalyzing && <LoadingState />}

      {notice && (
        <div
          className="card py-2 px-3 text-xs text-orange-300"
          style={{ border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.08)' }}
        >
          {notice}
        </div>
      )}

      <div className="card py-2.5 px-3 flex items-center justify-between">
        <span className="text-xs text-dark-400">{t('stock.quotaRemaining')}</span>
        <span className={`text-sm font-bold ${remaining > 0 ? 'text-orange-300' : 'text-bear'}`}>
          {remaining}
        </span>
      </div>

      <div className="card">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-dark-200">{t('stock.historyTitle')}</span>
          {showHistory ? <ChevronUp size={16} className="text-dark-400" /> : <ChevronDown size={16} className="text-dark-400" />}
        </button>
        {showHistory && (
          <div className="mt-3 space-y-2">
            {history.length === 0 && !historyLoading && (
              <div className="text-xs text-dark-500 text-center py-3">{t('stock.historyEmpty')}</div>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect({
                  code: item.stock_code,
                  name: item.stock_name,
                  market: item.market ?? '',
                  industry: item.industry ?? '',
                })}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/4 transition-colors text-left"
              >
                <div>
                  <div className="text-sm text-dark-100">{item.stock_name}</div>
                  <div className="text-xs text-dark-400">
                    {item.stock_code}
                    {item.market ? ` · ${item.market}` : ''}
                    {item.industry ? ` · ${item.industry}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-orange-400">
                    {item.bull_eye_score}
                    {t('stock.scoreSuffix')}
                  </div>
                  <div className="text-xs text-dark-500">{formatDate(item.analysis_date)}</div>
                </div>
              </button>
            ))}
            {historyHasMore && (
              <button
                onClick={() => void loadHistory(false)}
                disabled={historyLoading}
                className="w-full py-2 text-xs rounded-lg bg-dark-800 text-dark-300 hover:text-dark-100 transition-colors disabled:opacity-60"
              >
                {historyLoading ? t('stock.loading') : t('stock.loadMore')}
              </button>
            )}
          </div>
        )}
      </div>

      {!isAnalyzing && !currentAnalysis && (
        <div className="space-y-4">
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(249,115,22,0.1)' }}
            >
              <Target size={28} className="text-orange-400" />
            </div>
            <p className="font-semibold text-dark-200">{t('stock.emptyTitle')}</p>
            <p className="text-xs text-dark-400 mt-1">{t('stock.emptyDescription')}</p>
          </div>

          {history.length > 0 && (
            <div className="card">
              <div className="text-sm font-semibold text-dark-200 mb-3">{t('stock.recentAnalyses')}</div>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect({
                      code: item.stock_code,
                      name: item.stock_name,
                      market: item.market ?? '',
                      industry: item.industry ?? '',
                    })}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/4 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm text-dark-100">{item.stock_name}</div>
                      <div className="text-xs text-dark-400">
                        {item.stock_code}
                        {item.market ? ` · ${item.market}` : ''}
                        {item.industry ? ` · ${item.industry}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-orange-400">
                        {item.bull_eye_score}
                        {t('stock.scoreSuffix')}
                      </div>
                      <div className="text-xs text-dark-500">
                        {formatDate(item.analysis_date)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isAnalyzing && currentAnalysis && (
        <div className="space-y-4" id="analysis-full-share">
          {/* Stock header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-dark-100">{currentAnalysis.stock_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-dark-400">{currentAnalysis.stock_code}</span>
                {currentAnalysis.market && (
                  <span className="text-xs text-dark-500">{currentAnalysis.market}</span>
                )}
                {currentAnalysis.industry && (
                  <span className="text-xs text-dark-500">{currentAnalysis.industry}</span>
                )}
                <span className="text-sm font-bold text-dark-100">¥{currentAnalysis.market_price}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-dark-400">{currentAnalysis.analysis_date}</div>
              {currentAnalysis.data_as_of && (
                <div className="text-xs text-dark-500 mt-0.5">
                  {t('stock.dataAsOfPrefix')} {formatDate(currentAnalysis.data_as_of)}
                </div>
              )}
              <div className="text-xs text-dark-500 mt-0.5">{t('stock.aiReport')}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void exportShareCard()}
              className="btn-ghost text-sm py-2 px-3"
              disabled={shareLoading}
            >
              {shareLoading ? t('stock.shareCardGenerating') : '导出整页分享图'}
            </button>
            <button
              onClick={() => void shareToSocial()}
              className="btn-primary text-sm py-2 px-3"
              disabled={shareLoading}
            >
              分享到微信/朋友圈
            </button>
          </div>

          <div
            id="analysis-share-card"
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.16), rgba(15,23,42,0.96))',
              border: '1px solid rgba(255,215,0,0.3)',
            }}
          >
            <div className="text-xs text-yellow-300 mb-1">{t('stock.shareCard')}</div>
            <div className="text-lg font-bold text-dark-100">
              {currentAnalysis.stock_name} ({currentAnalysis.stock_code})
            </div>
            <div className="text-sm text-dark-300 mt-1">
              {t('stock.shareScorePrefix')} {currentAnalysis.bull_eye_score} · {currentAnalysis.trend_status}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="p-2 rounded-lg bg-white/10">
                <div className="text-dark-400">{t('stock.priceLabel')}</div>
                <div className="font-bold text-dark-100">¥{currentAnalysis.market_price}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/10">
                <div className="text-dark-400">{t('stock.supportLabel')}</div>
                <div className="font-bold text-bull">¥{currentAnalysis.key_support}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/10">
                <div className="text-dark-400">{t('stock.resistanceLabel')}</div>
                <div className="font-bold text-bear">¥{currentAnalysis.key_resistance}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="p-2 rounded-lg bg-white/10">
                <div className="text-dark-400">建议止损</div>
                <div className="font-bold text-bear">
                  ¥{currentAnalysis.key_support > 0 ? (currentAnalysis.key_support * 0.99).toFixed(2) : (currentAnalysis.market_price * 0.94).toFixed(2)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/10">
                <div className="text-dark-400">建议止盈</div>
                <div className="font-bold text-bull">
                  ¥{currentAnalysis.key_resistance > 0 ? (currentAnalysis.key_resistance * 0.98).toFixed(2) : (currentAnalysis.market_price * 1.1).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-dark-400 mt-3">
              {t('stock.shareCardDisclaimer')}
            </div>
          </div>

          <ScoreSection analysis={currentAnalysis} />
          <ObjectiveActionCard analysis={currentAnalysis} />
          <PositionSuggestionCard analysis={currentAnalysis} />
          <StopTakeSuggestionCard analysis={currentAnalysis} />

          {/* K-Line toggle */}
          <button
            onClick={() => setShowKLine(!showKLine)}
            className="w-full card flex items-center justify-between"
            id="kline-toggle"
          >
            <span className="text-sm font-semibold text-dark-200">{t('stock.kline90d')}</span>
            {showKLine ? <ChevronUp size={16} className="text-dark-400" /> : <ChevronDown size={16} className="text-dark-400" />}
          </button>
          {showKLine && (
            <div className="card">
              <KLineChart
                data={klineData}
                buySignals={currentAnalysis.buy_signals}
                sellSignals={currentAnalysis.sell_signals}
                stockName={currentAnalysis.stock_name}
              />
            </div>
          )}

          <SignalsSection analysis={currentAnalysis} />
          <AnalysisTextSection analysis={currentAnalysis} />
          <KeyLevels analysis={currentAnalysis} />
          <Disclaimer />
        </div>
      )}
    </div>
  );
}
