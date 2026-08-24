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
    console.log(`[exchange-rate] Serving cached rate: ${cache.rate}`);
    return cache.rate;
  }

  // Cache is missing or stale — fetch in background (non-blocking)
  console.log('[exchange-rate] Fetching new rate...');
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  fetchAndUpdateCache();

  // Return cached rate immediately (or fallback if no cache yet)
  const returnedRate = cache?.rate ?? FALLBACK_RATE;
  console.log(`[exchange-rate] Returning: ${returnedRate}`);
  return returnedRate;
}

async function fetchAndUpdateCache(): Promise<void> {
  try {
    console.log('[exchange-rate] Fetching from API...');
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', {
      next: { revalidate: 0 }, // Do not cache fetch response itself, we manage caching
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.USD;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid rate in response');
    console.log(`[exchange-rate] API returned rate: ${rate}`);
    cache = { rate, fetchedAt: new Date() };
  } catch (error) {
    console.error('[exchange-rate] API fetch failed:', error instanceof Error ? error.message : error);
    // Cache stays as-is (or stays null if this was the first attempt)
    // Component will use fallback
  }
}
