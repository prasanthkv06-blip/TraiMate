/**
 * TraiMate — Google Places API (New) Service
 * Uses Places API v1 (text search + autocomplete) via direct fetch.
 * $200/mo free credit covers ~6,250 text searches.
 */

import type { AISuggestion } from '../constants/aiData';
import { getCached, setCache } from './apiCache';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
const BASE_URL = 'https://places.googleapis.com/v1';

// ── Helpers ──────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return API_KEY.length > 0;
}

function mapPriceLevel(level?: string): string {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return '$$';
  }
}

function inferStype(types: string[]): 'food' | 'activity' {
  const foodTypes = ['restaurant', 'cafe', 'bakery', 'bar', 'meal_delivery', 'meal_takeaway', 'food'];
  return types.some(t => foodTypes.includes(t)) ? 'food' : 'activity';
}

function mapPlaceToSuggestion(place: any): AISuggestion {
  const types: string[] = place.types || [];
  return {
    tl: place.displayName?.text || 'Unknown Place',
    l: place.formattedAddress || '',
    desc: place.editorialSummary?.text || place.primaryType?.replace(/_/g, ' ') || 'Popular spot',
    price: mapPriceLevel(place.priceLevel),
    rating: place.rating || 4.0,
    tags: types
      .filter((t: string) => !t.startsWith('point_of_interest') && !t.startsWith('establishment'))
      .slice(0, 3)
      .map((t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())),
    ai: '', // Will be filled by generateAITips if available
    stype: inferStype(types),
  };
}

// ── Text Search ──────────────────────────────────────────────────────────

export async function searchPlaces(
  destination: string,
  type: 'food' | 'activity' | 'all' = 'all',
): Promise<AISuggestion[]> {
  if (!isConfigured()) return [];

  const cacheKey = `places_${destination}_${type}`;
  const cached = await getCached<AISuggestion[]>(cacheKey);
  if (cached) return cached;

  const typeQuery = type === 'food'
    ? 'best restaurants and cafes'
    : type === 'activity'
      ? 'top attractions and things to do'
      : 'best places to visit and eat';

  try {
    const response = await fetch(`${BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.types,places.editorialSummary,places.primaryType',
      },
      body: JSON.stringify({
        textQuery: `${typeQuery} in ${destination}`,
        maxResultCount: 10,
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      console.warn(`Places API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const places = data.places || [];
    const suggestions: AISuggestion[] = places.map(mapPlaceToSuggestion);

    await setCache(cacheKey, suggestions);
    return suggestions;
  } catch (error) {
    console.warn('Places API fetch failed:', error);
    return [];
  }
}

// ── Autocomplete ─────────────────────────────────────────────────────────

export interface AutocompleteResult {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export async function autocompletePlaces(query: string): Promise<AutocompleteResult[]> {
  if (!isConfigured() || query.trim().length < 2) return [];

  const cacheKey = `autocomplete_${query.toLowerCase().trim()}`;
  const cached = await getCached<AutocompleteResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'country', 'tourist_attraction'],
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      console.warn(`Places Autocomplete error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const suggestions = data.suggestions || [];

    const results: AutocompleteResult[] = suggestions
      .filter((s: any) => s.placePrediction)
      .map((s: any) => {
        const pred = s.placePrediction;
        return {
          placeId: pred.placeId || '',
          mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || query,
          secondaryText: pred.structuredFormat?.secondaryText?.text || '',
          fullText: pred.text?.text || query,
        };
      })
      .slice(0, 5);

    await setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('Places Autocomplete fetch failed:', error);
    return [];
  }
}
