/**
 * TraiMate — OpenWeatherMap Service
 * Current weather, 5-day forecast, AQI, sunrise/sunset.
 * Free tier: 1,000 calls/day.
 */

import { getCached, setCache } from './apiCache';

const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org';

function isConfigured(): boolean {
  return API_KEY.length > 0;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface RealWeather {
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;           // Ionicons name
  humidity: number;
  windSpeed: number;      // m/s
  visibility: number;     // km
  alert?: string;
  sunrise: string;        // "06:30"
  sunset: string;         // "18:45"
  timezone: number;       // offset in seconds from UTC
}

export interface ForecastDay {
  date: string;           // "Mon", "Tue"
  dateISO: string;        // "2026-03-02"
  high: number;
  low: number;
  condition: string;
  icon: string;           // Ionicons name
  pop: number;            // probability of precipitation 0-100
}

export interface AirQuality {
  aqi: number;            // 1-5 scale
  label: string;          // "Good", "Moderate", etc.
  color: string;          // hex color
  advice: string;
}

// ── Weather condition → Ionicons mapping ─────────────────────────────────

function mapWeatherIcon(owmIcon: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'sunny',
    '01n': 'moon',
    '02d': 'partly-sunny',
    '02n': 'cloudy-night',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rainy',
    '09n': 'rainy',
    '10d': 'rainy',
    '10n': 'rainy',
    '11d': 'thunderstorm',
    '11n': 'thunderstorm',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'water',
    '50n': 'water',
  };
  return iconMap[owmIcon] || 'partly-sunny';
}

function formatTime(unixTimestamp: number, timezoneOffset: number): string {
  const date = new Date((unixTimestamp + timezoneOffset) * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function generateWeatherAlert(data: any): string | undefined {
  const temp = Math.round(data.main.temp);
  const weather = data.weather?.[0];
  const alerts: string[] = [];

  if (temp >= 38) alerts.push('Extreme heat — stay hydrated and avoid midday sun');
  else if (temp >= 35) alerts.push('Very hot — schedule indoor activities between 12-3 PM');
  else if (temp <= 5) alerts.push('Very cold — layer up and carry hand warmers');

  if (weather?.main === 'Thunderstorm') alerts.push('Thunderstorms — avoid open areas and seek shelter');
  else if (weather?.main === 'Rain' || weather?.main === 'Drizzle') alerts.push('Rain expected — carry an umbrella');
  else if (weather?.main === 'Snow') alerts.push('Snowfall — wear warm waterproof shoes');

  if (data.main.humidity > 85 && temp > 28) alerts.push('High humidity — stay hydrated');
  if (data.wind?.speed > 10) alerts.push('Strong winds — secure loose items');
  if (data.visibility && data.visibility < 1000) alerts.push('Low visibility — be careful on roads');

  return alerts.length > 0 ? alerts[0] : undefined;
}

// ── Geocode destination → lat/lon ────────────────────────────────────────

async function geocode(destination: string): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `geo_${destination.toLowerCase().trim()}`;
  const cached = await getCached<{ lat: number; lon: number }>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.[0]) return null;
    const result = { lat: data[0].lat, lon: data[0].lon };
    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ── Current Weather ──────────────────────────────────────────────────────

export async function getCurrentWeather(destination: string): Promise<RealWeather | null> {
  if (!isConfigured()) return null;

  const cacheKey = `weather_${destination.toLowerCase().trim()}`;
  const cached = await getCached<RealWeather>(cacheKey);
  if (cached) return cached;

  const coords = await geocode(destination);
  if (!coords) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();

    const result: RealWeather = {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather?.[0]?.main || 'Clear',
      description: data.weather?.[0]?.description || '',
      icon: mapWeatherIcon(data.weather?.[0]?.icon || '01d'),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind?.speed * 10) / 10,
      visibility: Math.round((data.visibility || 10000) / 1000),
      alert: generateWeatherAlert(data),
      sunrise: formatTime(data.sys.sunrise, data.timezone),
      sunset: formatTime(data.sys.sunset, data.timezone),
      timezone: data.timezone,
    };

    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ── 5-Day Forecast ───────────────────────────────────────────────────────

export async function getForecast(destination: string): Promise<ForecastDay[]> {
  if (!isConfigured()) return [];

  const cacheKey = `forecast_${destination.toLowerCase().trim()}`;
  const cached = await getCached<ForecastDay[]>(cacheKey);
  if (cached) return cached;

  const coords = await geocode(destination);
  if (!coords) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${API_KEY}`
    );
    if (!response.ok) return [];
    const data = await response.json();

    // Group by day, pick midday reading for each
    const dayMap = new Map<string, { temps: number[]; weather: any; pop: number }>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const item of data.list) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const existing = dayMap.get(dateKey);

      if (!existing) {
        dayMap.set(dateKey, {
          temps: [item.main.temp],
          weather: item.weather?.[0],
          pop: (item.pop || 0) * 100,
        });
      } else {
        existing.temps.push(item.main.temp);
        existing.pop = Math.max(existing.pop, (item.pop || 0) * 100);
        // Prefer midday weather (12:00)
        const hour = date.getHours();
        if (hour >= 11 && hour <= 14) {
          existing.weather = item.weather?.[0];
        }
      }
    }

    const forecast: ForecastDay[] = [];
    // Skip today, take next 5 days
    const today = new Date().toISOString().split('T')[0];
    for (const [dateKey, info] of dayMap) {
      if (dateKey === today) continue;
      if (forecast.length >= 5) break;

      const date = new Date(dateKey);
      forecast.push({
        date: dayNames[date.getDay()],
        dateISO: dateKey,
        high: Math.round(Math.max(...info.temps)),
        low: Math.round(Math.min(...info.temps)),
        condition: info.weather?.main || 'Clear',
        icon: mapWeatherIcon(info.weather?.icon || '01d'),
        pop: Math.round(info.pop),
      });
    }

    await setCache(cacheKey, forecast);
    return forecast;
  } catch {
    return [];
  }
}

// ── Air Quality Index ────────────────────────────────────────────────────

const AQI_LABELS: Record<number, { label: string; color: string; advice: string }> = {
  1: { label: 'Good', color: '#4CAF50', advice: 'Great for outdoor activities' },
  2: { label: 'Fair', color: '#8BC34A', advice: 'Acceptable for most people' },
  3: { label: 'Moderate', color: '#FF9800', advice: 'Sensitive groups should limit outdoor exertion' },
  4: { label: 'Poor', color: '#F44336', advice: 'Consider wearing a mask outdoors' },
  5: { label: 'Very Poor', color: '#9C27B0', advice: 'Avoid outdoor activities — wear a mask' },
};

export async function getAirQuality(destination: string): Promise<AirQuality | null> {
  if (!isConfigured()) return null;

  const cacheKey = `aqi_${destination.toLowerCase().trim()}`;
  const cached = await getCached<AirQuality>(cacheKey);
  if (cached) return cached;

  const coords = await geocode(destination);
  if (!coords) return null;

  try {
    const response = await fetch(
      `${BASE_URL}/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}`
    );
    if (!response.ok) return null;
    const data = await response.json();

    const aqi = data.list?.[0]?.main?.aqi || 1;
    const aqiInfo = AQI_LABELS[aqi] || AQI_LABELS[1];

    const result: AirQuality = {
      aqi,
      label: aqiInfo.label,
      color: aqiInfo.color,
      advice: aqiInfo.advice,
    };

    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
