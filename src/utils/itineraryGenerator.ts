/**
 * TraiMate — AI Itinerary Generator
 * Maps trip params → ITINERARY_DB → structured itinerary
 */

import { ITINERARY_DB, Activity, CATEGORY_ICONS } from '../constants/aiData';

// ─── Types ─────────────────────────────────────────────────────────────────
export type ActivityType =
  | 'hotel' | 'food' | 'sightseeing' | 'culture'
  | 'activity' | 'beach' | 'nightlife' | 'wellness'
  | 'shopping' | 'transport';

export interface ItineraryItem {
  id: string;
  time: string;          // "14:00"
  title: string;
  emoji: string;
  type: ActivityType;
  duration?: string;     // "1h", "2.5h"
  location?: string;     // "Le Marais, 4th"
  aiTip?: string;        // AI insight
  notes?: string;        // User notes
  source: 'ai' | 'manual';
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;     // 1-indexed
  title: string;         // "Arrival Day"
  date?: string;         // ISO date string
  items: ItineraryItem[];
}

export type ItineraryStatus = 'empty' | 'generating' | 'ready';

// ─── Destination key mapping ───────────────────────────────────────────────
const DEST_KEY_MAP: Record<string, string[]> = {
  paris:   ['paris', 'france'],
  bali:    ['bali', 'ubud', 'indonesia'],
  tokyo:   ['tokyo', 'japan', 'kyoto'],
  dubai:   ['dubai', 'uae', 'abu dhabi'],
  goa:     ['goa'],
  bangkok: ['bangkok', 'thai'],
};

export function getDestinationKey(destination: string): string | null {
  const d = destination.toLowerCase();
  for (const [key, keywords] of Object.entries(DEST_KEY_MAP)) {
    if (keywords.some(kw => d.includes(kw))) return key;
  }
  return null;
}

// ─── Trip duration calc ────────────────────────────────────────────────────
export function getTripDuration(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 3; // default
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return Math.max(1, Math.min(days, 14));
  } catch {
    return 3;
  }
}

// ─── ID generator ──────────────────────────────────────────────────────────
let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `itm_${Date.now()}_${idCounter}`;
}

// ─── Day title generator ───────────────────────────────────────────────────
const MID_TITLES = [
  'Full Day Exploring',
  'Deep Dive Day',
  'Adventure Mode',
  'Local Immersion',
  'Culture & Vibes',
  'Free Roam Day',
  'Off-the-Grid',
  'Hidden Gems Day',
  'Squad Picks',
  'Best of the City',
];

function getDayTitle(index: number, total: number): string {
  if (index === 0) return 'Arrival Day';
  if (index === total - 1 && total > 1) return 'Last Day';
  return MID_TITLES[(index - 1) % MID_TITLES.length];
}

// ─── Style → activity type mapping for filtering ───────────────────────────
const STYLE_TYPE_MAP: Record<string, string[]> = {
  adventure:    ['activity', 'sightseeing', 'transport'],
  relaxation:   ['beach', 'wellness', 'hotel'],
  cultural:     ['culture', 'sightseeing'],
  culture:      ['culture', 'sightseeing'],
  foodie:       ['food', 'shopping'],
  wellness:     ['wellness', 'beach'],
  'road-trip':  ['transport', 'sightseeing', 'activity'],
  nightlife:    ['nightlife', 'food'],
  beach:        ['beach', 'wellness'],
  shopping:     ['shopping', 'food'],
  photography:  ['sightseeing', 'culture'],
};

function filterByStyles(activities: Activity[], styles: string[]): Activity[] {
  if (!styles || styles.length === 0) return activities;

  const preferredTypes = new Set<string>();
  for (const s of styles) {
    const types = STYLE_TYPE_MAP[s.toLowerCase().trim()];
    if (types) types.forEach(t => preferredTypes.add(t));
  }

  if (preferredTypes.size === 0) return activities;

  // Always keep essential types + preferred; random 50% for others
  return activities.filter(a => {
    if (a.tp === 'hotel' || a.tp === 'transport') return true;
    if (a.tp === 'food') return true;
    if (preferredTypes.has(a.tp)) return true;
    // Keep ~40% of non-matched for variety
    return (a.tl.length + a.t.charCodeAt(0)) % 5 > 2; // deterministic "random"
  });
}

// ─── Convert DB Activity → app ItineraryItem ──────────────────────────────
function convertActivity(activity: Activity): ItineraryItem {
  return {
    id: genId(),
    time: activity.t,
    title: activity.tl,
    emoji: activity.i || CATEGORY_ICONS[activity.tp] || '📍',
    type: activity.tp as ActivityType,
    duration: activity.dr,
    location: activity.l,
    aiTip: activity.ai,
    source: 'ai',
  };
}

// ─── Main generator ────────────────────────────────────────────────────────
export interface GenerateParams {
  destination: string;
  startDate: string;
  endDate: string;
  styles: string[];
  tripType: 'solo' | 'group';
}

export function generateItinerary(params: GenerateParams): ItineraryDay[] {
  const destKey = getDestinationKey(params.destination);
  const tripDuration = getTripDuration(params.startDate, params.endDate);
  const startDate = params.startDate ? new Date(params.startDate) : null;

  // No match in DB — create empty days for manual building
  if (!destKey || !ITINERARY_DB[destKey]) {
    return createEmptyDays(tripDuration, startDate);
  }

  const dbDays = ITINERARY_DB[destKey];
  const dbDayNumbers = Object.keys(dbDays).map(Number).sort((a, b) => a - b);

  const result: ItineraryDay[] = [];

  for (let i = 0; i < tripDuration; i++) {
    // Cycle through DB days if trip is longer
    const dbDayNum = dbDayNumbers[i % dbDayNumbers.length];
    const dbActivities = dbDays[dbDayNum] || [];

    // Filter by trip styles
    const filtered = filterByStyles(dbActivities, params.styles);

    const dayDate = startDate
      ? new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      : null;

    result.push({
      id: genId(),
      dayNumber: i + 1,
      title: getDayTitle(i, tripDuration),
      date: dayDate ? dayDate.toISOString() : undefined,
      items: filtered.map(convertActivity),
    });
  }

  return result;
}

// ─── Create empty day shells ───────────────────────────────────────────────
export function createEmptyDays(
  numDays: number,
  startDate: Date | null = null,
): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  for (let i = 0; i < numDays; i++) {
    const dayDate = startDate
      ? new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      : null;
    days.push({
      id: genId(),
      dayNumber: i + 1,
      title: getDayTitle(i, numDays),
      date: dayDate ? dayDate.toISOString() : undefined,
      items: [],
    });
  }
  return days;
}

// ─── Create a single new empty day ─────────────────────────────────────────
export function createNewDay(dayNumber: number, title?: string): ItineraryDay {
  return {
    id: genId(),
    dayNumber,
    title: title || `Day ${dayNumber}`,
    items: [],
  };
}

// ─── Create a new manual item ──────────────────────────────────────────────
export function createNewItem(partial: {
  title: string;
  type: ActivityType;
  time?: string;
  duration?: string;
  location?: string;
  notes?: string;
  emoji?: string;
}): ItineraryItem {
  return {
    id: genId(),
    time: partial.time || '12:00',
    title: partial.title,
    emoji: partial.emoji || CATEGORY_ICONS[partial.type] || '📍',
    type: partial.type,
    duration: partial.duration,
    location: partial.location,
    notes: partial.notes,
    source: 'manual',
  };
}
