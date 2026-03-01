/**
 * TrailMate — Google Places React Hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AISuggestion } from '../constants/aiData';
import { searchPlaces, autocompletePlaces, type AutocompleteResult } from '../lib/googlePlaces';

// ── usePlaceSuggestions ──────────────────────────────────────────────────

interface PlaceSuggestionsResult {
  suggestions: AISuggestion[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlaceSuggestions(destination: string): PlaceSuggestionsResult {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchSuggestions = useCallback(async () => {
    if (!destination.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const [food, activities] = await Promise.all([
        searchPlaces(destination, 'food'),
        searchPlaces(destination, 'activity'),
      ]);

      if (!mountedRef.current) return;

      // Interleave food and activities
      const combined: AISuggestion[] = [];
      const maxLen = Math.max(food.length, activities.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < food.length) combined.push(food[i]);
        if (i < activities.length) combined.push(activities[i]);
      }

      setSuggestions(combined);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [destination]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSuggestions();
    return () => { mountedRef.current = false; };
  }, [fetchSuggestions]);

  return { suggestions, isLoading, error, refetch: fetchSuggestions };
}

// ── usePlaceAutocomplete ─────────────────────────────────────────────────

interface AutocompleteHookResult {
  results: AutocompleteResult[];
  isLoading: boolean;
}

export function usePlaceAutocomplete(query: string): AutocompleteHookResult {
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 300ms debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await autocompletePlaces(query);
        if (mountedRef.current) {
          setResults(data);
        }
      } catch {
        if (mountedRef.current) setResults([]);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, isLoading };
}
