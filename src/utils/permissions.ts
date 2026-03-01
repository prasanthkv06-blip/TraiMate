/**
 * Role-based permission system for trips.
 * 4-tier: organizer → co-organizer → member → viewer
 */

export type TripRole = 'organizer' | 'co-organizer' | 'member' | 'viewer';

export interface RolePermission {
  canEditTrip: boolean;
  canInvite: boolean;
  canRemoveMembers: boolean;
  canDeleteTrip: boolean;
  canChangeRoles: boolean;
  canEditItinerary: boolean;
  canEditExpenses: boolean;
  canEditJournal: boolean;
  canVote: boolean;
}

export const RolePermissions: Record<TripRole, RolePermission> = {
  organizer: {
    canEditTrip: true,
    canInvite: true,
    canRemoveMembers: true,
    canDeleteTrip: true,
    canChangeRoles: true,
    canEditItinerary: true,
    canEditExpenses: true,
    canEditJournal: true,
    canVote: true,
  },
  'co-organizer': {
    canEditTrip: true,
    canInvite: true,
    canRemoveMembers: false,
    canDeleteTrip: false,
    canChangeRoles: false,
    canEditItinerary: true,
    canEditExpenses: true,
    canEditJournal: true,
    canVote: true,
  },
  member: {
    canEditTrip: false,
    canInvite: true,
    canRemoveMembers: false,
    canDeleteTrip: false,
    canChangeRoles: false,
    canEditItinerary: true,
    canEditExpenses: true,
    canEditJournal: true,
    canVote: true,
  },
  viewer: {
    canEditTrip: false,
    canInvite: false,
    canRemoveMembers: false,
    canDeleteTrip: false,
    canChangeRoles: false,
    canEditItinerary: false,
    canEditExpenses: false,
    canEditJournal: false,
    canVote: false,
  },
};

export function hasPermission(
  userRole: TripRole,
  action: keyof RolePermission,
): boolean {
  return RolePermissions[userRole]?.[action] ?? false;
}

export const ROLE_INFO: Record<TripRole, { label: string; emoji: string; desc: string }> = {
  organizer:      { label: 'Organizer',    emoji: '👑', desc: 'Full control' },
  'co-organizer': { label: 'Co-organizer', emoji: '⭐', desc: 'Can edit trip' },
  member:         { label: 'Member',       emoji: '🎒', desc: 'Can vote & add' },
  viewer:         { label: 'Viewer',       emoji: '👁️', desc: 'View only' },
};
