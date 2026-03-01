/**
 * TrailMate — Gemini 2.0 Flash Service
 * Free tier: 1,500 requests/day. Direct REST fetch, no npm dependency.
 */

import type { Activity } from '../constants/aiData';
import { getCached, setCache } from './apiCache';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

// ── Helpers ──────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return API_KEY.length > 0;
}

interface GeminiOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

async function callGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  const { temperature = 0.7, maxOutputTokens = 2048, responseMimeType } = options;

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  const response = await fetch(`${BASE_URL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// ── Chat with AI Guide ───────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function chatWithGuide(
  message: string,
  destination: string,
  history: ChatMessage[] = [],
): Promise<string> {
  if (!isConfigured()) throw new Error('Gemini not configured');

  const systemPrompt = `You are TrailMate's AI Local Guide for ${destination}. You're a knowledgeable, friendly travel assistant who gives concise, practical advice.

Rules:
- Keep responses concise (2-4 short paragraphs max)
- Use bold (**text**) for place names and key info
- Include specific practical details (prices, hours, addresses)
- Suggest insider tips that tourists wouldn't know
- Use relevant emoji sparingly (1-2 per response)
- If asked about something unrelated to travel, gently redirect
- Never make up specific prices or hours if unsure — say "check locally"`;

  const conversationParts = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `I'm your AI Local Guide for ${destination}! I know this place inside and out. Ask me anything about restaurants, hidden gems, transport, safety, or local customs.` }] },
      ...conversationParts,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${BASE_URL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Gemini chat error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty chat response');
  return text;
}

// ── Time helpers for itinerary constraints ────────────────────────────────

function to24hForPrompt(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '12:00';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function addHours(time24: string, hours: number): string {
  const [h, m] = time24.split(':').map(Number);
  const newH = Math.min(h + hours, 23);
  return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function subtractHours(time24: string, hours: number): string {
  const [h, m] = time24.split(':').map(Number);
  const newH = Math.max(h - hours, 0);
  return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// ── Generate Itinerary ───────────────────────────────────────────────────

export async function generateItineraryFromAI(
  destination: string,
  numDays: number,
  styles: string[],
  tripType: 'solo' | 'group',
  arrivalTime?: string,
  departureTime?: string,
  hasFlightBooking?: boolean,
): Promise<Record<number, Activity[]>> {
  if (!isConfigured()) throw new Error('Gemini not configured');

  const cacheKey = `itinerary_${destination}_${numDays}_${styles.join(',')}_${tripType}_${arrivalTime || ''}_${departureTime || ''}`;
  const cached = await getCached<Record<number, Activity[]>>(cacheKey);
  if (cached) return cached;

  const styleDesc = styles.length > 0 ? styles.join(', ') : 'balanced mix of culture, food, and sightseeing';

  // Build time constraints block
  let timeConstraints = '';
  if (arrivalTime || departureTime) {
    const parts: string[] = [];
    if (arrivalTime) {
      // Convert 12h to 24h for the prompt
      const arr24 = to24hForPrompt(arrivalTime);
      const arrPlus2 = addHours(arr24, 2);
      if (numDays === 1 && departureTime) {
        parts.push(`SINGLE-DAY TRIP: Traveler arrives at ${arr24}. Add 2 hours for hotel check-in and settling. First activity no earlier than ${arrPlus2}. Do NOT schedule activities before arrival.`);
      } else {
        parts.push(`DAY 1 ARRIVAL: Traveler arrives at ${arr24}. Add 2 hours for hotel check-in and settling. First activity no earlier than ${arrPlus2}. Do NOT schedule activities before arrival.`);
      }
    }
    if (departureTime) {
      const dep24 = to24hForPrompt(departureTime);
      if (numDays === 1 && arrivalTime) {
        const cutoff = subtractHours(dep24, hasFlightBooking ? 3 : 1);
        parts.push(`Traveler departs at ${dep24}. ${hasFlightBooking ? 'Keep 3 hours before departure for airport transit and check-in.' : 'Keep 1 hour before departure.'} Only plan activities before ${cutoff}.`);
      } else if (hasFlightBooking) {
        const cutoff = subtractHours(dep24, 3);
        parts.push(`LAST DAY DEPARTURE: Traveler departs at ${dep24}. Keep 3 hours before departure for airport transit and check-in. Only plan morning activities if there is enough time before ${cutoff}.`);
      } else {
        const cutoff = subtractHours(dep24, 1);
        parts.push(`LAST DAY DEPARTURE: Traveler departs at ${dep24}. Keep 1 hour before departure. Plan activities before ${cutoff}.`);
      }
    }
    timeConstraints = '\n\nTIME CONSTRAINTS:\n' + parts.join('\n');
  }

  const prompt = `Create a ${numDays}-day travel itinerary for ${destination} for a ${tripType} trip.
Travel style preferences: ${styleDesc}.${timeConstraints}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "1": [
    {"tl": "Activity title", "t": "14:00", "dr": "1h", "l": "Location/area", "tp": "hotel", "i": "🏨", "ai": "Insider tip for this activity"}
  ],
  "2": [...]
}

Rules for the JSON:
- "tp" must be one of: hotel, food, sightseeing, culture, activity, beach, nightlife, wellness, shopping, transport
- "i" should be a relevant emoji
- "t" is 24-hour time format
- "dr" is duration like "1h", "2h", "45m", "1.5h"
- "ai" should be a specific, practical insider tip
- Include 4-6 activities per day
- First day should start with hotel check-in
- Include a mix of food spots and activities
- Last day should end with departure/checkout
- Use real place names and locations for ${destination}
- Include fewer activities on arrival/departure days when time is limited
- Activities must not overlap — each starts after the previous ends
- Include realistic travel time between distant locations`;

  const response = await callGemini(prompt, {
    temperature: 0.7,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  });

  try {
    const parsed = JSON.parse(response);
    // Convert string keys to number keys
    const result: Record<number, Activity[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[parseInt(key, 10)] = value as Activity[];
    }
    await setCache(cacheKey, result);
    return result;
  } catch {
    throw new Error('Failed to parse itinerary JSON from Gemini');
  }
}

// ── Context-Aware Chat ───────────────────────────────────────────────────

export interface LiveContext {
  weather?: { temp: number; condition: string; alert?: string; humidity?: number; windSpeed?: number; visibility?: number };
  forecast?: Array<{ date: string; high: number; low: number; condition: string; pop: number }>;
  sunrise?: string;
  sunset?: string;
  aqi?: { label: string; advice: string };
  currentDay?: number;
  totalDays?: number;
  todayActivities?: string[];
  localCurrency?: string;
  exchangeRate?: { from: string; to: string; rate: number };
  localTime?: string;          // e.g. "14:30"
  localDayOfWeek?: string;     // e.g. "Monday"
  trafficCondition?: string;   // e.g. "Heavy — rush hour" or "Light — off-peak"
}

export async function chatWithGuideContextual(
  message: string,
  destination: string,
  history: ChatMessage[] = [],
  context?: LiveContext,
): Promise<string> {
  if (!isConfigured()) throw new Error('Gemini not configured');

  let contextBlock = '';
  if (context) {
    const parts: string[] = [];
    if (context.weather) {
      parts.push(`Current weather: ${context.weather.temp}°C, ${context.weather.condition}${context.weather.alert ? ` (Alert: ${context.weather.alert})` : ''}, humidity ${context.weather.humidity || '--'}%, wind ${context.weather.windSpeed || '--'} m/s`);
    }
    if (context.sunrise && context.sunset) {
      parts.push(`Sunrise: ${context.sunrise}, Sunset: ${context.sunset}`);
    }
    if (context.aqi) {
      parts.push(`Air quality: ${context.aqi.label} — ${context.aqi.advice}`);
    }
    if (context.forecast?.length) {
      const fStr = context.forecast.slice(0, 3).map(f => `${f.date}: ${f.high}°/${f.low}° ${f.condition}${f.pop > 30 ? ` (${f.pop}% rain)` : ''}`).join(', ');
      parts.push(`Forecast: ${fStr}`);
    }
    if (context.currentDay && context.totalDays) {
      parts.push(`Trip day ${context.currentDay} of ${context.totalDays}`);
    }
    if (context.todayActivities?.length) {
      parts.push(`Today's plan: ${context.todayActivities.join(' → ')}`);
    }
    if (context.exchangeRate) {
      parts.push(`Exchange rate: 1 ${context.exchangeRate.from} = ${context.exchangeRate.rate} ${context.exchangeRate.to}`);
    }
    if (context.localTime && context.localDayOfWeek) {
      parts.push(`Local time: ${context.localTime} (${context.localDayOfWeek})`);
    }
    if (context.trafficCondition) {
      parts.push(`Traffic: ${context.trafficCondition}`);
    }
    if (parts.length > 0) {
      contextBlock = `\n\nLIVE CONTEXT (use this to give relevant, timely advice):\n${parts.join('\n')}`;
    }
  }

  const systemPrompt = `You are TrailMate's AI Local Guide for ${destination}. You're a knowledgeable, friendly travel assistant who gives concise, practical advice.

Rules:
- Keep responses concise (2-4 short paragraphs max)
- Use bold (**text**) for place names and key info
- Include specific practical details (prices, hours, addresses)
- Suggest insider tips that tourists wouldn't know
- Use relevant emoji sparingly (1-2 per response)
- If asked about something unrelated to travel, gently redirect
- Never make up specific prices or hours if unsure — say "check locally"
- When you have live context, proactively mention relevant info (e.g. "it's raining, so..." or "sunset is at 6:30, perfect time for...")
- When asked about WEATHER: use the live weather data to give accurate current conditions, what to wear, and whether to carry an umbrella. Reference the forecast for upcoming days.
- When asked about TRAFFIC: use the local time, day of week, and traffic condition to advise on best transport, rush hour avoidance, and travel times between areas. Share knowledge about common congestion points, peak hours, and best alternatives (metro, walking, ride-share) for ${destination}.
- When asked about GETTING AROUND / TRANSPORT: combine traffic awareness with local transport tips (metro lines, bus routes, ride-hailing apps, walking districts)${contextBlock}`;

  const conversationParts = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const body = {
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `I'm your AI Local Guide for ${destination}! I have real-time weather and local info to help you right now. What do you need?` }] },
      ...conversationParts,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${BASE_URL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`Gemini chat error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty chat response');
  return text;
}

// ── Generate Smart Daily Briefing ────────────────────────────────────────

export async function generateDailyBriefing(
  destination: string,
  context: LiveContext,
): Promise<string> {
  if (!isConfigured()) throw new Error('Gemini not configured');

  const cacheKey = `briefing_${destination}_${context.currentDay || 1}_${new Date().toISOString().split('T')[0]}`;
  const cached = await getCached<string>(cacheKey);
  if (cached) return cached;

  const parts: string[] = [`Destination: ${destination}`];
  if (context.weather) {
    parts.push(`Weather: ${context.weather.temp}°C, ${context.weather.condition}${context.weather.alert ? `. Alert: ${context.weather.alert}` : ''}`);
  }
  if (context.sunrise && context.sunset) {
    parts.push(`Sunrise: ${context.sunrise}, Sunset: ${context.sunset}`);
  }
  if (context.aqi) {
    parts.push(`Air quality: ${context.aqi.label}`);
  }
  if (context.forecast?.length) {
    parts.push(`Tomorrow: ${context.forecast[0].high}°/${context.forecast[0].low}° ${context.forecast[0].condition}`);
  }
  if (context.currentDay && context.totalDays) {
    parts.push(`Day ${context.currentDay} of ${context.totalDays}`);
  }
  if (context.todayActivities?.length) {
    parts.push(`Planned: ${context.todayActivities.join(', ')}`);
  }

  const prompt = `Generate a short, friendly morning travel briefing (3-4 sentences max) for a traveler.

${parts.join('\n')}

Rules:
- Start with a warm greeting based on the weather
- Mention one practical weather tip if relevant
- Reference their planned activities with a helpful suggestion
- End with an encouraging note for the day
- Keep it concise and personal — like a friend texting you
- No bullet points, just flowing text
- Use 1-2 emoji max`;

  try {
    const response = await callGemini(prompt, {
      temperature: 0.8,
      maxOutputTokens: 256,
    });
    await setCache(cacheKey, response);
    return response;
  } catch {
    throw new Error('Briefing generation failed');
  }
}

// ── Generate AI Tips for Places ──────────────────────────────────────────

export async function generateAITips(
  placeNames: string[],
  destination: string,
): Promise<Record<string, string>> {
  if (!isConfigured() || placeNames.length === 0) return {};

  const cacheKey = `tips_${destination}_${placeNames.slice(0, 5).join(',')}`;
  const cached = await getCached<Record<string, string>>(cacheKey);
  if (cached) return cached;

  const prompt = `For each place in ${destination}, give a single concise insider tip (1 sentence, practical and specific). Return ONLY valid JSON (no markdown, no code blocks):

Places: ${placeNames.join(', ')}

Format: {"Place Name": "Insider tip here"}`;

  try {
    const response = await callGemini(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    });

    const tips = JSON.parse(response);
    await setCache(cacheKey, tips);
    return tips;
  } catch {
    return {};
  }
}
