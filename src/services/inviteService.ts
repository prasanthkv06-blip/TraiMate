/**
 * Invitation service — offline-first with optional Supabase sync.
 * Pattern: write to AsyncStorage immediately → attempt Supabase sync in background.
 */
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { getDeviceId, getCurrentUserId } from './deviceUser';
import {
  addInvitationLocally,
  getInvitationByCode,
  updateInvitationLocally,
  loadInvitationsLocally,
  loadTripLocally,
  saveTripLocally,
  loadTripsIndex,
  saveTripsIndex,
  type InvitationLocal,
  type TripMemberLocal,
  type TripBlob,
} from './storageCache';

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

async function generateInviteCode(): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = await Crypto.getRandomBytesAsync(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ── Create invitation ───────────────────────────────────────────────────

export interface CreateInvitationInput {
  tripId: string;
  tripName: string;
  destination: string;
  role?: InvitationLocal['role'];
  invitedEmail?: string | null;
  invitedPhone?: string | null;
}

export async function createInvitation(input: CreateInvitationInput): Promise<InvitationLocal> {
  const deviceId = await getCurrentUserId();
  const id = Crypto.randomUUID();
  const inviteCode = await generateInviteCode();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const invitation: InvitationLocal = {
    id,
    tripId: input.tripId,
    inviteCode,
    inviterId: deviceId,
    invitedEmail: input.invitedEmail || null,
    invitedPhone: input.invitedPhone || null,
    role: input.role || 'member',
    status: 'pending',
    expiresAt,
    acceptedAt: null,
    createdAt: now,
    tripName: input.tripName,
    destination: input.destination,
  };

  // Save locally
  await addInvitationLocally(invitation);

  // Also save to trip blob
  const blob = await loadTripLocally(input.tripId);
  if (blob) {
    blob.invitations = blob.invitations || [];
    blob.invitations.push(invitation);
    await saveTripLocally(input.tripId, blob);
  }

  // Background Supabase sync
  supabaseSafe(async () => {
    await supabase.from('trip_invitations').insert({
      id,
      trip_id: input.tripId,
      invite_code: inviteCode,
      inviter_id: deviceId,
      invited_email: input.invitedEmail || null,
      invited_phone: input.invitedPhone || null,
      role: input.role || 'member',
      status: 'pending',
      expires_at: expiresAt,
    } as any);
  });

  return invitation;
}

// ── Get invitation by code ──────────────────────────────────────────────

export async function getInvitation(inviteCode: string): Promise<InvitationLocal | null> {
  // Try Supabase first for latest
  const remote = await supabaseSafe(async () => {
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('*, trips(*)')
      .eq('invite_code', inviteCode)
      .single();
    if (error || !data) return null;
    const row = data as any;
    return {
      id: row.id,
      tripId: row.trip_id,
      inviteCode: row.invite_code,
      inviterId: row.inviter_id,
      invitedEmail: row.invited_email,
      invitedPhone: row.invited_phone,
      role: row.role,
      status: row.status,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
      tripName: row.trips?.name || '',
      destination: row.trips?.destination || '',
    } as InvitationLocal;
  });

  if (remote) return remote;

  // Fallback to local
  return getInvitationByCode(inviteCode);
}

// ── Get invitations for a trip ──────────────────────────────────────────

export async function getInvitationsForTrip(tripId: string): Promise<InvitationLocal[]> {
  const all = await loadInvitationsLocally();
  return all.filter(i => i.tripId === tripId);
}

// ── Accept invitation ───────────────────────────────────────────────────

export interface AcceptResult {
  success: boolean;
  error?: string;
  tripId?: string;
  tripName?: string;
  destination?: string;
}

export async function acceptInvitation(inviteCode: string): Promise<AcceptResult> {
  const invitation = await getInvitation(inviteCode);
  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `Invitation already ${invitation.status}` };
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await updateInvitationLocally(inviteCode, { status: 'expired' });
    supabaseSafe(async () => {
      await (supabase
        .from('trip_invitations') as any)
        .update({ status: 'expired' })
        .eq('invite_code', inviteCode);
    });
    return { success: false, error: 'Invitation has expired' };
  }

  const deviceId = await getCurrentUserId();
  const now = new Date().toISOString();

  // Update invitation status
  await updateInvitationLocally(inviteCode, {
    status: 'accepted',
    acceptedAt: now,
  });

  // Add this device as a trip member locally
  const blob = await loadTripLocally(invitation.tripId);
  if (blob) {
    blob.members = blob.members || [];
    const alreadyMember = blob.members.some(m => m.userId === deviceId);
    if (!alreadyMember) {
      blob.members.push({
        id: Crypto.randomUUID(),
        userId: deviceId,
        name: 'You',
        role: invitation.role,
        joinedAt: now,
      });
      blob.meta.memberCount = (blob.meta.memberCount || 1) + 1;
      await saveTripLocally(invitation.tripId, blob);

      // Also update the trips index
      const index = await loadTripsIndex();
      const tripIndex = index.findIndex(t => t.id === invitation.tripId);
      if (tripIndex >= 0) {
        index[tripIndex].memberCount = blob.meta.memberCount;
        await saveTripsIndex(index);
      }
    }
  } else {
    // Trip doesn't exist locally — create a basic entry so it shows up
    const newBlob: TripBlob = {
      meta: {
        id: invitation.tripId,
        name: invitation.tripName,
        destination: invitation.destination,
        emoji: '🌍',
        startDate: null,
        endDate: null,
        coverImage: null,
        phase: 'planning',
        createdBy: invitation.inviterId,
        createdAt: invitation.createdAt,
        memberCount: 2,
      },
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
        role: invitation.role,
        joinedAt: now,
      }],
    };
    await saveTripLocally(invitation.tripId, newBlob);

    // Add to trips index
    const index = await loadTripsIndex();
    if (!index.some(t => t.id === invitation.tripId)) {
      index.unshift(newBlob.meta);
      await saveTripsIndex(index);
    }
  }

  // Background Supabase sync
  supabaseSafe(async () => {
    await (supabase
      .from('trip_invitations') as any)
      .update({ status: 'accepted', accepted_at: now })
      .eq('invite_code', inviteCode);

    await supabase.from('trip_members').insert({
      trip_id: invitation.tripId,
      user_id: deviceId,
      role: invitation.role,
      invited_by: invitation.inviterId,
    } as any);
  });

  return {
    success: true,
    tripId: invitation.tripId,
    tripName: invitation.tripName,
    destination: invitation.destination,
  };
}

// ── Decline invitation ──────────────────────────────────────────────────

export async function declineInvitation(inviteCode: string): Promise<void> {
  await updateInvitationLocally(inviteCode, { status: 'declined' });

  supabaseSafe(async () => {
    await (supabase
      .from('trip_invitations') as any)
      .update({ status: 'declined' })
      .eq('invite_code', inviteCode);
  });
}

// ── Generate share messages ─────────────────────────────────────────────

export function generateShareMessage(opts: {
  tripName: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  inviterName?: string;
  inviteCode: string;
}): string {
  const formatDate = (iso?: string) => {
    if (!iso) return 'TBD';
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getDate()} ${months[d.getMonth()]}`;
    } catch {
      return iso;
    }
  };

  const inviteLink = `traimate.app/join/${opts.inviteCode}`;
  const dates = `${formatDate(opts.startDate)} - ${formatDate(opts.endDate)}`;

  return (
    `🏝️ Join ${opts.inviterName || 'me'} on "${opts.tripName}"!\n\n` +
    `📍 ${opts.destination}\n` +
    `📅 ${dates}\n\n` +
    `Tap to join: ${inviteLink}\n\n` +
    `via TrailMate Travel App`
  );
}

export function generateWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function generateSmsUrl(message: string, phone?: string): string {
  const to = phone ? phone.replace(/\s/g, '') : '';
  return Platform_getSmsUrl(to, message);
}

function Platform_getSmsUrl(to: string, body: string): string {
  // iOS uses &body= , Android uses ?body=
  // Use the cross-platform format that works on both
  if (to) {
    return `sms:${to}?body=${encodeURIComponent(body)}`;
  }
  return `sms:?body=${encodeURIComponent(body)}`;
}

export function generateEmailUrl(opts: {
  subject: string;
  body: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  params.set('subject', opts.subject);
  params.set('body', opts.body);
  const toStr = opts.to ? opts.to : '';
  return `mailto:${toStr}?${params.toString()}`;
}
