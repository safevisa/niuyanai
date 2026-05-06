import { requestStockAnalysis } from '@/lib/api';
import type { SearchResult, StockAnalysis } from '@/types';

const ANALYSIS_CACHE_TTL_MS = 45_000;

type CacheRow = {
  value: StockAnalysis;
  loadedAt: number;
};

const analysisCache = new Map<string, CacheRow>();

function cacheKey(stock: SearchResult): string {
  return stock.code;
}

export function getCachedAnalysis(stock: SearchResult): StockAnalysis | null {
  const row = analysisCache.get(cacheKey(stock));
  if (!row) return null;
  if (Date.now() - row.loadedAt > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(cacheKey(stock));
    return null;
  }
  return row.value;
}

export async function getAnalysisWithCache(stock: SearchResult, token?: string, force = false): Promise<StockAnalysis> {
  if (!force) {
    const cached = getCachedAnalysis(stock);
    if (cached) return cached;
  }
  const latest = await requestStockAnalysis(stock, token);
  analysisCache.set(cacheKey(stock), { value: latest, loadedAt: Date.now() });
  return latest;
}

export function isAnalysisFresh(stock: SearchResult): boolean {
  const row = analysisCache.get(cacheKey(stock));
  if (!row) return false;
  return Date.now() - row.loadedAt <= ANALYSIS_CACHE_TTL_MS;
}

export function getAnalysisCacheLoadedAt(stock: SearchResult): number | null {
  const row = analysisCache.get(cacheKey(stock));
  if (!row) return null;
  if (Date.now() - row.loadedAt > ANALYSIS_CACHE_TTL_MS) {
    analysisCache.delete(cacheKey(stock));
    return null;
  }
  return row.loadedAt;
}

export function clearAnalysisCache(code?: string): void {
  if (!code) {
    analysisCache.clear();
    return;
  }
  analysisCache.delete(code);
}
