/**
 * AsyncStorage-based persistence for trip data.
 * Each trip is serialized under `@traimate_trip_{id}`.
 * A trips index stores metadata for listing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItineraryDay } from '../utils/itineraryGenerator';

const TRIPS_INDEX_KEY = '@traimate_trips_index';
const tripKey = (id: string) => `@traimate_trip_${id}`;

// ── Trip index (list of trip metadata) ──────────────────────────────────

export interface TripIndexEntry {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  startDate: string | null;
  endDate: string | null;
  coverImage: string | null;
  phase: 'planning' | 'live' | 'review';
  createdBy: string;
  createdAt: string;
  memberCount: number;
}

export async function saveTripsIndex(trips: TripIndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(TRIPS_INDEX_KEY, JSON.stringify(trips));
}

export async function loadTripsIndex(): Promise<TripIndexEntry[]> {
  const raw = await AsyncStorage.getItem(TRIPS_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Full trip blob (all data for one trip) ──────────────────────────────

export interface TripBlob {
  meta: TripIndexEntry;
  itinerary: ItineraryDay[];
  expenses: TripExpenseLocal[];
  journalEntries: Record<number, string>;
  journalMoods: Record<number, string>;
  journalPhotos: Record<number, string[]>;
  packingItems: PackingItemLocal[];
}

export interface TripExpenseLocal {
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

export interface PackingItemLocal {
  id: string;
  name: string;
  emoji: string;
  category: string;
  packed: boolean;
}

export async function saveTripLocally(tripId: string, data: TripBlob): Promise<void> {
  await AsyncStorage.setItem(tripKey(tripId), JSON.stringify(data));
}

export async function loadTripLocally(tripId: string): Promise<TripBlob | null> {
  const raw = await AsyncStorage.getItem(tripKey(tripId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeTripLocally(tripId: string): Promise<void> {
  await AsyncStorage.removeItem(tripKey(tripId));
  // Also remove from index
  const index = await loadTripsIndex();
  const updated = index.filter(t => t.id !== tripId);
  await saveTripsIndex(updated);
}
