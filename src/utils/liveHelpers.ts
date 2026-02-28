import { AI_GUIDE_DB, AI_SUGGESTIONS_DB, type AISuggestion } from '../constants/aiData';
import type { ItineraryDay, ItineraryItem } from './itineraryGenerator';

// Check if trip is currently active
export function isTripLive(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return false;
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return now >= start && now <= end;
}

// Check if trip starts tomorrow
export function isTripTomorrow(startDate?: string): boolean {
  if (!startDate) return false;
  const now = new Date();
  const start = new Date(startDate);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return start.toDateString() === tomorrow.toDateString();
}

// Get current day number (1-indexed)
export function getCurrentDayNumber(startDate?: string): number {
  if (!startDate) return 1;
  const now = new Date();
  const start = new Date(startDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// Get itinerary for today
export function getTodayItinerary(itinerary: ItineraryDay[], dayNumber: number): ItineraryDay | null {
  return itinerary.find(d => d.dayNumber === dayNumber) || null;
}

// Get greeting based on time
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Weather type
export interface SimulatedWeather {
  temp: number;
  condition: string;
  icon: string;
  alert?: string;
}

// Deterministic weather per destination
export function getSimulatedWeather(destination: string): SimulatedWeather {
  const key = destination.toLowerCase();
  if (key.includes('bali')) return { temp: 31, condition: 'Humid', icon: 'partly-sunny', alert: 'Tropical showers expected after 3 PM' };
  if (key.includes('tokyo') || key.includes('kyoto')) return { temp: 24, condition: 'Clear', icon: 'sunny' };
  if (key.includes('paris')) return { temp: 18, condition: 'Cloudy', icon: 'cloudy', alert: 'Light rain possible in afternoon' };
  if (key.includes('dubai')) return { temp: 38, condition: 'Hot', icon: 'sunny', alert: 'Stay hydrated — extreme heat advisory' };
  if (key.includes('goa')) return { temp: 29, condition: 'Sunny', icon: 'sunny' };
  if (key.includes('bangkok')) return { temp: 33, condition: 'Humid', icon: 'partly-sunny', alert: 'Afternoon thunderstorms likely' };
  return { temp: 25, condition: 'Pleasant', icon: 'partly-sunny' };
}

// Get pre-trip alerts from AI_GUIDE_DB
export function getPreTripAlerts(destination: string): Array<{ text: string; type: string; emoji: string }> {
  const key = destination.toLowerCase().split(',')[0].trim();
  // Lookup in AI_GUIDE_DB
  const guide = AI_GUIDE_DB[key];
  if (guide) return guide.alerts;
  // Try partial match
  for (const [k, v] of Object.entries(AI_GUIDE_DB)) {
    if (key.includes(k) || k.includes(key)) return v.alerts;
  }
  return [
    { text: 'Check your passport validity — needs 6+ months', type: 'warning', emoji: '📋' },
    { text: 'Download offline maps for your destination', type: 'tip', emoji: '🗺️' },
  ];
}

// Get trending suggestions from AI_SUGGESTIONS_DB
export function getTrendingSuggestions(destination: string): AISuggestion[] {
  const key = destination.toLowerCase().split(',')[0].trim();
  const suggestions = AI_SUGGESTIONS_DB[key];
  if (suggestions) return suggestions;
  for (const [k, v] of Object.entries(AI_SUGGESTIONS_DB)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return [];
}

// AI reschedule suggestion type
export interface AIRescheduleSuggestion {
  id: number;
  icon: string;
  title: string;
  reason: string;
  type: 'reschedule' | 'add';
}

// Generate AI reschedule suggestions based on weather + today's items
export function generateAIRescheduleSuggestions(
  todayItems: ItineraryItem[],
  weather: SimulatedWeather,
): AIRescheduleSuggestion[] {
  const suggestions: AIRescheduleSuggestion[] = [];
  let idCounter = 0;

  // Weather-based suggestions
  if (weather.alert && (weather.condition === 'Humid' || weather.icon === 'rainy' || weather.alert.toLowerCase().includes('rain'))) {
    const outdoorItem = todayItems.find(it =>
      it.type === 'sightseeing' || it.type === 'activity' || it.type === 'beach'
    );
    if (outdoorItem) {
      suggestions.push({
        id: idCounter++,
        icon: 'rainy-outline',
        title: `Move "${outdoorItem.title}" to morning`,
        reason: 'Rain expected later — reschedule outdoor activities early',
        type: 'reschedule',
      });
    }
  }

  if (weather.temp >= 35) {
    suggestions.push({
      id: idCounter++,
      icon: 'water-outline',
      title: 'Add a midday break',
      reason: `${weather.temp}°C — schedule indoor activities between 12-3 PM`,
      type: 'add',
    });
  }

  // If no weather-specific suggestions, add generic ones
  if (suggestions.length === 0) {
    suggestions.push({
      id: idCounter++,
      icon: 'restaurant-outline',
      title: 'Add a trending local spot',
      reason: 'Highly rated nearby restaurant discovered',
      type: 'add',
    });
  }

  return suggestions.slice(0, 2);
}
