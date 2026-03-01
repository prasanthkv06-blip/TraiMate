/**
 * Maps destinations to high-quality Unsplash photos.
 * Uses fuzzy matching on city/country names.
 */

const DESTINATION_IMAGES: Record<string, string> = {
  // Asia
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  osaka: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
  seoul: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
  maldives: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
  india: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80',
  vietnam: 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800&q=80',

  // Europe
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
  barcelona: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  amsterdam: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80',
  santorini: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  greece: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  prague: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80',
  vienna: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80',
  switzerland: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80',
  zurich: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80',
  lisbon: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
  berlin: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',

  // Americas
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  nyc: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  'los angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
  'san francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
  miami: 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80',
  cancun: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&q=80',
  mexico: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80',
  brazil: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
  rio: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',

  // Africa & Middle East
  cairo: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80',
  marrakech: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80',
  morocco: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80',
  'cape town': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',

  // Oceania
  sydney: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
  australia: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
  'new zealand': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';

/**
 * Returns a destination-appropriate Unsplash URL.
 * Performs fuzzy matching: splits the destination string and checks
 * each word/phrase against the known destinations map.
 */
export function getDestinationImage(destination: string): string {
  if (!destination) return FALLBACK_IMAGE;

  const lower = destination.toLowerCase().trim();

  // Direct match
  if (DESTINATION_IMAGES[lower]) return DESTINATION_IMAGES[lower];

  // Try matching each part (e.g. "Paris, France" → check "paris", then "france")
  const parts = lower.split(/[,\-–—]+/).map(p => p.trim());
  for (const part of parts) {
    if (DESTINATION_IMAGES[part]) return DESTINATION_IMAGES[part];
  }

  // Try substring match (e.g. "New York City" contains "new york")
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }

  return FALLBACK_IMAGE;
}
