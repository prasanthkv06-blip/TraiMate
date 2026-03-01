/**
 * Thin CRUD layer for trips.
 * Pattern: write to AsyncStorage immediately → attempt Supabase sync in background.
 * Never blocks UI on network. Supabase failures are silently caught.
 */
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { getDeviceId } from './deviceUser';
import {
  saveTripLocally,
  loadTripLocally,
  saveTripsIndex,
  loadTripsIndex,
  removeTripLocally,
  type TripIndexEntry,
  type TripBlob,
  type TripExpenseLocal,
  type PackingItemLocal,
} from './storageCache';
export type { TripIndexEntry, TripExpenseLocal, PackingItemLocal } from './storageCache';
import type { ItineraryDay } from '../utils/itineraryGenerator';

// ── Helpers ─────────────────────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return url.length > 0 && !url.includes('your-project');
}

async function supabaseSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}

// ── Create trip ─────────────────────────────────────────────────────────

export interface CreateTripInput {
  name: string;
  destination: string;
  emoji?: string;
  startDate?: string | null;
  endDate?: string | null;
  coverImage?: string | null;
  tripType?: string;
  currency?: string;
}

export async function createTrip(input: CreateTripInput): Promise<TripIndexEntry> {
  const deviceId = await getDeviceId();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  const entry: TripIndexEntry = {
    id,
    name: input.name,
    destination: input.destination,
    emoji: input.emoji || '🌍',
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    coverImage: input.coverImage || null,
    phase: 'planning',
    createdBy: deviceId,
    createdAt: now,
    memberCount: 1,
  };

  // Save to local storage immediately
  const blob: TripBlob = {
    meta: entry,
    itinerary: [],
    expenses: [],
    journalEntries: {},
    journalMoods: {},
    journalPhotos: {},
    packingItems: [],
    members: [{
      id: Crypto.randomUUID(),
      userId: deviceId,
      name: 'You',
      role: 'organizer',
      joinedAt: now,
    }],
    invitations: [],
  };
  await saveTripLocally(id, blob);

  // Update index
  const index = await loadTripsIndex();
  index.unshift(entry);
  await saveTripsIndex(index);

  // Background Supabase sync
  supabaseSafe(async () => {
    await supabase.from('trips').insert({
      id,
      name: input.name,
      destination: input.destination,
      emoji: input.emoji || '🌍',
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      cover_image: input.coverImage || null,
      phase: 'planning',
      created_by: deviceId,
    } as any);
  });

  return entry;
}

// ── Fetch trips ─────────────────────────────────────────────────────────

export async function fetchTrips(): Promise<TripIndexEntry[]> {
  // Try Supabase first for latest data
  const remote = await supabaseSafe(async () => {
    const deviceId = await getDeviceId();
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('created_by' as any, deviceId)
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return (data as any[]).map((row): TripIndexEntry => ({
      id: row.id,
      name: row.name,
      destination: row.destination,
      emoji: row.emoji || '🌍',
      startDate: row.start_date,
      endDate: row.end_date,
      coverImage: row.cover_image,
      phase: row.phase as TripIndexEntry['phase'],
      createdBy: row.created_by,
      createdAt: row.created_at,
      memberCount: 1,
    }));
  });

  if (remote) {
    // Merge: keep local-only trips that haven't synced
    const localIndex = await loadTripsIndex();
    const remoteIds = new Set(remote.map(t => t.id));
    const localOnly = localIndex.filter(t => !remoteIds.has(t.id));
    const merged = [...localOnly, ...remote];
    await saveTripsIndex(merged);
    return merged;
  }

  // Fallback to local cache
  return loadTripsIndex();
}

// ── Delete trip ─────────────────────────────────────────────────────────

export async function deleteTrip(tripId: string): Promise<void> {
  await removeTripLocally(tripId);

  supabaseSafe(async () => {
    await supabase.from('trips').delete().eq('id', tripId);
  });
}

// ── Itinerary ───────────────────────────────────────────────────────────

export async function saveItinerary(tripId: string, days: ItineraryDay[]): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.itinerary = days;
    await saveTripLocally(tripId, blob);
  }

  // Supabase sync: replace all itinerary items for this trip
  supabaseSafe(async () => {
    await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
    const rows = days.flatMap(day =>
      day.items.map(item => ({
        id: item.id,
        trip_id: tripId,
        day: day.dayNumber,
        time: item.time,
        title: item.title,
        emoji: item.emoji || '📍',
        type: (item.type === 'sightseeing' || item.type === 'nightlife' || item.type === 'shopping'
          ? 'activity' : item.type) as 'accommodation' | 'activity' | 'food' | 'transport',
        notes: item.notes || null,
      }))
    );
    if (rows.length > 0) {
      await supabase.from('itinerary_items').insert(rows as any);
    }
  });
}

export async function loadItinerary(tripId: string): Promise<ItineraryDay[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.itinerary || [];
}

// ── Expenses ────────────────────────────────────────────────────────────

export async function addExpense(tripId: string, expense: TripExpenseLocal): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.expenses.unshift(expense);
    await saveTripLocally(tripId, blob);
  }

  supabaseSafe(async () => {
    const deviceId = await getDeviceId();
    await supabase.from('expenses').insert({
      id: expense.id,
      trip_id: tripId,
      title: expense.title,
      amount: expense.amount,
      currency: 'USD',
      category: expense.category,
      emoji: expense.icon,
      paid_by: deviceId,
      split_with: expense.splitWith,
    } as any);
  });
}

export async function removeExpense(tripId: string, expenseId: string): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.expenses = blob.expenses.filter(e => e.id !== expenseId);
    await saveTripLocally(tripId, blob);
  }

  supabaseSafe(async () => {
    await supabase.from('expenses').delete().eq('id', expenseId);
  });
}

export async function loadExpenses(tripId: string): Promise<TripExpenseLocal[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.expenses || [];
}

// ── Journal ─────────────────────────────────────────────────────────────

export async function saveJournal(
  tripId: string,
  day: number,
  entry: { text: string; mood?: string; photos?: string[] },
): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    if (entry.text) blob.journalEntries[day] = entry.text;
    if (entry.mood !== undefined) {
      if (entry.mood) blob.journalMoods[day] = entry.mood;
      else delete blob.journalMoods[day];
    }
    if (entry.photos) blob.journalPhotos[day] = entry.photos;
    await saveTripLocally(tripId, blob);
  }

  supabaseSafe(async () => {
    const deviceId = await getDeviceId();
    await supabase.from('journal_entries').upsert({
      trip_id: tripId,
      day,
      text: entry.text,
      mood: entry.mood || null,
      photos: entry.photos || [],
      created_by: deviceId,
    } as any, { onConflict: 'trip_id,day' });
  });
}

export async function loadJournal(tripId: string): Promise<{
  entries: Record<number, string>;
  moods: Record<number, string>;
  photos: Record<number, string[]>;
}> {
  const blob = await loadTripLocally(tripId);
  return {
    entries: blob?.journalEntries || {},
    moods: blob?.journalMoods || {},
    photos: blob?.journalPhotos || {},
  };
}

// ── Packing ─────────────────────────────────────────────────────────────

export async function savePackingItems(tripId: string, items: PackingItemLocal[]): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.packingItems = items;
    await saveTripLocally(tripId, blob);
  }

  supabaseSafe(async () => {
    const deviceId = await getDeviceId();
    await supabase.from('packing_items').delete().eq('trip_id', tripId);
    if (items.length > 0) {
      await supabase.from('packing_items').insert(
        items.map(item => ({
          id: item.id,
          trip_id: tripId,
          user_id: deviceId,
          name: item.name,
          emoji: item.emoji,
          category: item.category,
          packed: item.packed,
        })) as any
      );
    }
  });
}

export async function loadPackingItems(tripId: string): Promise<PackingItemLocal[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.packingItems || [];
}

// ── Polls ──────────────────────────────────────────────────────────────

export async function savePolls(tripId: string, polls: import('./storageCache').PollLocal[]): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.polls = polls;
    await saveTripLocally(tripId, blob);
  }
}

export async function loadPolls(tripId: string): Promise<import('./storageCache').PollLocal[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.polls || [];
}

// ── Activity Log ───────────────────────────────────────────────────────

export async function addActivityLog(
  tripId: string,
  entry: import('./storageCache').ActivityLogEntry,
): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.activityLog = blob.activityLog || [];
    blob.activityLog.unshift(entry);
    // Keep max 100 entries
    if (blob.activityLog.length > 100) blob.activityLog = blob.activityLog.slice(0, 100);
    await saveTripLocally(tripId, blob);
  }
}

export async function loadActivityLog(tripId: string): Promise<import('./storageCache').ActivityLogEntry[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.activityLog || [];
}

// ── Chat Messages ──────────────────────────────────────────────────────

export async function addChatMessage(
  tripId: string,
  message: import('./storageCache').ChatMessageLocal,
): Promise<void> {
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.chatMessages = blob.chatMessages || [];
    blob.chatMessages.push(message);
    await saveTripLocally(tripId, blob);
  }

  supabaseSafe(async () => {
    await supabase.from('chat_messages').insert({
      id: message.id,
      trip_id: tripId,
      user_id: message.userId,
      user_name: message.userName,
      text: message.text,
    } as any);
  });
}

export async function loadChatMessages(tripId: string): Promise<import('./storageCache').ChatMessageLocal[]> {
  const blob = await loadTripLocally(tripId);
  return blob?.chatMessages || [];
}

// ── User Role ───────────────────────────────────────────────────────────

export async function getUserRole(tripId: string): Promise<import('../utils/permissions').TripRole> {
  const deviceId = await getDeviceId();
  const blob = await loadTripLocally(tripId);
  if (!blob?.members) return 'organizer'; // creator defaults to organizer
  const me = blob.members.find(m => m.userId === deviceId);
  return (me?.role as import('../utils/permissions').TripRole) || 'organizer';
}

// ── Trip Visibility ─────────────────────────────────────────────────────

export async function setTripVisibility(
  tripId: string,
  visibility: import('./storageCache').TripVisibility,
): Promise<void> {
  // Update in trip blob
  const blob = await loadTripLocally(tripId);
  if (blob) {
    blob.meta.visibility = visibility;
    await saveTripLocally(tripId, blob);
  }
  // Update in trips index
  const index = await loadTripsIndex();
  const updated = index.map(t => t.id === tripId ? { ...t, visibility } : t);
  await saveTripsIndex(updated);
}

export async function getTripVisibility(tripId: string): Promise<import('./storageCache').TripVisibility> {
  const blob = await loadTripLocally(tripId);
  return blob?.meta.visibility || 'private';
}
