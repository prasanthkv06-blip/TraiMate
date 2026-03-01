/**
 * TrailMate — Exchange Rate Service
 * Uses free ExchangeRate-API (no key needed for open endpoint).
 * 24hr cache via apiCache.
 */

import { getCached, setCache } from './apiCache';

const BASE_URL = 'https://open.er-api.com/v6/latest';

// ── Types ────────────────────────────────────────────────────────────────

export interface ExchangeRateInfo {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

// ── Destination → likely currency mapping ────────────────────────────────

const DESTINATION_CURRENCY: Record<string, string> = {
  // Asia
  india: 'INR', goa: 'INR', delhi: 'INR', mumbai: 'INR', jaipur: 'INR',
  japan: 'JPY', tokyo: 'JPY', kyoto: 'JPY', osaka: 'JPY',
  thailand: 'THB', bangkok: 'THB', phuket: 'THB', 'chiang mai': 'THB',
  indonesia: 'IDR', bali: 'IDR', jakarta: 'IDR',
  vietnam: 'VND', 'ho chi minh': 'VND', hanoi: 'VND',
  singapore: 'SGD',
  malaysia: 'MYR', 'kuala lumpur': 'MYR',
  'south korea': 'KRW', seoul: 'KRW',
  china: 'CNY', beijing: 'CNY', shanghai: 'CNY',
  nepal: 'NPR', kathmandu: 'NPR',
  'sri lanka': 'LKR', colombo: 'LKR',
  // Middle East
  dubai: 'AED', 'abu dhabi': 'AED', uae: 'AED',
  turkey: 'TRY', istanbul: 'TRY',
  // Europe
  france: 'EUR', paris: 'EUR', italy: 'EUR', rome: 'EUR', spain: 'EUR',
  barcelona: 'EUR', germany: 'EUR', berlin: 'EUR', amsterdam: 'EUR',
  portugal: 'EUR', lisbon: 'EUR', greece: 'EUR', athens: 'EUR',
  uk: 'GBP', london: 'GBP', scotland: 'GBP', edinburgh: 'GBP',
  switzerland: 'CHF', zurich: 'CHF',
  czech: 'CZK', prague: 'CZK',
  // Americas
  usa: 'USD', 'new york': 'USD', 'los angeles': 'USD',
  canada: 'CAD', toronto: 'CAD', vancouver: 'CAD',
  mexico: 'MXN', 'mexico city': 'MXN', cancun: 'MXN',
  brazil: 'BRL', 'rio de janeiro': 'BRL',
  colombia: 'COP', bogota: 'COP', medellin: 'COP',
  peru: 'PEN', lima: 'PEN', cusco: 'PEN',
  argentina: 'ARS', 'buenos aires': 'ARS',
  // Oceania
  australia: 'AUD', sydney: 'AUD', melbourne: 'AUD',
  'new zealand': 'NZD', auckland: 'NZD',
  // Africa
  egypt: 'EGP', cairo: 'EGP',
  'south africa': 'ZAR', 'cape town': 'ZAR',
  morocco: 'MAD', marrakech: 'MAD',
  kenya: 'KES', nairobi: 'KES',
  tanzania: 'TZS', zanzibar: 'TZS',
};

export function guessLocalCurrency(destination: string): string {
  const lower = destination.toLowerCase().trim();
  // Direct match
  if (DESTINATION_CURRENCY[lower]) return DESTINATION_CURRENCY[lower];
  // Partial match
  for (const [key, currency] of Object.entries(DESTINATION_CURRENCY)) {
    if (lower.includes(key) || key.includes(lower)) return currency;
  }
  return 'USD'; // fallback
}

// ── Get Exchange Rates ───────────────────────────────────────────────────

export async function getExchangeRate(
  from: string,
  to: string,
): Promise<ExchangeRateInfo | null> {
  const cacheKey = `fx_${from}_${to}`;
  const cached = await getCached<ExchangeRateInfo>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${BASE_URL}/${from}`);
    if (!response.ok) return null;
    const data = await response.json();

    if (data.result !== 'success' || !data.rates?.[to]) return null;

    const result: ExchangeRateInfo = {
      from,
      to,
      rate: data.rates[to],
      lastUpdated: data.time_last_update_utc || new Date().toISOString(),
    };

    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ── Convert Currency ─────────────────────────────────────────────────────

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<number | null> {
  const info = await getExchangeRate(from, to);
  if (!info) return null;
  return Math.round(amount * info.rate * 100) / 100;
}

// ── Format currency for display ──────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', THB: '฿',
  AED: 'د.إ', AUD: 'A$', CAD: 'C$', IDR: 'Rp', VND: '₫', SGD: 'S$',
  MYR: 'RM', KRW: '₩', CNY: '¥', TRY: '₺', CHF: 'CHF', CZK: 'Kč',
  MXN: 'MX$', BRL: 'R$', NZD: 'NZ$', EGP: 'E£', ZAR: 'R', MAD: 'MAD',
  KES: 'KSh', TZS: 'TSh', NPR: 'NRs', LKR: 'Rs', COP: 'COL$',
  PEN: 'S/', ARS: 'AR$',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatLocalPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  // No decimals for currencies with large values
  const noDecimals = ['JPY', 'KRW', 'VND', 'IDR', 'COP', 'CLP'].includes(currencyCode);
  const formatted = noDecimals ? Math.round(amount).toLocaleString() : amount.toFixed(2);
  return `${symbol}${formatted}`;
}
