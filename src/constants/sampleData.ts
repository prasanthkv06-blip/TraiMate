import type { Trip } from '../components/TripCard';

// Generate relative dates so sample trips always look current
function relativeDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export const SAMPLE_TRIPS: Trip[] = [
  {
    id: '1',
    name: 'Summer in Kyoto',
    destination: 'Kyoto, Japan',
    startDate: relativeDate(14),
    endDate: relativeDate(27),
    photos: [
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80',
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80',
    ],
    memberCount: 4,
    phase: 'planning',
    emoji: '⛩️',
  },
  {
    id: '2',
    name: 'Amalfi Coast Road Trip',
    destination: 'Amalfi, Italy',
    startDate: relativeDate(-3),
    endDate: relativeDate(6),
    photos: [
      'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800&q=80',
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80',
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
    ],
    memberCount: 6,
    phase: 'live',
    emoji: '🍋',
  },
  {
    id: '3',
    name: 'Bali Wellness Retreat',
    destination: 'Ubud, Bali',
    startDate: relativeDate(-30),
    endDate: relativeDate(-21),
    photos: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80',
    ],
    memberCount: 3,
    phase: 'review',
    emoji: '🌺',
  },
];
