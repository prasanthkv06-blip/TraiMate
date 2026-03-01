/**
 * AsyncStorage-based persistence for trip data.
 * Each trip is serialized under `@traimate_trip_{id}`.
 * A trips index stores metadata for listing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItineraryDay } from '../utils/itineraryGenerator';

const TRIPS_INDEX_KEY = '@traimate_trips_index';
const INVITATIONS_KEY = '@traimate_invitations';
const tripKey = (id: string) => `@traimate_trip_${id}`;

// ── Trip index (list of trip metadata) ──────────────────────────────────

export type TripVisibility = 'public' | 'private' | 'secret';

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
  visibility?: TripVisibility;
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

export interface InvitationLocal {
  id: string;
  tripId: string;
  inviteCode: string;
  inviterId: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  role: 'organizer' | 'co-organizer' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  tripName: string;
  destination: string;
}

export interface TripBlob {
  meta: TripIndexEntry;
  itinerary: ItineraryDay[];
  expenses: TripExpenseLocal[];
  journalEntries: Record<number, string>;
  journalMoods: Record<number, string>;
  journalPhotos: Record<number, string[]>;
  packingItems: PackingItemLocal[];
  invitations?: InvitationLocal[];
  members?: TripMemberLocal[];
  polls?: PollLocal[];
  activityLog?: ActivityLogEntry[];
  chatMessages?: ChatMessageLocal[];
}

export interface TripMemberLocal {
  id: string;
  userId: string;
  name: string;
  role: 'organizer' | 'co-organizer' | 'member' | 'viewer';
  joinedAt: string;
}

export interface PollOptionLocal {
  id: string;
  text: string;
  votes: string[];
}

export interface PollLocal {
  id: string;
  question: string;
  emoji: string;
  options: PollOptionLocal[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  actionType: 'member_joined' | 'expense_added' | 'itinerary_updated' | 'poll_created' | 'poll_voted' | 'journal_added' | 'trip_updated' | 'packing_updated' | 'booking_added' | 'chat_message';
  details: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessageLocal {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
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
  assignedTo?: string; // user name or 'Everyone'
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

// ── Invitations (global list, not per-trip) ──────────────────────────────

export async function saveInvitationsLocally(invitations: InvitationLocal[]): Promise<void> {
  await AsyncStorage.setItem(INVITATIONS_KEY, JSON.stringify(invitations));
}

export async function loadInvitationsLocally(): Promise<InvitationLocal[]> {
  const raw = await AsyncStorage.getItem(INVITATIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addInvitationLocally(invitation: InvitationLocal): Promise<void> {
  const existing = await loadInvitationsLocally();
  // Prevent duplicates by invite code
  const filtered = existing.filter(i => i.inviteCode !== invitation.inviteCode);
  filtered.unshift(invitation);
  await saveInvitationsLocally(filtered);
}

export async function updateInvitationLocally(
  inviteCode: string,
  updates: Partial<InvitationLocal>,
): Promise<void> {
  const existing = await loadInvitationsLocally();
  const updated = existing.map(i =>
    i.inviteCode === inviteCode ? { ...i, ...updates } : i
  );
  await saveInvitationsLocally(updated);
}

export async function getInvitationByCode(inviteCode: string): Promise<InvitationLocal | null> {
  const all = await loadInvitationsLocally();
  return all.find(i => i.inviteCode === inviteCode) || null;
}
