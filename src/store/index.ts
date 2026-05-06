import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Position, StockAnalysis, MarketOverview, SearchResult } from '@/types';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Current analysis
  currentAnalysis: StockAnalysis | null;
  isAnalyzing: boolean;
  setCurrentAnalysis: (analysis: StockAnalysis | null) => void;
  setIsAnalyzing: (v: boolean) => void;

  // Portfolio
  positions: Position[];
  addPosition: (position: Position) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  priorityPinnedCodes: string[];
  togglePriorityPinnedCode: (stockCode: string) => void;

  // Market
  marketOverview: MarketOverview | null;
  setMarketOverview: (overview: MarketOverview) => void;

  // UI
  activeTab: 'home' | 'stock' | 'portfolio' | 'market' | 'tools' | 'profile' | 'compare' | 'watchlist';
  setActiveTab: (tab: AppState['activeTab']) => void;
  showDisclaimer: boolean;
  setShowDisclaimer: (v: boolean) => void;
  hasAcceptedRisk: boolean;
  setHasAcceptedRisk: (v: boolean) => void;

  // Search
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Compare
  comparePool: SearchResult[];
  toggleCompareStock: (item: SearchResult) => void;
  clearComparePool: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),

      // Analysis
      currentAnalysis: null,
      isAnalyzing: false,
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),

      // Portfolio
      positions: [],
      addPosition: (position) =>
        set((s) => ({ positions: [...s.positions, position] })),
      removePosition: (id) =>
        set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),
      updatePosition: (id, updates) =>
        set((s) => ({
          positions: s.positions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      priorityPinnedCodes: [],
      togglePriorityPinnedCode: (stockCode) =>
        set((s) => ({
          priorityPinnedCodes: s.priorityPinnedCodes.includes(stockCode)
            ? s.priorityPinnedCodes.filter((code) => code !== stockCode)
            : [...s.priorityPinnedCodes, stockCode],
        })),

      // Market
      marketOverview: null,
      setMarketOverview: (overview) => set({ marketOverview: overview }),

      // UI
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),
      showDisclaimer: false,
      setShowDisclaimer: (v) => set({ showDisclaimer: v }),
      hasAcceptedRisk: false,
      setHasAcceptedRisk: (v) => set({ hasAcceptedRisk: v }),

      // Search
      searchHistory: [],
      addToSearchHistory: (query) =>
        set((s) => ({
          searchHistory: [
            query,
            ...s.searchHistory.filter((q) => q !== query),
          ].slice(0, 10),
        })),
      clearSearchHistory: () => set({ searchHistory: [] }),

      // Compare
      comparePool: [],
      toggleCompareStock: (item) =>
        set((s) => {
          const exists = s.comparePool.some((x) => x.code === item.code);
          if (exists) {
            return { comparePool: s.comparePool.filter((x) => x.code !== item.code) };
          }
          if (s.comparePool.length >= 3) {
            return { comparePool: [...s.comparePool.slice(1), item] };
          }
          return { comparePool: [...s.comparePool, item] };
        }),
      clearComparePool: () => set({ comparePool: [] }),
    }),
    {
      name: 'bulleye-ai-store',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        positions: s.positions,
        priorityPinnedCodes: s.priorityPinnedCodes,
        searchHistory: s.searchHistory,
        comparePool: s.comparePool,
        hasAcceptedRisk: s.hasAcceptedRisk,
      }),
    }
  )
);
