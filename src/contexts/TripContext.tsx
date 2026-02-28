/**
 * TripContext — Shared state for all trip screens.
 * Holds expenses, journal entries, itinerary, squad members, and trip metadata.
 * Persists across navigation within the /trip/* stack.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ItineraryDay } from '../utils/itineraryGenerator';

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
}

const TripContext = createContext<TripContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────

export function TripProvider({ children }: { children: React.ReactNode }) {
  // Trip metadata
  const [tripMeta, setTripMeta] = useState<TripMeta>({
    id: '',
    name: '',
    destination: '',
  });

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
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);

  // Expenses
  const [expenses, setExpenses] = useState<TripExpense[]>([]);

  const addExpense = useCallback((expense: TripExpense) => {
    setExpenses(prev => [expense, ...prev]);
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Journal entries (text per day)
  const [journalEntries, setJournalEntries] = useState<Record<number, string>>({});

  const setJournalEntry = useCallback((day: number, text: string) => {
    setJournalEntries(prev => ({ ...prev, [day]: text }));
  }, []);

  // Journal moods per day
  const [journalMoods, setJournalMoods] = useState<Record<number, string>>({});

  const setJournalMood = useCallback((day: number, mood: string | null) => {
    setJournalMoods(prev => {
      if (mood) return { ...prev, [day]: mood };
      const next = { ...prev };
      delete next[day];
      return next;
    });
  }, []);

  // Journal photos per day
  const [journalPhotos, setJournalPhotos] = useState<Record<number, string[]>>({});

  const addJournalPhoto = useCallback((day: number, uri: string) => {
    setJournalPhotos(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), uri],
    }));
  }, []);

  const removeJournalPhoto = useCallback((day: number, index: number) => {
    setJournalPhotos(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <TripContext.Provider
      value={{
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
      }}
    >
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
