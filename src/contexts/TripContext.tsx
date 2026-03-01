/**
 * TripContext — Shared state for all trip screens.
 * Holds expenses, journal entries, itinerary, squad members, and trip metadata.
 * Persists across navigation within the /trip/* stack.
 * Now with offline-first persistence via storageCache + tripService.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ItineraryDay } from '../utils/itineraryGenerator';
import * as tripService from '../services/tripService';
import { loadTripLocally } from '../services/storageCache';

// ── Types ──────────────────────────────────────────────────────────────

export interface TripExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  splitWith: string[];
  date: string;
  icon: string;
  receiptUri?: string;
}

export interface TripJournalEntry {
  day: number;
  text: string;
  mood?: string;
  photos: string[];
}

export interface TripSquadMember {
  id: string;
  name: string;
  initial: string;
  color: string;
}

export interface TripMeta {
  id: string;
  name: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  tripType?: string;
}

// ── Context shape ──────────────────────────────────────────────────────

interface TripContextValue {
  // Trip metadata
  tripMeta: TripMeta;
  setTripMeta: (meta: TripMeta) => void;

  // Squad
  squad: TripSquadMember[];
  setSquad: React.Dispatch<React.SetStateAction<TripSquadMember[]>>;
  addSquadMember: (member: TripSquadMember) => void;

  // Itinerary
  itinerary: ItineraryDay[];
  setItinerary: React.Dispatch<React.SetStateAction<ItineraryDay[]>>;

  // Expenses
  expenses: TripExpense[];
  addExpense: (expense: TripExpense) => void;
  removeExpense: (id: string) => void;

  // Journal
  journalEntries: Record<number, string>;
  setJournalEntry: (day: number, text: string) => void;
  journalMoods: Record<number, string>;
  setJournalMood: (day: number, mood: string | null) => void;
  journalPhotos: Record<number, string[]>;
  addJournalPhoto: (day: number, uri: string) => void;
  removeJournalPhoto: (day: number, index: number) => void;

  // Loading state
  isLoaded: boolean;
  loadFromStorage: (tripId: string) => Promise<void>;
}

const TripContext = createContext<TripContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────

export function TripProvider({ children }: { children: React.ReactNode }) {
  // Trip metadata
  const [tripMeta, setTripMetaState] = useState<TripMeta>({
    id: '',
    name: '',
    destination: '',
  });

  // Loading state
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedTripIdRef = useRef<string>('');

  // Squad
  const [squad, setSquad] = useState<TripSquadMember[]>([
    { id: '0', name: 'You', initial: 'Y', color: '#B07A50' },
  ]);

  const addSquadMember = useCallback((member: TripSquadMember) => {
    setSquad(prev => {
      if (prev.some(m => m.id === member.id)) return prev;
      return [...prev, member];
    });
  }, []);

  // Itinerary
  const [itinerary, setItineraryState] = useState<ItineraryDay[]>([]);

  // Expenses
  const [expenses, setExpenses] = useState<TripExpense[]>([]);

  // Journal entries (text per day)
  const [journalEntries, setJournalEntries] = useState<Record<number, string>>({});

  // Journal moods per day
  const [journalMoods, setJournalMoods] = useState<Record<number, string>>({});

  // Journal photos per day
  const [journalPhotos, setJournalPhotos] = useState<Record<number, string[]>>({});

  // ── Load from storage ─────────────────────────────────────────────────

  const loadFromStorage = useCallback(async (tripId: string) => {
    if (!tripId || loadedTripIdRef.current === tripId) return;
    loadedTripIdRef.current = tripId;

    const blob = await loadTripLocally(tripId);
    if (blob) {
      if (blob.itinerary.length > 0) setItineraryState(blob.itinerary);
      if (blob.expenses.length > 0) setExpenses(blob.expenses);
      if (Object.keys(blob.journalEntries).length > 0) setJournalEntries(blob.journalEntries);
      if (Object.keys(blob.journalMoods).length > 0) setJournalMoods(blob.journalMoods);
      if (Object.keys(blob.journalPhotos).length > 0) setJournalPhotos(blob.journalPhotos);
    }
    setIsLoaded(true);
  }, []);

  // ── Wrapped setters that persist in background ────────────────────────

  const setTripMeta = useCallback((meta: TripMeta) => {
    setTripMetaState(meta);
    // Auto-load from storage when trip ID changes
    if (meta.id && meta.id !== loadedTripIdRef.current) {
      loadFromStorage(meta.id);
    }
  }, [loadFromStorage]);

  const setItinerary: React.Dispatch<React.SetStateAction<ItineraryDay[]>> = useCallback(
    (action: React.SetStateAction<ItineraryDay[]>) => {
      setItineraryState(prev => {
        const next = typeof action === 'function' ? action(prev) : action;
        // Background persist
        const tripId = loadedTripIdRef.current;
        if (tripId && next.length > 0) {
          tripService.saveItinerary(tripId, next);
        }
        return next;
      });
    },
    [],
  );

  const addExpense = useCallback((expense: TripExpense) => {
    setExpenses(prev => [expense, ...prev]);
    const tripId = loadedTripIdRef.current;
    if (tripId) {
      tripService.addExpense(tripId, expense);
    }
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    const tripId = loadedTripIdRef.current;
    if (tripId) {
      tripService.removeExpense(tripId, id);
    }
  }, []);

  const setJournalEntry = useCallback((day: number, text: string) => {
    setJournalEntries(prev => ({ ...prev, [day]: text }));
    const tripId = loadedTripIdRef.current;
    if (tripId) {
      tripService.saveJournal(tripId, day, { text });
    }
  }, []);

  const setJournalMood = useCallback((day: number, mood: string | null) => {
    setJournalMoods(prev => {
      if (mood) return { ...prev, [day]: mood };
      const next = { ...prev };
      delete next[day];
      return next;
    });
    const tripId = loadedTripIdRef.current;
    if (tripId) {
      tripService.saveJournal(tripId, day, { text: journalEntries[day] || '', mood: mood || undefined });
    }
  }, [journalEntries]);

  const addJournalPhoto = useCallback((day: number, uri: string) => {
    setJournalPhotos(prev => {
      const updated = { ...prev, [day]: [...(prev[day] || []), uri] };
      const tripId = loadedTripIdRef.current;
      if (tripId) {
        tripService.saveJournal(tripId, day, { text: journalEntries[day] || '', photos: updated[day] });
      }
      return updated;
    });
  }, [journalEntries]);

  const removeJournalPhoto = useCallback((day: number, index: number) => {
    setJournalPhotos(prev => {
      const updated = { ...prev, [day]: (prev[day] || []).filter((_, i) => i !== index) };
      const tripId = loadedTripIdRef.current;
      if (tripId) {
        tripService.saveJournal(tripId, day, { text: journalEntries[day] || '', photos: updated[day] });
      }
      return updated;
    });
  }, [journalEntries]);

  const value = useMemo<TripContextValue>(() => ({
    tripMeta,
    setTripMeta,
    squad,
    setSquad,
    addSquadMember,
    itinerary,
    setItinerary,
    expenses,
    addExpense,
    removeExpense,
    journalEntries,
    setJournalEntry,
    journalMoods,
    setJournalMood,
    journalPhotos,
    addJournalPhoto,
    removeJournalPhoto,
    isLoaded,
    loadFromStorage,
  }), [
    tripMeta, squad, itinerary, expenses, journalEntries, journalMoods, journalPhotos,
    isLoaded, setTripMeta, setSquad, addSquadMember, setItinerary, addExpense, removeExpense,
    setJournalEntry, setJournalMood, addJournalPhoto, removeJournalPhoto, loadFromStorage,
  ]);

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useTripContext() {
  const ctx = useContext(TripContext);
  if (!ctx) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return ctx;
}

// Optional: safe hook that returns null if outside provider (for review screen which may be accessed standalone)
export function useTripContextSafe() {
  return useContext(TripContext);
}

// ── Currency formatting helper ────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', THB: '฿', JPY: '¥', AUD: 'A$',
};

export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return '$';
  return CURRENCY_SYMBOLS[currencyCode] || '$';
}

export function formatAmount(amount: number, currencyCode?: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  if (currencyCode === 'INR') {
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}
