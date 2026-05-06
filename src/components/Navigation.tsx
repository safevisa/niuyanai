'use client';

import { Target, Home, BarChart2, Briefcase, TrendingUp, Wrench, User } from 'lucide-react';
import { useAppStore } from '@/store';

const tabs = [
  { id: 'home' as const,      icon: Home,       label: '首页' },
  { id: 'stock' as const,     icon: TrendingUp, label: '分析' },
  { id: 'portfolio' as const, icon: Briefcase,  label: '持仓' },
  { id: 'market' as const,    icon: BarChart2,  label: '市场' },
  { id: 'tools' as const,     icon: Wrench,     label: '工具' },
  { id: 'profile' as const,   icon: User,       label: '我的' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(10,15,30,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-item flex-1 ${isActive ? 'active' : ''}`}
              id={`nav-${tab.id}`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title }: { title?: string }) {
  const { token, user, priorityPinnedCodes, setActiveTab } = useAppStore();
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        background: 'rgba(10,15,30,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA000)' }}
        >
          <Target size={16} className="text-white" />
        </div>
        <span className="font-bold text-base gradient-text">牛眼AI</span>
      </div>
      {title && (
        <div className="absolute left-1/2 -translate-x-1/2 font-semibold text-sm text-dark-100">
          {title}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          className="tag text-xs"
          style={{ border: '1px solid rgba(255,215,0,0.25)' }}
          onClick={() => setActiveTab('watchlist')}
        >
          优先池 {priorityPinnedCodes.length > 0 ? `(${priorityPinnedCodes.length})` : ''}
        </button>
        <button
          className="tag text-xs"
          style={{ border: '1px solid rgba(255,215,0,0.25)' }}
          onClick={() => setActiveTab('profile')}
        >
          {token ? (user?.nickname || '我的') : '登录/注册'}
        </button>
        <div className="tag tag-accent text-xs">Beta</div>
      </div>
    </header>
  );
}
