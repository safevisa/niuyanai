'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle, X } from 'lucide-react';
import BottomNav, { TopBar } from '@/components/Navigation';
import HomePage from '@/components/pages/HomePage';
import StockAnalysisPage from '@/components/pages/StockAnalysisPage';
import PortfolioPage from '@/components/pages/PortfolioPage';
import MarketPage from '@/components/pages/MarketPage';
import ToolsPage from '@/components/pages/ToolsPage';
import ProfilePage from '@/components/pages/ProfilePage';
import ComparePage from '@/components/pages/ComparePage';
import PriorityWatchlistPage from '@/components/pages/PriorityWatchlistPage';
import { useAppStore } from '@/store';

function RiskModal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div
          className="p-5 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.12), transparent)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FFA000)' }}
          >
            <Target size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-black gradient-text">欢迎使用牛眼AI</h2>
          <p className="text-xs text-dark-400 mt-1">请先阅读并同意风险知情书</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div
            className="p-4 rounded-2xl text-xs leading-relaxed space-y-2 max-h-48 overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}
          >
            <p className="font-semibold text-dark-200">《风险知情书》</p>
            <p>1. <strong className="text-dark-200">牛眼AI</strong>提供的所有分析内容均基于历史市场数据，仅为参考性信息解读，<strong className="text-red-400">不构成任何投资建议或买卖指令</strong>。</p>
            <p>2. 证券投资存在市场风险，历史表现不代表未来收益，<strong className="text-red-400">投资者须独立承担所有投资决策及相关损失</strong>。</p>
            <p>3. 本产品中所有"买点"、"卖点"、"参考区间"等表述，均为历史技术分析的参考性标注，并非对未来走势的预测或承诺。</p>
            <p>4. 请在充分了解自身风险承受能力的前提下，谨慎使用本产品信息。</p>
            <p>5. 本产品不具有证券投资咨询资质，使用前请确认您已年满18周岁且具有完全民事行为能力。</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setChecked(!checked)}
              className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                checked ? 'bg-orange-500' : 'bg-dark-800 border border-dark-600'
              }`}
            >
              {checked && <CheckCircle size={14} className="text-white" />}
            </div>
            <span className="text-xs text-dark-300 leading-relaxed">
              我已阅读并理解以上风险声明，同意自行承担投资风险，不将牛眼AI分析内容作为投资决策的唯一依据
            </span>
          </label>

          <button
            onClick={onAccept}
            disabled={!checked || countdown > 0}
            className={`btn-primary w-full transition-all ${
              !checked || countdown > 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {countdown > 0
              ? `请阅读 (${countdown}s)`
              : checked
              ? '同意并开始使用'
              : '请先勾选同意'}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageMap: Record<string, React.ComponentType> = {
  home:      HomePage,
  stock:     StockAnalysisPage,
  portfolio: PortfolioPage,
  market:    MarketPage,
  tools:     ToolsPage,
  profile:   ProfilePage,
  compare:   ComparePage,
  watchlist: PriorityWatchlistPage,
};

const titleMap: Record<string, string> = {
  home:      '',
  stock:     '个股分析',
  portfolio: '我的持仓',
  market:    '市场总览',
  tools:     '工具箱',
  profile:   '个人中心',
  compare:   '股票对比',
  watchlist: '优先观察池',
};

export default function AppPage() {
  const { activeTab, hasAcceptedRisk, setHasAcceptedRisk } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a0f1e' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FFA000)' }}
          >
            <Target size={28} className="text-white" />
          </div>
          <div className="gradient-text font-black text-2xl">牛眼AI</div>
        </div>
      </div>
    );
  }

  const PageComponent = pageMap[activeTab] ?? HomePage;

  return (
    <>
      {!hasAcceptedRisk && <RiskModal onAccept={() => setHasAcceptedRisk(true)} />}

      <TopBar title={titleMap[activeTab]} />

      <main
        className="pt-14 pb-24 px-4 min-h-screen max-w-lg mx-auto"
        style={{ paddingTop: 'calc(56px + env(safe-area-inset-top))' }}
      >
        <div className="py-4">
          <PageComponent />
        </div>
      </main>

      <BottomNav />
    </>
  );
}
