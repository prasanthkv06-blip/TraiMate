/**
 * TrailMate AI Data — Destination intelligence, budgets, packing, visa, suggestions
 */

// ── Currency ──
export const CURRENCY_MAP: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', THB: '฿', JPY: '¥', AUD: 'A$',
};

// ── Category Icons & Colors ──
export const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️', transport: '🚗', hotel: '🏨', activity: '🎯', shopping: '🛍️',
  sightseeing: '📸', nightlife: '🌙', wellness: '🧘', culture: '🎭', beach: '🏖️',
};

// Ionicons equivalents for each category (use these instead of emoji in UI)
export const CATEGORY_IONICONS: Record<string, string> = {
  food: 'restaurant', transport: 'car', hotel: 'bed', activity: 'flag',
  shopping: 'bag', sightseeing: 'camera', nightlife: 'moon',
  wellness: 'leaf', culture: 'color-palette', beach: 'umbrella',
};

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#B07A50', transport: '#4A8BA8', hotel: '#8B6DB5', activity: '#5E8A5A',
  shopping: '#D4A574', sightseeing: '#6B8E6B', nightlife: '#9B59B6',
  wellness: '#27AE60', culture: '#E67E22', beach: '#3498DB',
};

// ── Itinerary Templates ──
export interface Activity {
  tl: string; t: string; dr: string; l: string;
  tp: string; i: string; ai: string;
}

export const ITINERARY_DB: Record<string, Record<number, Activity[]>> = {
  paris: {
    1: [
      { tl: 'Check into hotel', t: '14:00', dr: '1h', l: 'Le Marais, 4th', tp: 'hotel', i: '🏨', ai: 'Le Marais is walkable to most sights. Ask for a top-floor room.' },
      { tl: 'Walk along Seine River', t: '16:00', dr: '2h', l: 'Seine, Île de la Cité', tp: 'sightseeing', i: '🚶', ai: 'Golden hour light on Notre-Dame is incredible from Pont de l\'Archevêché.' },
      { tl: 'Dinner at Le Bouillon Chartier', t: '19:30', dr: '1.5h', l: '9th Arr.', tp: 'food', i: '🍽️', ai: 'Belle Époque brasserie with €3 starters. No reservations — go at 6:30 PM.' },
    ],
    2: [
      { tl: 'Croissants at Du Pain et Des Idées', t: '08:00', dr: '45m', l: '10th Arr.', tp: 'food', i: '🥐', ai: 'Best bakery in Paris. Get the pain des amis and escargot pastry.' },
      { tl: 'Louvre Museum', t: '10:00', dr: '3h', l: 'Rue de Rivoli, 1st', tp: 'culture', i: '🏛️', ai: 'Enter via Carrousel entrance to skip main queue. Book online.' },
      { tl: 'Lunch at L\'As du Fallafel', t: '13:30', dr: '45m', l: 'Le Marais', tp: 'food', i: '🧆', ai: 'Best falafel in Paris. Queue moves fast — get the special with all toppings.' },
      { tl: 'Montmartre & Sacré-Cœur', t: '15:30', dr: '2.5h', l: '18th Arr.', tp: 'sightseeing', i: '⛪', ai: 'Start at Abbesses metro. Walk up through artist streets to the basilica.' },
      { tl: 'Dinner at Pink Mamma', t: '19:00', dr: '2h', l: '10th Arr.', tp: 'food', i: '🍝', ai: 'No reservations — go at 6 PM to avoid 2-hour wait. 4-story Italian.' },
    ],
    3: [
      { tl: 'Eiffel Tower sunrise', t: '06:30', dr: '2h', l: 'Champ de Mars', tp: 'sightseeing', i: '🗼', ai: 'Trocadéro gives best photo angle. Summit tickets sell out weeks ahead.' },
      { tl: 'Coffee at Café de Flore', t: '09:30', dr: '1h', l: 'Saint-Germain', tp: 'food', i: '☕', ai: 'Hot chocolate is legendary. Sartre\'s favourite seat is upstairs.' },
      { tl: 'Musée d\'Orsay', t: '11:00', dr: '2.5h', l: '7th Arr.', tp: 'culture', i: '🎨', ai: 'Impressionist collection is on level 5. Combined ticket with Orangerie saves money.' },
      { tl: 'Latin Quarter bookshops', t: '14:30', dr: '2h', l: '5th Arr.', tp: 'activity', i: '📚', ai: 'Shakespeare & Co — attend a reading. Check their calendar online.' },
      { tl: 'Seine River cruise at sunset', t: '18:00', dr: '1.5h', l: 'Pont Neuf', tp: 'activity', i: '🚢', ai: 'Bateaux Mouches is the classic. Bring wine — picnic on deck is allowed.' },
    ],
    4: [
      { tl: 'Versailles day trip', t: '08:00', dr: '6h', l: 'Versailles', tp: 'sightseeing', i: '🏰', ai: 'RER C from Invalides. Go Tuesday-Saturday. Gardens free except fountain show days.' },
      { tl: 'Catacombs of Paris', t: '16:00', dr: '1.5h', l: '14th Arr.', tp: 'culture', i: '💀', ai: 'Book online! Walk-up lines are 2+ hours. Underground ossuary with 6M+ remains.' },
      { tl: 'Dinner at Le Comptoir', t: '19:30', dr: '2h', l: 'Saint-Germain', tp: 'food', i: '🍷', ai: 'Walk-in only at dinner. Incredible 5-course prix fixe for great value.' },
    ],
    5: [
      { tl: 'Breakfast at market', t: '08:30', dr: '1h', l: 'Marché d\'Aligre, 12th', tp: 'food', i: '🧀', ai: 'Open-air market. Buy fromage, bread, and fruit for a picnic.' },
      { tl: 'Last shopping on Champs-Élysées', t: '10:00', dr: '2h', l: '8th Arr.', tp: 'shopping', i: '🛍️', ai: 'Galeries Lafayette has better selection. Tax refund at airport for purchases over €100.' },
      { tl: 'Departure', t: '14:00', dr: '2h', l: 'CDG Airport', tp: 'transport', i: '✈️', ai: 'RER B to CDG takes 50 min. Allow 3 hours for international flights.' },
    ],
  },
  bali: {
    1: [
      { tl: 'Arrive & check in', t: '14:00', dr: '1.5h', l: 'Ubud', tp: 'hotel', i: '🏨', ai: 'Ubud is the cultural heart. Seminyak for beaches. Canggu for digital nomads.' },
      { tl: 'Explore Ubud center', t: '16:00', dr: '2h', l: 'Ubud Market', tp: 'sightseeing', i: '🚶', ai: 'Negotiate! Start at 30% of asking price. Best prices in the morning.' },
      { tl: 'Dinner at Locavore', t: '19:00', dr: '2h', l: 'Ubud', tp: 'food', i: '🍽️', ai: 'Book weeks ahead. Best fine dining in Bali using local ingredients.' },
    ],
    2: [
      { tl: 'Tegallalang Rice Terraces', t: '07:00', dr: '2h', l: 'Tegallalang', tp: 'sightseeing', i: '🌾', ai: 'Go at sunrise before tour buses. Donation requested — ₹50K IDR.' },
      { tl: 'Tirta Empul Temple', t: '10:00', dr: '1.5h', l: 'Tampaksiring', tp: 'culture', i: '⛩️', ai: 'Bring a sarong. Purification ritual — follow locals for proper etiquette.' },
      { tl: 'Lunch at Babi Guling Ibu Oka', t: '12:00', dr: '1h', l: 'Ubud', tp: 'food', i: '🐷', ai: 'Famous suckling pig — Bourdain approved. Go before noon, they sell out.' },
      { tl: 'Monkey Forest walk', t: '14:30', dr: '2h', l: 'Ubud', tp: 'activity', i: '🐒', ai: 'Hide food and shiny items. They WILL grab them. Beautiful sacred forest.' },
      { tl: 'Sunset at Tanah Lot', t: '17:00', dr: '2h', l: 'Tabanan', tp: 'sightseeing', i: '🌅', ai: '40 min from Ubud. Arrive 1 hour before sunset for best photos.' },
    ],
    3: [
      { tl: 'Mount Batur sunrise trek', t: '02:00', dr: '6h', l: 'Kintamani', tp: 'activity', i: '🌋', ai: 'Pickup 2 AM, summit by 6 AM. Bring warm layers — it\'s cold at 1700m.' },
      { tl: 'Hot springs soak', t: '09:00', dr: '1.5h', l: 'Toya Devasya', tp: 'wellness', i: '♨️', ai: 'Natural volcanic hot springs with lake views. Perfect after the trek.' },
      { tl: 'Beach afternoon at Seminyak', t: '14:00', dr: '3h', l: 'Seminyak', tp: 'beach', i: '🏖️', ai: 'La Plancha beach club has colorful bean bags. Great sunset spot.' },
      { tl: 'Dinner at La Brisa', t: '18:00', dr: '2h', l: 'Canggu', tp: 'food', i: '🍹', ai: 'Driftwood-chic beachfront. Reserve a daybed for sunset — cocktails are artisan.' },
    ],
    4: [
      { tl: 'Yoga at The Yoga Barn', t: '07:00', dr: '1.5h', l: 'Ubud', tp: 'wellness', i: '🧘', ai: 'Drop-in classes from $10. Vinyasa with rice field views is life-changing.' },
      { tl: 'Waterfall hopping', t: '10:00', dr: '4h', l: 'Central Bali', tp: 'activity', i: '💧', ai: 'Tegenungan is closest but crowded. Tibumana is hidden gem — fewer tourists.' },
      { tl: 'Lunch at Sisterfields', t: '14:30', dr: '1h', l: 'Seminyak', tp: 'food', i: '🥑', ai: 'Best avocado toast in Bali. Busy on weekends — go weekday afternoon.' },
      { tl: 'Kecak Fire Dance', t: '18:00', dr: '1.5h', l: 'Uluwatu Temple', tp: 'culture', i: '🔥', ai: 'Sunset performance on clifftop. Buy tickets early — sells out daily.' },
    ],
    5: [
      { tl: 'Brunch at Watercress', t: '09:00', dr: '1h', l: 'Ubud', tp: 'food', i: '🥞', ai: 'Hidden café by rice fields. The ricotta hotcakes are incredible.' },
      { tl: 'Last-minute shopping', t: '11:00', dr: '2h', l: 'Seminyak', tp: 'shopping', i: '🛍️', ai: 'Ashitaba for handwoven bags. Kou for organic soaps. Negotiate everywhere.' },
      { tl: 'Departure', t: '15:00', dr: '2h', l: 'Ngurah Rai Airport', tp: 'transport', i: '✈️', ai: 'Airport traffic is brutal. Leave 2.5 hours before from Ubud.' },
    ],
  },
  tokyo: {
    1: [
      { tl: 'Check into hotel', t: '15:00', dr: '1h', l: 'Shinjuku', tp: 'hotel', i: '🏨', ai: 'Shinjuku is central with great transport links. Get a Suica/Pasmo card immediately.' },
      { tl: 'Explore Shinjuku nightlife', t: '19:00', dr: '3h', l: 'Golden Gai', tp: 'nightlife', i: '🌃', ai: 'Tiny 6-seat bars. Some charge cover — check signs. Memory Lane for yakitori.' },
    ],
    2: [
      { tl: 'Tsukiji Outer Market', t: '07:00', dr: '2h', l: 'Tsukiji', tp: 'food', i: '🍣', ai: 'Fresh tamagoyaki, uni, and street tuna. Go before 9 AM for best picks.' },
      { tl: 'Senso-ji Temple', t: '10:00', dr: '1.5h', l: 'Asakusa', tp: 'culture', i: '⛩️', ai: 'Tokyo\'s oldest temple. Nakamise shopping street has great snacks.' },
      { tl: 'TeamLab Borderless', t: '13:00', dr: '2.5h', l: 'Azabudai Hills', tp: 'activity', i: '🎆', ai: 'Book 2+ weeks ahead. Wear white clothing — art projects onto you.' },
      { tl: 'Shibuya Crossing & Hachiko', t: '16:30', dr: '1.5h', l: 'Shibuya', tp: 'sightseeing', i: '🚶', ai: 'Best view from Starbucks above crossing. Peak chaos is Friday 5-7 PM.' },
      { tl: 'Ramen at Fuunji', t: '19:00', dr: '1h', l: 'Shinjuku', tp: 'food', i: '🍜', ai: 'Tsukemen (dipping ramen) is legendary. 30+ min queue — worth every second.' },
    ],
    3: [
      { tl: 'Meiji Shrine morning walk', t: '07:00', dr: '1.5h', l: 'Harajuku', tp: 'culture', i: '🌳', ai: 'Peaceful forest path in the heart of Tokyo. Early morning is magical.' },
      { tl: 'Harajuku & Takeshita Street', t: '10:00', dr: '2h', l: 'Harajuku', tp: 'shopping', i: '🛍️', ai: 'Kawaii culture central. Try a crepe from Marion — queues are part of the fun.' },
      { tl: 'Akihabara electronics', t: '14:00', dr: '2h', l: 'Akihabara', tp: 'shopping', i: '🎮', ai: 'Tax-free shopping on electronics. Super Potato for retro games.' },
      { tl: 'Robot Restaurant show', t: '18:00', dr: '2h', l: 'Kabukicho', tp: 'activity', i: '🤖', ai: 'Pure sensory overload. Book online for discount. Don\'t eat there — eat before.' },
    ],
    4: [
      { tl: 'Day trip to Kamakura', t: '08:00', dr: '8h', l: 'Kamakura', tp: 'sightseeing', i: '🗿', ai: 'Great Buddha and bamboo groves. JR Pass covers the train. Take Enoden line along coast.' },
      { tl: 'Kaiseki dinner', t: '19:00', dr: '2h', l: 'Ginza', tp: 'food', i: '🍱', ai: 'Multi-course Japanese haute cuisine. Expect $100+. An unforgettable culinary experience.' },
    ],
    5: [
      { tl: 'Morning at Toyosu Market', t: '06:00', dr: '2h', l: 'Toyosu', tp: 'food', i: '🐟', ai: 'Tuna auction viewing from 5:30 AM. Sushi breakfast at Daiwa — queue early.' },
      { tl: 'Last shopping in Ginza', t: '10:00', dr: '2h', l: 'Ginza', tp: 'shopping', i: '🛍️', ai: 'Don Quijote for souvenirs. Uniqlo flagship for basics. Tax-free over ¥5000.' },
      { tl: 'Departure', t: '14:00', dr: '2h', l: 'Narita/Haneda', tp: 'transport', i: '✈️', ai: 'Narita Express from Shinjuku is 80 min. Haneda is closer — 30 min by monorail.' },
    ],
  },
  dubai: {
    1: [
      { tl: 'Check into hotel', t: '15:00', dr: '1h', l: 'Downtown Dubai', tp: 'hotel', i: '🏨', ai: 'Downtown gives Burj Khalifa views. JBR for beach vibes. DIFC for nightlife.' },
      { tl: 'Dubai Fountain show', t: '18:00', dr: '1h', l: 'Dubai Mall', tp: 'sightseeing', i: '⛲', ai: 'Free shows every 30 min from 6 PM. Best from Souk Al Bahar terrace.' },
      { tl: 'Dinner at Al Ustad Kebab', t: '20:00', dr: '1.5h', l: 'Al Fahidi', tp: 'food', i: '🍢', ai: 'Dubai\'s best kebabs since 1978. Seekh kebab + hummus combo is the move.' },
    ],
    2: [
      { tl: 'Burj Khalifa at sunrise', t: '05:30', dr: '1.5h', l: 'Downtown', tp: 'sightseeing', i: '🏙️', ai: 'Sunrise tickets are cheapest. Level 148 (At The Top SKY) is worth the premium.' },
      { tl: 'Old Dubai & Gold Souk', t: '09:00', dr: '3h', l: 'Deira', tp: 'culture', i: '✨', ai: 'Take an abra boat across Creek — costs 1 AED. Negotiate gold prices firmly.' },
      { tl: 'Lunch at Arabian Tea House', t: '12:30', dr: '1h', l: 'Al Fahidi', tp: 'food', i: '🫖', ai: 'Stunning courtyard café in historical district. Try the karak tea.' },
      { tl: 'Desert safari', t: '15:00', dr: '6h', l: 'Dubai Desert', tp: 'activity', i: '🐪', ai: 'Includes dune bashing, camel ride, BBQ dinner. Book a private tour for better experience.' },
    ],
    3: [
      { tl: 'JBR beach morning', t: '08:00', dr: '3h', l: 'Jumeirah Beach', tp: 'beach', i: '🏖️', ai: 'Free public beach. Rent sunbeds early. Great view of Ain Dubai.' },
      { tl: 'Atlantis Aquaventure', t: '12:00', dr: '4h', l: 'Palm Jumeirah', tp: 'activity', i: '🎢', ai: 'Book online for 20% off. Aquarium tunnel is free to walk through.' },
      { tl: 'Dinner at At.mosphere', t: '19:00', dr: '2h', l: 'Burj Khalifa', tp: 'food', i: '🍽️', ai: 'World\'s highest restaurant — floor 122. Lunch set is half the price of dinner.' },
    ],
  },
  goa: {
    1: [
      { tl: 'Arrive & check in', t: '14:00', dr: '1h', l: 'North Goa', tp: 'hotel', i: '🏨', ai: 'North Goa for parties (Baga, Calangute). South for peace (Palolem, Agonda).' },
      { tl: 'Sunset at Vagator Beach', t: '17:00', dr: '2h', l: 'Vagator', tp: 'beach', i: '🌅', ai: 'Chapora Fort cliff gives the best sunset views. Less crowded than Anjuna.' },
      { tl: 'Dinner at Fisherman\'s Wharf', t: '19:30', dr: '2h', l: 'Cavelossim', tp: 'food', i: '🦐', ai: 'Butter garlic prawns are legendary. Book a riverside table for sunset.' },
    ],
    2: [
      { tl: 'Old Goa heritage walk', t: '08:00', dr: '3h', l: 'Old Goa', tp: 'culture', i: '⛪', ai: 'Basilica of Bom Jesus is UNESCO heritage. Go early before heat builds.' },
      { tl: 'Lunch at Vinayak Family Restaurant', t: '12:00', dr: '1h', l: 'Panjim', tp: 'food', i: '🍛', ai: 'Best value Goan thali in town. Fish curry rice is a must-try.' },
      { tl: 'Kayaking in Sal Backwaters', t: '15:00', dr: '2h', l: 'Mobor', tp: 'activity', i: '🛶', ai: 'Best between 4-6 PM golden hour. Wear quick-dry clothes.' },
      { tl: 'Night market shopping', t: '19:00', dr: '2h', l: 'Arpora', tp: 'shopping', i: '🛍️', ai: 'Saturday Night Market has live music + food. Great for souvenirs.' },
    ],
    3: [
      { tl: 'Dolphin spotting boat', t: '07:00', dr: '2h', l: 'Sinquerim', tp: 'activity', i: '🐬', ai: '95% sighting rate before 9 AM. Carry sunscreen and a hat.' },
      { tl: 'Brunch at Artjuna', t: '10:00', dr: '1.5h', l: 'Anjuna', tp: 'food', i: '🥑', ai: 'Garden café with yoga vibes. Great smoothie bowls and organic food.' },
      { tl: 'Spice plantation tour', t: '13:00', dr: '3h', l: 'Ponda', tp: 'activity', i: '🌿', ai: 'Sahakari Spice Farm includes lunch. Learn about turmeric, cardamom, vanilla.' },
      { tl: 'Cocktails at Curlies', t: '17:30', dr: '3h', l: 'Anjuna Beach', tp: 'nightlife', i: '🍹', ai: 'Get there for sunset. Tuesday & Friday have live music. Cash preferred.' },
    ],
  },
  bangkok: {
    1: [
      { tl: 'Check into hotel', t: '15:00', dr: '1h', l: 'Sukhumvit', tp: 'hotel', i: '🏨', ai: 'Sukhumvit near BTS for transport. Khao San Road for backpacker vibes.' },
      { tl: 'Chinatown street food tour', t: '18:00', dr: '3h', l: 'Yaowarat', tp: 'food', i: '🍜', ai: 'Yaowarat Road comes alive at night. Try pad thai, mango sticky rice, grilled seafood.' },
    ],
    2: [
      { tl: 'Grand Palace & Wat Phra Kaew', t: '08:00', dr: '2.5h', l: 'Rattanakosin', tp: 'culture', i: '🏯', ai: 'Dress code enforced — cover knees and shoulders. Arrive at 8 AM opening.' },
      { tl: 'Wat Pho & reclining Buddha', t: '11:00', dr: '1.5h', l: 'Phra Nakhon', tp: 'culture', i: '🙏', ai: 'Thai massage school inside — get a massage after sightseeing. Only 300 THB.' },
      { tl: 'Lunch at Thip Samai', t: '13:00', dr: '1h', l: 'Phra Nakhon', tp: 'food', i: '🍳', ai: 'Best pad thai in Bangkok since 1966. Get the version wrapped in egg.' },
      { tl: 'Jim Thompson House', t: '15:00', dr: '1.5h', l: 'Pathum Wan', tp: 'culture', i: '🏡', ai: 'Gorgeous teak house museum. Guided tours only — every 20 minutes.' },
      { tl: 'Rooftop cocktails at Sky Bar', t: '18:00', dr: '2h', l: 'Silom', tp: 'nightlife', i: '🍸', ai: 'Lebua\'s Sky Bar — Hangover II fame. Smart dress code enforced. Go at 6 PM for golden hour.' },
    ],
    3: [
      { tl: 'Floating markets', t: '07:00', dr: '4h', l: 'Damnoen Saduak', tp: 'activity', i: '🛶', ai: 'Go early to beat tour groups. Amphawa is more authentic but weekend only.' },
      { tl: 'Chatuchak Weekend Market', t: '13:00', dr: '3h', l: 'Chatuchak', tp: 'shopping', i: '🛍️', ai: '15,000+ stalls. Get a map. Section 2-4 for fashion. Coconut ice cream everywhere.' },
      { tl: 'Dinner at Jay Fai', t: '17:00', dr: '2h', l: 'Old City', tp: 'food', i: '🦀', ai: 'Michelin-star street food. Queue from 2 PM for 5 PM opening. Cash only.' },
    ],
  },
};

// ── Budget Estimates ──
interface BudgetTier {
  hotel: number; food: number; transport: number; activity: number; shopping: number;
}

export interface BudgetEstimate {
  budget: BudgetTier;
  mid: BudgetTier;
  luxury: BudgetTier;
  currency: string;
}

export const BUDGET_DB: Record<string, BudgetEstimate> = {
  india: {
    budget: { hotel: 1500, food: 800, transport: 500, activity: 600, shopping: 400 },
    mid: { hotel: 4000, food: 2000, transport: 1200, activity: 1500, shopping: 800 },
    luxury: { hotel: 12000, food: 5000, transport: 3000, activity: 3000, shopping: 2000 },
    currency: 'INR',
  },
  sea: {
    budget: { hotel: 25, food: 15, transport: 10, activity: 15, shopping: 10 },
    mid: { hotel: 80, food: 40, transport: 25, activity: 40, shopping: 25 },
    luxury: { hotel: 250, food: 100, transport: 60, activity: 100, shopping: 50 },
    currency: 'USD',
  },
  europe: {
    budget: { hotel: 60, food: 30, transport: 15, activity: 20, shopping: 15 },
    mid: { hotel: 150, food: 60, transport: 30, activity: 50, shopping: 30 },
    luxury: { hotel: 400, food: 150, transport: 80, activity: 120, shopping: 80 },
    currency: 'EUR',
  },
  middleeast: {
    budget: { hotel: 200, food: 80, transport: 50, activity: 60, shopping: 50 },
    mid: { hotel: 500, food: 200, transport: 120, activity: 150, shopping: 100 },
    luxury: { hotel: 1500, food: 500, transport: 300, activity: 400, shopping: 300 },
    currency: 'AED',
  },
  japan: {
    budget: { hotel: 5000, food: 3000, transport: 2000, activity: 2000, shopping: 1500 },
    mid: { hotel: 15000, food: 6000, transport: 3500, activity: 4000, shopping: 3000 },
    luxury: { hotel: 50000, food: 15000, transport: 8000, activity: 10000, shopping: 8000 },
    currency: 'JPY',
  },
  uk: {
    budget: { hotel: 40, food: 25, transport: 12, activity: 15, shopping: 10 },
    mid: { hotel: 120, food: 50, transport: 25, activity: 40, shopping: 25 },
    luxury: { hotel: 350, food: 120, transport: 60, activity: 100, shopping: 60 },
    currency: 'GBP',
  },
  americas: {
    budget: { hotel: 50, food: 25, transport: 15, activity: 20, shopping: 10 },
    mid: { hotel: 150, food: 60, transport: 30, activity: 50, shopping: 30 },
    luxury: { hotel: 400, food: 150, transport: 70, activity: 120, shopping: 70 },
    currency: 'USD',
  },
  australia: {
    budget: { hotel: 60, food: 30, transport: 15, activity: 25, shopping: 15 },
    mid: { hotel: 180, food: 70, transport: 35, activity: 60, shopping: 30 },
    luxury: { hotel: 450, food: 150, transport: 80, activity: 120, shopping: 70 },
    currency: 'AUD',
  },
};

const REGION_MAP: Record<string, string> = {
  goa: 'india', delhi: 'india', mumbai: 'india', jaipur: 'india', kerala: 'india', manali: 'india', ladakh: 'india', rajasthan: 'india', varanasi: 'india',
  bali: 'sea', bangkok: 'sea', singapore: 'sea', vietnam: 'sea', phuket: 'sea', hanoi: 'sea', 'ho chi minh': 'sea',
  paris: 'europe', rome: 'europe', barcelona: 'europe', santorini: 'europe', amsterdam: 'europe', prague: 'europe', venice: 'europe', switzerland: 'europe', greece: 'europe',
  dubai: 'middleeast', 'abu dhabi': 'middleeast', doha: 'middleeast',
  tokyo: 'japan', kyoto: 'japan', osaka: 'japan',
  london: 'uk', edinburgh: 'uk', scotland: 'uk',
  'new york': 'americas', 'los angeles': 'americas', mexico: 'americas', cancun: 'americas',
  sydney: 'australia', melbourne: 'australia', 'new zealand': 'australia', reykjavik: 'europe', iceland: 'europe', marrakech: 'europe',
};

export function getRegion(destination: string): string {
  const d = destination.toLowerCase();
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (d.includes(key)) return region;
  }
  return 'sea'; // default
}

// ── Packing Lists ──
export interface PackingItem {
  name: string; emoji: string; essential: boolean; category: string;
}

export const BASE_PACKING: PackingItem[] = [
  // Documents
  { name: 'Passport', emoji: '📕', essential: true, category: 'Documents' },
  { name: 'Flight tickets', emoji: '✈️', essential: true, category: 'Documents' },
  { name: 'Hotel confirmation', emoji: '🏨', essential: true, category: 'Documents' },
  { name: 'Travel insurance', emoji: '📋', essential: true, category: 'Documents' },
  { name: 'ID card / driver\'s license', emoji: '🪪', essential: false, category: 'Documents' },
  // Essentials
  { name: 'Phone charger', emoji: '🔌', essential: true, category: 'Essentials' },
  { name: 'Power bank', emoji: '🔋', essential: true, category: 'Essentials' },
  { name: 'Universal adapter', emoji: '🔌', essential: true, category: 'Essentials' },
  { name: 'Headphones', emoji: '🎧', essential: false, category: 'Essentials' },
  { name: 'Water bottle', emoji: '💧', essential: false, category: 'Essentials' },
  { name: 'Day bag / backpack', emoji: '🎒', essential: true, category: 'Essentials' },
  // Toiletries
  { name: 'Toothbrush & paste', emoji: '🪥', essential: true, category: 'Toiletries' },
  { name: 'Sunscreen', emoji: '☀️', essential: true, category: 'Toiletries' },
  { name: 'Deodorant', emoji: '🧴', essential: true, category: 'Toiletries' },
  { name: 'Shampoo (travel)', emoji: '🧴', essential: false, category: 'Toiletries' },
  { name: 'Medications', emoji: '💊', essential: true, category: 'Health' },
  { name: 'First aid kit', emoji: '🩹', essential: false, category: 'Health' },
  // Clothing
  { name: 'T-shirts', emoji: '👕', essential: true, category: 'Clothing' },
  { name: 'Pants / shorts', emoji: '👖', essential: true, category: 'Clothing' },
  { name: 'Underwear', emoji: '🩲', essential: true, category: 'Clothing' },
  { name: 'Socks', emoji: '🧦', essential: true, category: 'Clothing' },
  { name: 'Sleepwear', emoji: '🛏️', essential: false, category: 'Clothing' },
  { name: 'Comfortable shoes', emoji: '👟', essential: true, category: 'Clothing' },
];

export const PACKING_MODIFIERS: Record<string, PackingItem[]> = {
  beach: [
    { name: 'Swimsuit', emoji: '👙', essential: true, category: 'Clothing' },
    { name: 'Beach towel', emoji: '🏖️', essential: true, category: 'Essentials' },
    { name: 'Flip flops', emoji: '🩴', essential: true, category: 'Clothing' },
    { name: 'Snorkel gear', emoji: '🤿', essential: false, category: 'Activity' },
    { name: 'Waterproof phone pouch', emoji: '📱', essential: false, category: 'Essentials' },
    { name: 'After-sun lotion', emoji: '🧴', essential: false, category: 'Toiletries' },
    { name: 'Reef-safe sunscreen', emoji: '🐠', essential: true, category: 'Toiletries' },
  ],
  cold: [
    { name: 'Warm jacket', emoji: '🧥', essential: true, category: 'Clothing' },
    { name: 'Thermal layers', emoji: '🧣', essential: true, category: 'Clothing' },
    { name: 'Gloves', emoji: '🧤', essential: true, category: 'Clothing' },
    { name: 'Beanie / warm hat', emoji: '🧢', essential: true, category: 'Clothing' },
    { name: 'Warm boots', emoji: '🥾', essential: true, category: 'Clothing' },
    { name: 'Lip balm', emoji: '💋', essential: false, category: 'Toiletries' },
    { name: 'Hand warmers', emoji: '🔥', essential: false, category: 'Essentials' },
  ],
  city: [
    { name: 'Smart casual outfit', emoji: '👔', essential: false, category: 'Clothing' },
    { name: 'Umbrella (compact)', emoji: '☂️', essential: false, category: 'Essentials' },
    { name: 'Metro card / transit pass', emoji: '🚇', essential: false, category: 'Documents' },
    { name: 'Walking shoes (comfy)', emoji: '👟', essential: true, category: 'Clothing' },
    { name: 'Cross-body bag', emoji: '👜', essential: false, category: 'Essentials' },
  ],
  adventure: [
    { name: 'Hiking boots', emoji: '🥾', essential: true, category: 'Clothing' },
    { name: 'Quick-dry clothing', emoji: '👕', essential: true, category: 'Clothing' },
    { name: 'Rain jacket', emoji: '🌧️', essential: true, category: 'Clothing' },
    { name: 'Headlamp / torch', emoji: '🔦', essential: true, category: 'Essentials' },
    { name: 'Insect repellent', emoji: '🦟', essential: true, category: 'Toiletries' },
    { name: 'Dry bag', emoji: '🎒', essential: false, category: 'Essentials' },
    { name: 'Trekking poles', emoji: '🥢', essential: false, category: 'Activity' },
  ],
  cultural: [
    { name: 'Modest clothing', emoji: '👗', essential: true, category: 'Clothing' },
    { name: 'Sarong / cover-up', emoji: '🧣', essential: true, category: 'Clothing' },
    { name: 'Slip-on shoes', emoji: '👞', essential: true, category: 'Clothing' },
    { name: 'Guidebook / phrasebook', emoji: '📖', essential: false, category: 'Essentials' },
  ],
  wellness: [
    { name: 'Yoga mat', emoji: '🧘', essential: false, category: 'Activity' },
    { name: 'Workout clothes', emoji: '🏃', essential: true, category: 'Clothing' },
    { name: 'Resistance bands', emoji: '💪', essential: false, category: 'Activity' },
    { name: 'Journal / notebook', emoji: '📓', essential: false, category: 'Essentials' },
    { name: 'Essential oils', emoji: '🌿', essential: false, category: 'Toiletries' },
  ],
};

const DEST_TYPE_MAP: Record<string, string[]> = {
  bali: ['beach', 'cultural', 'wellness'],
  goa: ['beach', 'adventure'],
  paris: ['city', 'cultural'],
  tokyo: ['city', 'cultural'],
  dubai: ['city', 'beach'],
  bangkok: ['city', 'cultural'],
  london: ['city', 'cultural'],
  rome: ['city', 'cultural'],
  manali: ['cold', 'adventure'],
  reykjavik: ['cold', 'adventure'],
  santorini: ['beach', 'cultural'],
  barcelona: ['city', 'beach'],
  marrakech: ['cultural', 'adventure'],
};

export function getSmartPackingList(destination: string, _days: number): PackingItem[] {
  const d = destination.toLowerCase();
  const items = [...BASE_PACKING];
  const added = new Set(items.map(i => i.name));

  // Find matching destination types
  let types: string[] = [];
  for (const [key, t] of Object.entries(DEST_TYPE_MAP)) {
    if (d.includes(key)) { types = t; break; }
  }
  if (types.length === 0) types = ['city']; // default

  // Add modifier items
  for (const type of types) {
    const modItems = PACKING_MODIFIERS[type] || [];
    for (const item of modItems) {
      if (!added.has(item.name)) {
        items.push(item);
        added.add(item.name);
      }
    }
  }

  return items;
}

// ── Visa Data ──
export interface VisaInfo {
  status: 'Visa Free' | 'On Arrival' | 'E-Visa' | 'Required';
  color: string;
  duration: string;
  fee: string;
  processing: string;
  documents: string[];
  vaccinations?: string[];
  tips: string[];
}

export const VISA_DB: Record<string, Record<string, VisaInfo>> = {
  indian: {
    bali: { status: 'On Arrival', color: '#D4A574', duration: '30 days', fee: 'Free', processing: 'On arrival', documents: ['Passport (6+ months validity)', 'Return ticket', 'Hotel booking'], tips: ['Free VOA for 30 days. Extend at immigration office for $30.'] },
    dubai: { status: 'On Arrival', color: '#D4A574', duration: '14 days', fee: 'Free', processing: 'On arrival', documents: ['Passport (6+ months validity)', 'Return ticket', 'Hotel booking', 'Sufficient funds proof'], tips: ['14-day free stamp. Can extend to 30 days for fee.'] },
    bangkok: { status: 'On Arrival', color: '#D4A574', duration: '15 days', fee: '2000 THB', processing: 'On arrival', documents: ['Passport (6+ months validity)', 'Passport photos', 'Return ticket', '10,000 THB cash'], tips: ['VOA queue can be long. Get e-VOA online to skip queue.'] },
    singapore: { status: 'E-Visa', color: '#4A8BA8', duration: '30 days', fee: '$20', processing: '3-5 days', documents: ['Passport (6+ months validity)', 'Return ticket', 'Hotel booking', 'Financial proof'], tips: ['Apply through authorized agents or Singapore embassy.'] },
    paris: { status: 'Required', color: '#C75450', duration: '90 days', fee: '€80', processing: '15-30 days', documents: ['Passport', 'Schengen visa form', 'Travel insurance (€30k coverage)', 'Bank statements (3 months)', 'Flight + hotel proof', 'Cover letter'], vaccinations: ['None required'], tips: ['Apply 3 months ahead. VFS Global handles applications.'] },
    london: { status: 'Required', color: '#C75450', duration: '6 months', fee: '£100', processing: '15-21 days', documents: ['Passport', 'UK visa form', 'Bank statements (6 months)', 'Employment letter', 'Travel itinerary'], tips: ['Apply through VFS. Priority service available for extra fee.'] },
    tokyo: { status: 'Required', color: '#C75450', duration: '90 days', fee: '₹400', processing: '5-7 days', documents: ['Passport', 'Visa application form', 'Photo', 'Flight itinerary', 'Hotel bookings', 'Bank statement'], tips: ['Japanese visa is among the easiest. Apply at embassy/consulate.'] },
  },
  american: {
    bali: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['Free entry for 30 days. No visa needed.'] },
    dubai: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['Free 30-day stamp on arrival.'] },
    paris: { status: 'Visa Free', color: '#5E8A5A', duration: '90 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['Schengen zone — 90 days in any 180-day period. ETIAS required from 2025.'] },
    tokyo: { status: 'Visa Free', color: '#5E8A5A', duration: '90 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['90-day visa-free entry. Register at hotel for immigration.'] },
    london: { status: 'Visa Free', color: '#5E8A5A', duration: '6 months', fee: 'Free', processing: 'N/A', documents: ['Passport'], tips: ['6-month visa-free entry. May need return ticket proof.'] },
    bangkok: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['30-day visa exemption stamp on arrival.'] },
    singapore: { status: 'Visa Free', color: '#5E8A5A', duration: '90 days', fee: 'Free', processing: 'N/A', documents: ['Passport'], tips: ['SG Arrival Card must be filled online within 3 days before arrival.'] },
  },
  british: {
    bali: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['Free entry. Can extend once for 30 more days.'] },
    dubai: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['Free 30-day stamp on arrival.'] },
    paris: { status: 'Visa Free', color: '#5E8A5A', duration: '90 days', fee: 'Free', processing: 'N/A', documents: ['Passport'], tips: ['Post-Brexit: 90 days in 180-day period for Schengen zone.'] },
    tokyo: { status: 'Visa Free', color: '#5E8A5A', duration: '90 days', fee: 'Free', processing: 'N/A', documents: ['Passport'], tips: ['90-day visa-free entry for tourism.'] },
    bangkok: { status: 'Visa Free', color: '#5E8A5A', duration: '30 days', fee: 'Free', processing: 'N/A', documents: ['Passport (6+ months validity)'], tips: ['30-day visa exemption on arrival.'] },
  },
};

// ── AI Guide Intelligence ──
export interface GuideAlert {
  text: string;
  type: 'warning' | 'tip' | 'info';
  emoji: string;
}

export interface HiddenSpot {
  name: string;
  area: string;
  desc: string;
  rating: number;
  price: string;
}

export const AI_GUIDE_DB: Record<string, {
  alerts: GuideAlert[];
  hiddenSpots: HiddenSpot[];
  dailyTips: string[];
  emergencyNumbers: { police: string; ambulance: string; fire: string; tourist: string };
  phrases: { hello: string; thanks: string; help: string; howMuch: string };
}> = {
  bali: {
    alerts: [
      { text: 'Monkeys at Ubud Forest will grab shiny items — secure phones & sunglasses', type: 'warning', emoji: '🐒' },
      { text: 'Haggle everywhere except restaurants — start at 30% of asking price', type: 'tip', emoji: '💡' },
      { text: 'Nyepi (Day of Silence) — airport closes, no activities. Check dates!', type: 'info', emoji: 'ℹ️' },
    ],
    hiddenSpots: [
      { name: 'Tibumana Waterfall', area: 'Bangli', desc: 'Hidden waterfall with far fewer tourists than Tegenungan', rating: 4.7, price: '$2' },
      { name: 'Sidemen Valley', area: 'Karangasem', desc: 'The real Bali — rice terraces without the Instagram crowds', rating: 4.8, price: 'Free' },
      { name: 'Penida Island Crystal Bay', area: 'Nusa Penida', desc: 'Crystal clear water, manta rays, stunning cliffs', rating: 4.9, price: '$15 boat' },
    ],
    dailyTips: [
      'Jet lag tip: Get morning sun exposure to reset your body clock faster.',
      'Bali runs on "rubber time" — don\'t stress if things start late. Relax into island pace.',
      'Ask your driver for local restaurant recommendations — they know the best warungs.',
      'Best time for temple photos is before 9 AM when tour buses haven\'t arrived yet.',
      'Last day: airport traffic from Ubud takes 1.5-2 hours. Leave early!',
    ],
    emergencyNumbers: { police: '110', ambulance: '118', fire: '113', tourist: '+62 361 224111' },
    phrases: { hello: 'Om Swastiastu (Balinese)', thanks: 'Suksma (SOOK-smah)', help: 'Tolong!', howMuch: 'Berapa harganya?' },
  },
  paris: {
    alerts: [
      { text: 'Pickpockets active at Eiffel Tower, metro, and Sacré-Cœur — front pockets only', type: 'warning', emoji: '⚠️' },
      { text: 'Museums are free first Sunday of each month — expect longer queues', type: 'tip', emoji: '💡' },
      { text: 'Always say "Bonjour" when entering any shop — it\'s considered rude not to', type: 'info', emoji: 'ℹ️' },
    ],
    hiddenSpots: [
      { name: 'Canal Saint-Martin', area: '10th Arr.', desc: 'Trendy area with locks, bridges, and amazing cafés', rating: 4.5, price: 'Free' },
      { name: 'Coulée Verte', area: '12th Arr.', desc: 'Elevated park (inspired NYC High Line) through eastern Paris', rating: 4.4, price: 'Free' },
      { name: 'Sainte-Chapelle', area: 'Île de la Cité', desc: 'Stunning stained glass — less crowded than Notre-Dame', rating: 4.8, price: '€11.50' },
    ],
    dailyTips: [
      'Get a carnet of 10 metro tickets — cheaper than buying individually.',
      'Tipping: round up or leave €1-2. Service is included in prices (service compris).',
      'Most shops close Sunday and some close Monday. Plan shopping accordingly.',
      'Tap water is free in restaurants — ask for "une carafe d\'eau".',
      'Keep your museum ticket stubs — some offer re-entry or discounts at partner museums.',
    ],
    emergencyNumbers: { police: '17', ambulance: '15', fire: '18', tourist: '+33 1 42 86 82 28' },
    phrases: { hello: 'Bonjour (bohn-ZHOOR)', thanks: 'Merci (mehr-SEE)', help: 'Au secours!', howMuch: 'Combien ça coûte?' },
  },
  tokyo: {
    alerts: [
      { text: 'Cash is king — many restaurants and small shops don\'t accept cards', type: 'warning', emoji: '💴' },
      { text: 'Get a Suica/Pasmo IC card immediately — works on all trains and convenience stores', type: 'tip', emoji: '💡' },
      { text: 'No tipping in Japan — it can be considered rude', type: 'info', emoji: 'ℹ️' },
    ],
    hiddenSpots: [
      { name: 'Yanaka Ginza', area: 'Taito', desc: 'Old-Tokyo shopping street with retro charm and cat statues', rating: 4.5, price: 'Free' },
      { name: 'Shimokitazawa', area: 'Setagaya', desc: 'Bohemian neighborhood with vintage shops and live music', rating: 4.6, price: 'Free' },
      { name: 'Gotokuji Temple', area: 'Setagaya', desc: 'Temple of 1000+ maneki-neko (lucky cat) figurines', rating: 4.7, price: 'Free' },
    ],
    dailyTips: [
      'Convenience stores (7-Eleven, FamilyMart) have ATMs that accept international cards.',
      'Train etiquette: no phone calls, keep bags small, priority seats are for elderly/pregnant.',
      'Coin lockers at stations save your day — store luggage and explore freely.',
      'Don\'t walk and eat on the street. Find a bench or eat at the shop.',
      'Last train is around midnight. Plan your night out accordingly or budget for a taxi.',
    ],
    emergencyNumbers: { police: '110', ambulance: '119', fire: '119', tourist: '+81 3 3201 3331' },
    phrases: { hello: 'Konnichiwa (kohn-nee-chee-wah)', thanks: 'Arigatou gozaimasu', help: 'Tasukete!', howMuch: 'Ikura desu ka?' },
  },
  dubai: {
    alerts: [
      { text: 'Public displays of affection can lead to fines — be respectful', type: 'warning', emoji: '⚠️' },
      { text: 'Friday is the holy day — some attractions have different hours', type: 'info', emoji: 'ℹ️' },
      { text: 'Metro Gold Class is affordable luxury — AC + less crowded for just $2 more', type: 'tip', emoji: '💡' },
    ],
    hiddenSpots: [
      { name: 'Alserkal Avenue', area: 'Al Quoz', desc: 'Dubai\'s art district — galleries, cafés, creative spaces', rating: 4.5, price: 'Free' },
      { name: 'Hatta', area: 'Hatta Mountains', desc: '90 min from Dubai — kayaking, hiking, mountain pools', rating: 4.6, price: 'AED 60' },
      { name: 'La Mer', area: 'Jumeirah', desc: 'Beachfront area with street art, food trucks, and sunset views', rating: 4.3, price: 'Free' },
    ],
    dailyTips: [
      'Download RTA Dubai app for metro/bus — tap to pay, real-time tracking.',
      'Happy hours exist in licensed venues. Best deals 4-8 PM.',
      'Dress modestly in malls and public areas. Beachwear only at the beach.',
      'Taxis are cheap — use Careem/Uber. The metro doesn\'t reach everywhere.',
      'Brunch is a Dubai institution. Friday brunches are legendary — book ahead.',
    ],
    emergencyNumbers: { police: '999', ambulance: '998', fire: '997', tourist: '+971 800 342 2424' },
    phrases: { hello: 'As-salamu alaykum', thanks: 'Shukran (SHOO-kran)', help: 'Musaada!', howMuch: 'Bikam?' },
  },
  goa: {
    alerts: [
      { text: 'Monsoon season (Jun-Sep) — many beach shacks and water sports shut down', type: 'warning', emoji: '🌧️' },
      { text: 'Negotiate taxi fares before getting in — no meters in most taxis', type: 'tip', emoji: '💡' },
      { text: 'Two-wheeler rentals need valid license — police checks are common', type: 'info', emoji: 'ℹ️' },
    ],
    hiddenSpots: [
      { name: 'Butterfly Beach', area: 'South Goa', desc: 'Secluded beach accessible only by boat from Palolem', rating: 4.7, price: '₹300 boat' },
      { name: 'Divar Island', area: 'Old Goa', desc: 'Quiet island village with Portuguese heritage, accessed by ferry', rating: 4.5, price: 'Free ferry' },
      { name: 'Dudhsagar Falls', area: 'Mollem', desc: 'India\'s tallest waterfall — jeep safari through the forest', rating: 4.8, price: '₹500' },
    ],
    dailyTips: [
      'Rent a scooter for ₹300/day. Best way to explore. Carry license always.',
      'Beach shacks in South Goa are more peaceful. North Goa for nightlife.',
      'Try the local feni (cashew spirit) — ask for a "feni cocktail" at any beach shack.',
      'Best seafood is at beach shacks, not restaurants. Freshest catch daily.',
      'Keep cash handy — many small shops and shacks don\'t accept cards.',
    ],
    emergencyNumbers: { police: '100', ambulance: '108', fire: '101', tourist: '1363' },
    phrases: { hello: 'Namaskar / Hello (English widely spoken)', thanks: 'Dev borem korum (Konkani)', help: 'Madad kara!', howMuch: 'Kitlem?' },
  },
  bangkok: {
    alerts: [
      { text: 'Gem scam alert — "helpful" locals directing you to jewelry shops is a common scam', type: 'warning', emoji: '⚠️' },
      { text: 'BTS/MRT is faster than taxis during rush hour (8-10 AM, 5-8 PM)', type: 'tip', emoji: '💡' },
      { text: 'Lèse-majesté laws — never disrespect the monarchy in any way', type: 'info', emoji: 'ℹ️' },
    ],
    hiddenSpots: [
      { name: 'Talat Noi', area: 'Chinatown', desc: 'Colorful street art neighborhood with hidden cafés', rating: 4.4, price: 'Free' },
      { name: 'Bang Krachao', area: 'Phra Pradaeng', desc: 'Bangkok\'s green lung — bike through tropical gardens', rating: 4.6, price: '฿80 bike rental' },
      { name: 'Pak Khlong Talat', area: 'Old City', desc: '24-hour flower market — stunning at midnight', rating: 4.3, price: 'Free' },
    ],
    dailyTips: [
      'Grab app is better than Uber here. Also works for food delivery.',
      'Thai massage in a temple is ₹300-500 THB. Tourist area prices are 3x higher.',
      'Street food is safe to eat — follow the queues. Long line = good food.',
      'Carry tissues and hand sanitizer. Not all restrooms have supplies.',
      'Temple dress code: cover knees and shoulders. Sarongs available for rent at entrances.',
    ],
    emergencyNumbers: { police: '191', ambulance: '1669', fire: '199', tourist: '1155' },
    phrases: { hello: 'Sawasdee (sah-wah-DEE) + ka/krap', thanks: 'Khop khun (kohp-KOON)', help: 'Chuay duay!', howMuch: 'Tao rai?' },
  },
};

// ── AI Food & Activity Suggestions (for Live Mode) ──
export interface AISuggestion {
  tl: string;
  l: string;
  desc: string;
  price: string;
  rating: number;
  tags: string[];
  ai: string;
  stype: 'food' | 'activity';
}

export const AI_SUGGESTIONS_DB: Record<string, AISuggestion[]> = {
  bali: [
    { tl: 'Warung Babi Guling Ibu Oka', l: 'Ubud', desc: 'Famous suckling pig — Bourdain approved', price: '$5-10', rating: 4.5, tags: ['Local', 'Famous'], ai: 'Go before noon — they sell out. The skin is unreal.', stype: 'food' },
    { tl: 'La Brisa Beach Club', l: 'Canggu', desc: 'Driftwood-chic beachfront dining', price: '$15-30', rating: 4.4, tags: ['Beach Club', 'Sunset'], ai: 'Reserve a daybed for sunset. The cocktails are artisan.', stype: 'food' },
    { tl: 'Tegallalang Swing', l: 'Ubud', desc: 'Iconic rice terrace swing photo', price: '$10-35', rating: 4.3, tags: ['Photo Spot', 'Iconic'], ai: 'Bali Swing opens at 8 AM — go first for no queue.', stype: 'activity' },
    { tl: 'Mount Batur Sunrise', l: 'Kintamani', desc: 'Volcano trek with breakfast at summit', price: '$40-60', rating: 4.8, tags: ['Trek', 'Sunrise'], ai: 'Pickup 2 AM, summit by 6 AM. Bring warm layers.', stype: 'activity' },
  ],
  paris: [
    { tl: 'L\'As du Fallafel', l: 'Le Marais', desc: 'Best falafel in Paris — always a queue', price: '€7-12', rating: 4.5, tags: ['Budget', 'Street Food'], ai: 'Special falafel with all toppings. Queue moves fast.', stype: 'food' },
    { tl: 'Pink Mamma', l: '10th Arr.', desc: '4-story Italian with rooftop terrace', price: '€15-30', rating: 4.3, tags: ['Italian', 'Trendy'], ai: 'No reservations — go at 6 PM to avoid 2-hour wait.', stype: 'food' },
    { tl: 'Montmartre Art Walk', l: '18th Arr.', desc: 'Street artists & Sacré-Cœur views', price: 'Free', rating: 4.6, tags: ['Art', 'Walking'], ai: 'Start at Abbesses metro. Place du Tertre for portraits.', stype: 'activity' },
    { tl: 'Catacombs of Paris', l: '14th Arr.', desc: 'Underground ossuary with 6M+ remains', price: '€15', rating: 4.5, tags: ['History', 'Unique'], ai: 'Book online! Walk-up lines are 2+ hours.', stype: 'activity' },
  ],
  tokyo: [
    { tl: 'Fuunji Tsukemen', l: 'Shinjuku', desc: 'Best dipping ramen in Tokyo', price: '¥1000', rating: 4.7, tags: ['Ramen', 'Famous'], ai: '30+ min queue — worth every second. Get extra noodles (kaedama).', stype: 'food' },
    { tl: 'Ichiran Ramen', l: 'Shibuya', desc: 'Solo ramen booths with custom flavor', price: '¥980', rating: 4.4, tags: ['Ramen', 'Unique'], ai: 'Order via vending machine. Customize spice, richness, garlic levels.', stype: 'food' },
    { tl: 'TeamLab Borderless', l: 'Azabudai Hills', desc: 'Immersive digital art museum', price: '¥3800', rating: 4.8, tags: ['Art', 'Unique'], ai: 'Book 2+ weeks ahead. Wear white — art projects onto you.', stype: 'activity' },
    { tl: 'Yanaka Walking Tour', l: 'Taito', desc: 'Old-Tokyo neighborhood with cat temples', price: 'Free', rating: 4.5, tags: ['Culture', 'Walking'], ai: 'Start at Nippori station. Follow the cat trail markers.', stype: 'activity' },
  ],
  dubai: [
    { tl: 'Al Ustad Special Kabab', l: 'Al Fahidi', desc: 'Dubai\'s best kebabs since 1978', price: 'AED 30-60', rating: 4.5, tags: ['Local', 'Budget'], ai: 'The seekh kebab and hummus combo is the move.', stype: 'food' },
    { tl: 'At.mosphere', l: 'Downtown', desc: 'World\'s highest restaurant — floor 122', price: 'AED 400+', rating: 4.4, tags: ['Luxury', 'Views'], ai: 'Lunch set menu is half the price of dinner.', stype: 'food' },
    { tl: 'Miracle Garden', l: 'Al Barsha', desc: '50M+ flowers in formations', price: 'AED 55', rating: 4.3, tags: ['Gardens', 'Photo Spot'], ai: 'Open Nov–May only. Go late afternoon for cooler temps.', stype: 'activity' },
    { tl: 'La Mer Beach Walk', l: 'Jumeirah', desc: 'Art murals, cafes, and waterfront stroll', price: 'Free', rating: 4.2, tags: ['Beach', 'Art'], ai: 'The street art area is very instagrammable.', stype: 'activity' },
  ],
  goa: [
    { tl: 'Fisherman\'s Wharf', l: 'Cavelossim', desc: 'Butter garlic prawns & sunset views', price: '₹800-1500', rating: 4.6, tags: ['Seafood', 'Sunset'], ai: 'Get the prawn butter garlic — it\'s legendary. Book a riverside table.', stype: 'food' },
    { tl: 'Vinayak Family Restaurant', l: 'Panjim', desc: 'Authentic Goan thali & local flavors', price: '₹150-300', rating: 4.4, tags: ['Local', 'Budget'], ai: 'Best value thali in town. Fish curry rice is a must-try.', stype: 'food' },
    { tl: 'Sunset Kayaking', l: 'Sal Backwaters', desc: 'Paddle through mangroves at golden hour', price: '₹800-1200', rating: 4.7, tags: ['Adventure', 'Nature'], ai: 'Best between 4-6 PM. Wear quick-dry clothes.', stype: 'activity' },
    { tl: 'Dolphin Spotting Boat', l: 'Sinquerim', desc: 'Morning boat ride with dolphin sightings', price: '₹500-800', rating: 4.2, tags: ['Wildlife', 'Morning'], ai: '95% sighting rate before 9 AM. Carry sunscreen.', stype: 'activity' },
  ],
  bangkok: [
    { tl: 'Jay Fai', l: 'Old City', desc: 'Michelin-star street food — crab omelette', price: '฿1000+', rating: 4.6, tags: ['Michelin', 'Famous'], ai: 'Queue from 2 PM for 5 PM opening. Cash only.', stype: 'food' },
    { tl: 'Thip Samai Pad Thai', l: 'Phra Nakhon', desc: 'Best pad thai in Bangkok since 1966', price: '฿60-100', rating: 4.5, tags: ['Street Food', 'Iconic'], ai: 'Get the version wrapped in egg. Opens 5 PM.', stype: 'food' },
    { tl: 'Khao San Road', l: 'Banglamphu', desc: 'Backpacker street — nightlife', price: 'Free', rating: 4.0, tags: ['Nightlife', 'Famous'], ai: 'Goes until 2 AM. Try scorpion on a stick if you dare.', stype: 'activity' },
    { tl: 'Rooftop at Sky Bar', l: 'Silom', desc: 'Lebua Sky Bar — Hangover II fame', price: '฿400+', rating: 4.5, tags: ['Luxury', 'Views'], ai: 'Smart dress code enforced. Go at 6 PM for golden hour.', stype: 'activity' },
  ],
};
