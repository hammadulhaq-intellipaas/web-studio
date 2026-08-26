/**
 * Live EUR→USD exchange rate with 24-hour in-memory cache.
 * Fetches from exchangerate-api.com; falls back to 1.17 if API fails.
 * Non-blocking: serves cached rate immediately, fetches new rate in background.
 */

interface CacheState {
  rate: number;
  fetchedAt: Date;
}

let cache: CacheState | null = null;
const FALLBACK_RATE = 1.17;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getExchangeRate(): Promise<number> {
  const now = new Date();

  // Check if cache is still fresh (< 24 hours old)
  if (cache && now.getTime() - cache.fetchedAt.getTime() < CACHE_DURATION_MS) {
    return cache.rate;
  }

  // Cache is missing or stale — refresh in the background so nobody waits on the API.
  void fetchAndUpdateCache();

  // Return cached rate immediately (or fallback if no cache yet)
  return cache?.rate ?? FALLBACK_RATE;
}

async function fetchAndUpdateCache(): Promise<void> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', {
      next: { revalidate: 0 }, // Do not cache fetch response itself, we manage caching
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.USD;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate in response');
    cache = { rate, fetchedAt: new Date() };
  } catch (error) {
    console.error('[exchange-rate] API fetch failed:', error instanceof Error ? error.message : error);
    // Cache stays as-is (or stays null if this was the first attempt)
    // Component will use fallback
  }
}
