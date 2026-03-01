/**
 * TrailMate — Recap (Review) Tab Helpers
 * AI-generated trip reports, settlement calculations, blog/reel content, leaderboard
 */

import { CURRENCY_MAP, CATEGORY_IONICONS, CATEGORY_COLORS } from '../constants/aiData';

// ── Types ──────────────────────────────────────────────────────────────

export interface TripExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  splitWith: string[];
  date: string;
  receiptUri?: string;
}

export interface JournalEntry {
  day: number;
  text: string;
  mood?: string;
  photos: string[];
}

export interface ItineraryItemBasic {
  title: string;
  time: string;
  type: string;
  location?: string;
  duration?: string;
}

export interface TripMember {
  id: string;
  name: string;
  initial: string;
  color: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface MemberBalance {
  name: string;
  initial: string;
  color: string;
  paid: number;
  share: number;
  balance: number; // positive = gets back, negative = owes
}

export interface SpendingInsight {
  icon: string; // Ionicon name
  title: string;
  detail: string;
  color: string;
}

export interface TripHighlight {
  icon: string;
  title: string;
  description: string;
  metric?: string;
}

export interface LeaderboardEntry {
  name: string;
  initial: string;
  color: string;
  stat: string;
  value: number;
  badge: string; // Ionicon name
  badgeColor: string;
  rank: number;
}

export interface ShareFormat {
  key: string;
  label: string;
  icon: string; // Ionicon name
  description: string;
  gradient: readonly [string, string];
}

export interface MapLocation {
  name: string;
  type: string;
  day: number;
  order: number;
}

export interface TripReportData {
  totalSpent: number;
  avgPerDay: number;
  topCategory: { name: string; amount: number; pct: number };
  categoryBreakdown: { category: string; amount: number; pct: number; icon: string; color: string }[];
  savingsVsSimilar: number;
  highlights: TripHighlight[];
  insights: SpendingInsight[];
  nextTripTips: string[];
  tripScore: number; // 0-100
}

// ── Sample Expense Data (used when no real data exists) ────────────────

export const SAMPLE_EXPENSES: TripExpense[] = [
  { id: '1', title: 'Hotel Check-in', amount: 8500, category: 'hotel', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 1' },
  { id: '2', title: 'Airport Transfer', amount: 1200, category: 'transport', paidBy: 'Alex', splitWith: ['You', 'Sam', 'Jordan'], date: 'Day 1' },
  { id: '3', title: 'Welcome Dinner', amount: 3200, category: 'food', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 1' },
  { id: '4', title: 'Temple Entry Tickets', amount: 800, category: 'activity', paidBy: 'Sam', splitWith: ['You', 'Alex', 'Jordan'], date: 'Day 2' },
  { id: '5', title: 'Lunch at Local Spot', amount: 1800, category: 'food', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 2' },
  { id: '6', title: 'Scooter Rental', amount: 600, category: 'transport', paidBy: 'Jordan', splitWith: ['You', 'Alex', 'Sam'], date: 'Day 2' },
  { id: '7', title: 'Night Market Shopping', amount: 2400, category: 'shopping', paidBy: 'Alex', splitWith: ['You', 'Sam'], date: 'Day 2' },
  { id: '8', title: 'Hotel Night 2', amount: 8500, category: 'hotel', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 3' },
  { id: '9', title: 'Spa & Wellness', amount: 4000, category: 'activity', paidBy: 'Sam', splitWith: ['You', 'Alex', 'Jordan'], date: 'Day 3' },
  { id: '10', title: 'Beach Club Entry', amount: 2000, category: 'nightlife', paidBy: 'Jordan', splitWith: ['You', 'Alex', 'Sam'], date: 'Day 3' },
  { id: '11', title: 'Sunset Cruise', amount: 6000, category: 'activity', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 4' },
  { id: '12', title: 'Brunch', amount: 2200, category: 'food', paidBy: 'Alex', splitWith: ['You', 'Sam', 'Jordan'], date: 'Day 4' },
  { id: '13', title: 'Souvenir Shopping', amount: 3500, category: 'shopping', paidBy: 'You', splitWith: [], date: 'Day 4' },
  { id: '14', title: 'Farewell Dinner', amount: 4800, category: 'food', paidBy: 'You', splitWith: ['Alex', 'Sam', 'Jordan'], date: 'Day 5' },
  { id: '15', title: 'Airport Drop', amount: 1400, category: 'transport', paidBy: 'Jordan', splitWith: ['You', 'Alex', 'Sam'], date: 'Day 5' },
];

export const SAMPLE_MEMBERS: TripMember[] = [
  { id: '0', name: 'You', initial: 'Y', color: '#B07A50' },
  { id: '1', name: 'Alex', initial: 'A', color: '#5E8A5A' },
  { id: '2', name: 'Sam', initial: 'S', color: '#4A8BA8' },
  { id: '3', name: 'Jordan', initial: 'J', color: '#8B6DB5' },
];

export const SAMPLE_JOURNALS: JournalEntry[] = [
  { day: 1, text: 'Finally arrived! The warm breeze hit us as we stepped out of the airport. The drive to the hotel was filled with palm trees and vibrant colours. This is exactly what we needed — a complete escape from reality.', mood: 'amazing', photos: [] },
  { day: 2, text: 'What a day! The temple was absolutely breathtaking at sunrise. We found this incredible local food spot that the hotel recommended — the flavours were out of this world. Night market was chaotic but SO fun.', mood: 'amazing', photos: [] },
  { day: 3, text: 'Took it slow today. The spa was heavenly. Spent the afternoon at the beach club — the music, the vibes, the sunset. Pure bliss. Starting to feel like we need another week here.', mood: 'good', photos: [] },
  { day: 4, text: 'The sunset cruise was hands down the highlight of the entire trip. Watching the sun dip below the horizon from the boat with the crew — unforgettable. Alex found the BEST brunch spot too.', mood: 'amazing', photos: [] },
  { day: 5, text: 'Last day. Nobody wanted to leave. Had the most emotional farewell dinner — lots of laughs, a few tears, and promises to do this again soon. Already missing this place on the way to the airport.', mood: 'tired', photos: [] },
];

// ── Settlement Calculator ──────────────────────────────────────────────

export function calculateSettlements(
  expenses: TripExpense[],
  members: TripMember[],
): { balances: MemberBalance[]; settlements: Settlement[]; totalSpent: number; perPerson: number } {
  const memberNames = members.map(m => m.name);
  const paidMap: Record<string, number> = {};
  const owedMap: Record<string, number> = {};

  memberNames.forEach(name => {
    paidMap[name] = 0;
    owedMap[name] = 0;
  });

  let totalSpent = 0;

  expenses.forEach(exp => {
    totalSpent += exp.amount;
    if (paidMap[exp.paidBy] !== undefined) {
      paidMap[exp.paidBy] += exp.amount;
    }

    const splitMembers = exp.splitWith.length > 0
      ? [...new Set([exp.paidBy, ...exp.splitWith])].filter(n => memberNames.includes(n))
      : [exp.paidBy];

    const sharePerPerson = exp.amount / splitMembers.length;
    splitMembers.forEach(name => {
      if (owedMap[name] !== undefined) {
        owedMap[name] += sharePerPerson;
      }
    });
  });

  const balances: MemberBalance[] = members.map(m => {
    const paid = paidMap[m.name] || 0;
    const share = owedMap[m.name] || 0;
    return {
      name: m.name,
      initial: m.initial,
      color: m.color,
      paid,
      share,
      balance: paid - share,
    };
  });

  // Calculate optimal settlements (simplified: greedy)
  const settlements: Settlement[] = [];
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ name: b.name, amount: Math.abs(b.balance) }));
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ name: b.name, amount: b.balance }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].amount, creditors[ci].amount);
    if (amount > 1) {
      settlements.push({
        from: debtors[di].name,
        to: creditors[ci].name,
        amount: Math.round(amount),
      });
    }
    debtors[di].amount -= amount;
    creditors[ci].amount -= amount;
    if (debtors[di].amount < 1) di++;
    if (creditors[ci].amount < 1) ci++;
  }

  const perPerson = memberNames.length > 0 ? totalSpent / memberNames.length : 0;

  return { balances, settlements, totalSpent, perPerson };
}

// ── AI Trip Report Generator ───────────────────────────────────────────

export function generateTripReport(
  expenses: TripExpense[],
  members: TripMember[],
  dayCount: number,
  destination: string,
  currencySymbol: string = '₹',
): TripReportData {
  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  let totalSpent = 0;

  expenses.forEach(exp => {
    totalSpent += exp.amount;
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const categoryBreakdown = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      pct: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      icon: CATEGORY_IONICONS[cat] || 'cube',
      color: CATEGORY_COLORS[cat] || '#888',
    }));

  const topCategory = categoryBreakdown[0] || { category: 'none', amount: 0, pct: 0 };
  const avgPerDay = dayCount > 0 ? totalSpent / dayCount : 0;

  // Simulated savings comparison
  const avgTripCost = totalSpent * 1.18; // simulate 18% more for "similar trips"
  const savingsVsSimilar = Math.round(avgTripCost - totalSpent);

  // Generate highlights
  const highlights: TripHighlight[] = [
    {
      icon: 'flame',
      title: 'Most Active Day',
      description: `Day ${Math.min(2, dayCount)} was packed with ${Math.min(5, expenses.length)} activities`,
      metric: `${Math.min(5, expenses.length)} activities`,
    },
    {
      icon: 'restaurant',
      title: 'Foodie Score',
      description: `${categoryTotals['food'] ? Math.round((categoryTotals['food'] / totalSpent) * 100) : 25}% of your budget went to amazing food`,
      metric: 'Top category',
    },
    {
      icon: 'people',
      title: 'Squad Goals',
      description: `${members.length} travellers, ${expenses.length} shared experiences`,
      metric: `${members.length} mates`,
    },
    {
      icon: 'trophy',
      title: 'Budget Champion',
      description: `You saved an estimated ${currencySymbol}${savingsVsSimilar.toLocaleString()} vs similar trips to ${destination}`,
      metric: `${currencySymbol}${savingsVsSimilar.toLocaleString()} saved`,
    },
  ];

  // Spending insights
  const insights: SpendingInsight[] = [];

  if (categoryTotals['food'] && categoryTotals['food'] / totalSpent > 0.3) {
    insights.push({
      icon: 'restaurant',
      title: 'Foodie Alert',
      detail: `You spent ${Math.round((categoryTotals['food'] / totalSpent) * 100)}% on food — you clearly have great taste!`,
      color: CATEGORY_COLORS['food'],
    });
  }

  if (categoryTotals['hotel'] && categoryTotals['hotel'] / totalSpent > 0.35) {
    insights.push({
      icon: 'bed',
      title: 'Comfort First',
      detail: 'Accommodation was your biggest expense. Consider homestays next time for savings.',
      color: CATEGORY_COLORS['hotel'],
    });
  }

  insights.push({
    icon: 'trending-down',
    title: 'Smart Spender',
    detail: `Your avg daily spend of ${currencySymbol}${Math.round(avgPerDay).toLocaleString()} is ${savingsVsSimilar > 0 ? 'below' : 'above'} average for ${destination}.`,
    color: Colors_sage,
  });

  insights.push({
    icon: 'wallet',
    title: 'Group Advantage',
    detail: `Splitting costs among ${members.length} people saved each person significantly on shared expenses.`,
    color: '#4A8BA8',
  });

  // Next trip tips
  const nextTripTips = [
    `Book ${destination} accommodations 2-3 months early for 20-30% savings`,
    'Use a shared expense tracker from Day 1 to avoid settlement confusion',
    'Allocate 15-20% of budget as a "spontaneous fun" fund',
    `Travel to ${destination} during shoulder season for fewer crowds and lower prices`,
    'Pre-book popular attractions online to skip queues and sometimes get discounts',
  ];

  // Trip score (gamified — based on activity diversity, journal coverage, etc.)
  const categoryDiversity = Math.min(categoryBreakdown.length / 5, 1) * 25;
  const expenseTracking = Math.min(expenses.length / (dayCount * 3), 1) * 25;
  const teamwork = Math.min(members.length / 4, 1) * 25;
  const budgetScore = savingsVsSimilar > 0 ? 25 : Math.max(0, 25 - Math.abs(savingsVsSimilar / totalSpent) * 50);
  const tripScore = Math.round(categoryDiversity + expenseTracking + teamwork + budgetScore);

  return {
    totalSpent,
    avgPerDay,
    topCategory: { name: topCategory.category, amount: topCategory.amount, pct: topCategory.pct },
    categoryBreakdown,
    savingsVsSimilar,
    highlights,
    insights,
    nextTripTips,
    tripScore: Math.min(tripScore, 100),
  };
}

// ── Leaderboard Generator ──────────────────────────────────────────────

export function generateLeaderboard(
  expenses: TripExpense[],
  members: TripMember[],
  journals: JournalEntry[],
  currencySymbol: string = '₹',
): LeaderboardEntry[] {
  const paidMap: Record<string, number> = {};
  const expCountMap: Record<string, number> = {};
  const categoryMap: Record<string, Set<string>> = {};

  members.forEach(m => {
    paidMap[m.name] = 0;
    expCountMap[m.name] = 0;
    categoryMap[m.name] = new Set();
  });

  expenses.forEach(exp => {
    if (paidMap[exp.paidBy] !== undefined) {
      paidMap[exp.paidBy] += exp.amount;
      expCountMap[exp.paidBy] = (expCountMap[exp.paidBy] || 0) + 1;
      categoryMap[exp.paidBy]?.add(exp.category);
    }
  });

  const entries: LeaderboardEntry[] = [];

  // Big Spender
  const bigSpender = Object.entries(paidMap).sort(([, a], [, b]) => b - a)[0];
  if (bigSpender) {
    const member = members.find(m => m.name === bigSpender[0])!;
    entries.push({
      name: member.name, initial: member.initial, color: member.color,
      stat: `${currencySymbol}${bigSpender[1].toLocaleString()} paid`,
      value: bigSpender[1], badge: 'cash', badgeColor: '#E67E22', rank: 1,
    });
  }

  // Budget Keeper (least average expense)
  const avgExpenses = members.map(m => ({
    member: m,
    avg: expCountMap[m.name] > 0 ? (paidMap[m.name] / expCountMap[m.name]) : Infinity,
  })).filter(e => e.avg < Infinity).sort((a, b) => a.avg - b.avg);

  if (avgExpenses.length > 0) {
    const keeper = avgExpenses[0];
    entries.push({
      name: keeper.member.name, initial: keeper.member.initial, color: keeper.member.color,
      stat: `${currencySymbol}${Math.round(keeper.avg).toLocaleString()} avg/expense`,
      value: keeper.avg, badge: 'shield-checkmark', badgeColor: '#5E8A5A', rank: 2,
    });
  }

  // Most Generous (paid for most shared expenses)
  const generosity = members.map(m => ({
    member: m,
    sharedCount: expenses.filter(e => e.paidBy === m.name && e.splitWith.length > 0).length,
  })).sort((a, b) => b.sharedCount - a.sharedCount);

  if (generosity.length > 0 && generosity[0].sharedCount > 0) {
    const gen = generosity[0];
    entries.push({
      name: gen.member.name, initial: gen.member.initial, color: gen.member.color,
      stat: `${gen.sharedCount} shared expenses paid`,
      value: gen.sharedCount, badge: 'heart', badgeColor: '#C75450', rank: 3,
    });
  }

  // Explorer (most diverse categories)
  const explorer = members.map(m => ({
    member: m,
    categories: categoryMap[m.name]?.size || 0,
  })).sort((a, b) => b.categories - a.categories);

  if (explorer.length > 0 && explorer[0].categories > 0) {
    const exp = explorer[0];
    entries.push({
      name: exp.member.name, initial: exp.member.initial, color: exp.member.color,
      stat: `${exp.categories} spending categories`,
      value: exp.categories, badge: 'compass', badgeColor: '#4A8BA8', rank: 4,
    });
  }

  // Journal Champion
  const journalDays = journals.length;
  if (journalDays > 0) {
    const me = members[0]; // "You" is always the journal writer
    entries.push({
      name: me.name, initial: me.initial, color: me.color,
      stat: `${journalDays} journal entries`,
      value: journalDays, badge: 'book', badgeColor: '#9B59B6', rank: 5,
    });
  }

  return entries;
}

// ── Blog Post Generator ────────────────────────────────────────────────

export function generateBlogPost(
  destination: string,
  dayCount: number,
  journals: JournalEntry[],
  highlights: TripHighlight[],
): string {
  const title = `${dayCount} Days in ${destination} — A Journey to Remember`;
  let post = `# ${title}\n\n`;
  post += `*A travel story from my recent ${dayCount}-day adventure in ${destination}*\n\n`;
  post += `---\n\n`;

  // Intro
  post += `## The Beginning\n\n`;
  if (journals.length > 0 && journals[0].text) {
    post += `${journals[0].text}\n\n`;
  } else {
    post += `There's something magical about stepping into a new city for the first time. ${destination} greeted us with open arms, and from the very first moment, we knew this trip would be special.\n\n`;
  }

  // Day by day
  journals.forEach((entry, idx) => {
    if (idx === 0) return; // Already used in intro
    post += `## Day ${entry.day}${entry.mood ? ` — Feeling ${entry.mood}` : ''}\n\n`;
    post += `${entry.text}\n\n`;
  });

  // Highlights
  if (highlights.length > 0) {
    post += `## Trip Highlights\n\n`;
    highlights.forEach(h => {
      post += `- **${h.title}**: ${h.description}\n`;
    });
    post += `\n`;
  }

  // Outro
  post += `## Until Next Time\n\n`;
  post += `${destination} taught us that the best trips aren't about checking off a list — they're about the moments in between. The unplanned detours, the late-night conversations, the food that you find down an alley you almost didn't walk into.\n\n`;
  post += `If you're thinking about visiting ${destination}, do it. Your future self will thank you.\n\n`;
  post += `---\n\n`;
  post += `*Written with love and a little help from TrailMate AI*\n`;

  return post;
}

// ── Share Formats ──────────────────────────────────────────────────────

export const SHARE_FORMATS: ShareFormat[] = [
  {
    key: 'story',
    label: 'Insta Story',
    icon: 'image',
    description: 'Vertical story card with highlights + photos',
    gradient: ['#833AB4', '#FD1D1D'] as const,
  },
  {
    key: 'reel',
    label: 'Reel / Shorts',
    icon: 'videocam',
    description: 'Auto-compiled video with music + transitions',
    gradient: ['#FF6B6B', '#EE5A24'] as const,
  },
  {
    key: 'blog',
    label: 'Blog Post',
    icon: 'document-text',
    description: 'Polished blog from your journal + photos',
    gradient: ['#5E8A5A', '#3D6B39'] as const,
  },
  {
    key: 'thread',
    label: 'X Thread',
    icon: 'chatbubbles',
    description: 'Tweet thread with daily highlights',
    gradient: ['#1DA1F2', '#0D8BD9'] as const,
  },
];

// ── Thread Generator ───────────────────────────────────────────────────

export function generateThread(
  destination: string,
  dayCount: number,
  journals: JournalEntry[],
  totalSpent: number,
  currencySymbol: string = '₹',
): string[] {
  const tweets: string[] = [];

  tweets.push(`Just got back from ${dayCount} incredible days in ${destination} and WOW. Here's a thread of the best moments...`);

  journals.slice(0, 5).forEach(entry => {
    const moodEmoji = entry.mood === 'amazing' ? '' : entry.mood === 'good' ? '' : '';
    const text = entry.text.length > 240
      ? entry.text.substring(0, 237) + '...'
      : entry.text;
    tweets.push(`Day ${entry.day} ${moodEmoji}\n\n${text}`);
  });

  tweets.push(`Total damage: ${currencySymbol}${totalSpent.toLocaleString()} for ${dayCount} days. Worth every penny.\n\nPlanned the entire trip with @TrailMate — honestly a game changer for group trips.`);

  return tweets;
}

// ── Trip Map Data ──────────────────────────────────────────────────────

export function generateMapLocations(
  itinerary: { dayNumber: number; items: ItineraryItemBasic[] }[],
): MapLocation[] {
  const locations: MapLocation[] = [];

  itinerary.forEach(day => {
    day.items.forEach((item, idx) => {
      if (item.location) {
        locations.push({
          name: item.location,
          type: item.type,
          day: day.dayNumber,
          order: idx + 1,
        });
      }
    });
  });

  return locations;
}

export function estimateDistance(locationCount: number): number {
  // Rough estimate: 5-15 km between locations
  return locationCount * 8;
}

// ── Color constant (avoid importing full theme in utility) ─────────────
const Colors_sage = '#5E8A5A';
