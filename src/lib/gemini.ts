/**
 * TraiMate — Gemini 2.0 Flash Service
 * Free tier: 1,500 requests/day. Direct REST fetch, no npm dependency.
 */

import type { Activity } from '../constants/aiData';
import { getCached, setCache } from './apiCache';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.0-flash';
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

  const systemPrompt = `You are TraiMate's AI Local Guide for ${destination}. You're a knowledgeable, friendly travel assistant who gives concise, practical advice.

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

// ── Generate Itinerary ───────────────────────────────────────────────────

export async function generateItineraryFromAI(
  destination: string,
  numDays: number,
  styles: string[],
  tripType: 'solo' | 'group',
): Promise<Record<number, Activity[]>> {
  if (!isConfigured()) throw new Error('Gemini not configured');

  const cacheKey = `itinerary_${destination}_${numDays}_${styles.join(',')}_${tripType}`;
  const cached = await getCached<Record<number, Activity[]>>(cacheKey);
  if (cached) return cached;

  const styleDesc = styles.length > 0 ? styles.join(', ') : 'balanced mix of culture, food, and sightseeing';

  const prompt = `Create a ${numDays}-day travel itinerary for ${destination} for a ${tripType} trip.
Travel style preferences: ${styleDesc}.

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
- Use real place names and locations for ${destination}`;

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
  weather?: { temp: number; condition: string; alert?: string; humidity?: number; windSpeed?: number };
  forecast?: Array<{ date: string; high: number; low: number; condition: string; pop: number }>;
  sunrise?: string;
  sunset?: string;
  aqi?: { label: string; advice: string };
  currentDay?: number;
  totalDays?: number;
  todayActivities?: string[];
  localCurrency?: string;
  exchangeRate?: { from: string; to: string; rate: number };
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
    if (parts.length > 0) {
      contextBlock = `\n\nLIVE CONTEXT (use this to give relevant, timely advice):\n${parts.join('\n')}`;
    }
  }

  const systemPrompt = `You are TraiMate's AI Local Guide for ${destination}. You're a knowledgeable, friendly travel assistant who gives concise, practical advice.

Rules:
- Keep responses concise (2-4 short paragraphs max)
- Use bold (**text**) for place names and key info
- Include specific practical details (prices, hours, addresses)
- Suggest insider tips that tourists wouldn't know
- Use relevant emoji sparingly (1-2 per response)
- If asked about something unrelated to travel, gently redirect
- Never make up specific prices or hours if unsure — say "check locally"
- When you have live context, proactively mention relevant info (e.g. "it's raining, so..." or "sunset is at 6:30, perfect time for...")${contextBlock}`;

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
