'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { searchStocks } from '@/lib/mockData';
import { fetchMarketStocksPage, searchStocksRemotePage } from '@/lib/api';
import type { SearchResult } from '@/types';
import { useAppStore } from '@/store';
import { formatDate, t } from '@/lib/i18n';

interface SearchBarProps {
  onSelect: (stock: SearchResult) => void;
  placeholder?: string;
  large?: boolean;
}

export default function SearchBar({
  onSelect,
  placeholder = '搜索股票代码或名称...',
  large = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchHistory, addToSearchHistory, priorityPinnedCodes, togglePriorityPinnedCode } = useAppStore();

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (!q) {
        setResults([]);
        setSearchTotal(null);
        setSelectedIndex(-1);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const remotePage = await searchStocksRemotePage(q, 30);
        const remote = remotePage.rows;
        setSearchTotal(remotePage.total);
        if (remote.length > 0) {
          setResults(remote);
        } else if (/^\d{6}$/.test(q)) {
          setResults([{
            code: q,
            name: `股票${q}`,
            market: q.startsWith('6') ? 'SH' : 'SZ',
            industry: '未知',
          }]);
        } else {
          // 深度补偿：当搜索接口返回空时，回退到全市场列表检索
          const marketPage = await fetchMarketStocksPage(q, 30, 0);
          if (marketPage.rows.length > 0) {
            setSearchTotal(marketPage.total);
            setResults(
              marketPage.rows.map((row) => ({
                code: row.code,
                name: row.name,
                market: row.market,
                industry: row.industry,
                as_of: row.as_of,
              }))
            );
          } else {
            setResults(searchStocks(q));
          }
        }
      } catch {
        const local = searchStocks(q);
        setSearchTotal(null);
        if (local.length > 0) {
          setResults(local);
        } else if (/^\d{6}$/.test(q)) {
          setResults([{
            code: q,
            name: `股票${q}`,
            market: q.startsWith('6') ? 'SH' : 'SZ',
            industry: '未知',
          }]);
        } else {
          setResults([]);
        }
      } finally {
        setSelectedIndex(-1);
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (stock: SearchResult) => {
    addToSearchHistory(`${stock.code} ${stock.name}`);
    setQuery('');
    setFocused(false);
    onSelect(stock);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focused) return;
    const list = results.length ? results : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelect(list[selectedIndex]);
    } else if (e.key === 'Enter' && selectedIndex < 0) {
      const raw = query.trim();
      if (/^\d{6}$/.test(raw)) {
        const fallback: SearchResult = {
          code: raw,
          name: `股票${raw}`,
          market: raw.startsWith('6') ? 'SH' : 'SZ',
          industry: '未知',
        };
        handleSelect(fallback);
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const showDropdown = focused && (results.length > 0 || (!query && searchHistory.length > 0));

  return (
    <div className="relative w-full">
      {/* Input */}
      <div
        className={`flex items-center gap-3 input-dark transition-all ${
          large ? 'py-4 px-5 text-base rounded-2xl' : ''
        } ${focused ? 'border-orange-500/50 shadow-[0_0_0_3px_rgba(249,115,22,0.1)]' : ''}`}
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Search
          size={large ? 22 : 18}
          className={`flex-shrink-0 transition-colors ${focused ? 'text-orange-400' : 'text-dark-400'}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-dark-100 placeholder-dark-400"
          style={{ fontSize: large ? '1rem' : '0.9375rem' }}
          id="stock-search-input"
          aria-label="搜索股票"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="flex-shrink-0 text-dark-400 hover:text-dark-200 transition-colors"
            aria-label="清除搜索"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
          style={{
            background: 'rgba(17,24,39,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search results */}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-dark-400 border-b border-white/5">
                搜索结果
                {searchTotal !== null ? ` · 全市场约 ${searchTotal} 条匹配` : ''}
              </div>
              {results.map((stock, i) => (
                <div
                  key={stock.code}
                  onClick={() => handleSelect(stock)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                    selectedIndex === i
                      ? 'bg-orange-500/10'
                      : 'hover:bg-white/4 cursor-pointer'
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp size={14} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-100 text-sm">{stock.name}</span>
                      <span className="text-xs text-dark-400">{stock.code}</span>
                      {priorityPinnedCodes.includes(stock.code) && (
                        <span className="tag text-[10px]">优先队列</span>
                      )}
                    </div>
                    <div className="text-xs text-dark-500 mt-0.5">
                      {stock.market} · {stock.industry}
                      {stock.as_of ? ` · ${t('stock.dataAsOfPrefix')} ${formatDate(stock.as_of)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tag tag-accent text-xs">{stock.market}</span>
                    <button
                      className="btn-ghost text-[10px] px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePriorityPinnedCode(stock.code);
                      }}
                    >
                      {priorityPinnedCodes.includes(stock.code) ? '取消置顶' : '置顶'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          {!query && searchHistory.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-dark-400 border-b border-white/5 flex items-center gap-2">
                <Clock size={12} />
                最近搜索
              </div>
              {searchHistory.slice(0, 5).map((h, i) => {
                const parts = h.split(' ');
                const code = parts[0];
                const name = parts.slice(1).join(' ');
                const sr: SearchResult = { code, name, market: '', industry: '' };
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(sr)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/4 transition-colors text-left"
                  >
                    <Clock size={12} className="text-dark-500 flex-shrink-0" />
                    <span className="text-sm text-dark-300">{h}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query && !isSearching && results.length === 0 && (
            <div className="px-4 py-6 text-center text-dark-400 text-sm">
              未找到 "{query}" 相关股票
            </div>
          )}

          {query && isSearching && (
            <div className="px-4 py-6 text-center text-dark-400 text-sm">
              搜索中...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
