import axios from 'axios';

/**
 * Free exchange rate provider — no API key required.
 * https://www.exchangerate-api.com/docs/free (open.er-api.com mirror)
 * Rates update once every 24h on the free tier, which is fine for
 * booking checkouts (not high-frequency trading).
 */
const RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';

type SupportedCurrency = 'usd' | 'eur' | 'dzd';

interface CachedRates {
  base: 'USD';
  rates: Record<string, number>; // e.g. { EUR: 0.92, DZD: 134.5, ... }
  fetchedAt: number;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

let cache: CachedRates | null = null;
let inFlightFetch: Promise<CachedRates> | null = null;

const fetchFreshRates = async (): Promise<CachedRates> => {
  const { data } = await axios.get(RATE_API_URL, { timeout: 10000 });

  if (data?.result !== 'success' || !data?.rates) {
    throw new Error('Exchange rate API returned an unexpected response');
  }

  return {
    base: 'USD',
    rates: data.rates,
    fetchedAt: Date.now(),
  };
};

const getRates = async (): Promise<CachedRates> => {
  const isStale = !cache || Date.now() - cache.fetchedAt > CACHE_TTL_MS;

  if (!isStale) return cache as CachedRates;

  // Avoid duplicate concurrent fetches (e.g. many checkouts hitting at once
  // right when the cache expires)
  if (!inFlightFetch) {
    inFlightFetch = fetchFreshRates()
      .then(fresh => {
        cache = fresh;
        return fresh;
      })
      .catch(err => {
        // If we have a stale cache, prefer serving stale data over failing
        // the whole checkout flow.
        if (cache) return cache;
        throw err;
      })
      .finally(() => {
        inFlightFetch = null;
      });
  }

  return inFlightFetch;
};

/**
 * Converts an amount from USD (your DB's base currency) to the target
 * currency, rounded appropriately:
 * - usd/eur -> 2 decimal places, returned in the smallest unit (cents)
 *   because that's what Stripe expects.
 * - dzd -> whole number (Chargily's examples use whole DZD units, no
 *   sub-unit/cents).
 */
export const convertFromUsd = async (
  amountUsd: number,
  to: SupportedCurrency,
): Promise<number> => {
  if (to === 'usd') {
    return Math.round(amountUsd * 100); // cents, for Stripe
  }

  const { rates } = await getRates();
  const rate = rates[to.toUpperCase()];

  if (!rate) {
    throw new Error(`No exchange rate available for currency: ${to}`);
  }

  const converted = amountUsd * rate;

  if (to === 'eur') {
    return Math.round(converted * 100); // cents, for Stripe
  }

  // dzd — Chargily takes whole units, not centimes
  return Math.round(converted);
};

/**
 * Human-readable converted amount (not multiplied into subunits) —
 * useful for showing "≈ 27,300 DZD" on your frontend before redirecting
 * to the checkout, so the customer isn't surprised by the charged amount.
 */
export const previewConvertedAmount = async (
  amountUsd: number,
  to: SupportedCurrency,
): Promise<number> => {
  if (to === 'usd') return amountUsd;
  const { rates } = await getRates();
  const rate = rates[to.toUpperCase()];
  if (!rate) throw new Error(`No exchange rate available for currency: ${to}`);
  return Math.round(amountUsd * rate * 100) / 100;
};
