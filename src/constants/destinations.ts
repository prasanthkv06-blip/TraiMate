export interface Destination {
  id: string;
  name: string;
  country: string;
  emoji: string;
  image: string;
}

export const POPULAR_DESTINATIONS: Destination[] = [
  { id: '1', name: 'Paris', country: 'France', emoji: '🗼', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
  { id: '2', name: 'Tokyo', country: 'Japan', emoji: '⛩️', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80' },
  { id: '3', name: 'Bali', country: 'Indonesia', emoji: '🌺', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
  { id: '4', name: 'New York', country: 'United States', emoji: '🗽', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=80' },
  { id: '5', name: 'Barcelona', country: 'Spain', emoji: '🏖️', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&q=80' },
  { id: '6', name: 'Santorini', country: 'Greece', emoji: '🏛️', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80' },
  { id: '7', name: 'Marrakech', country: 'Morocco', emoji: '🕌', image: 'https://images.unsplash.com/photo-1597212720158-8a48e35bb9e1?w=400&q=80' },
  { id: '8', name: 'Reykjavik', country: 'Iceland', emoji: '🌋', image: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=400&q=80' },
];
