/**
 * TrailMate — Flight Status Service
 * AviationStack free tier: 100 calls/month.
 * Use sparingly — only when user explicitly checks a flight.
 */

import { getCached, setCache } from './apiCache';

const API_KEY = process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY || '';
const BASE_URL = 'https://api.aviationstack.com/v1';

function isConfigured(): boolean {
  return API_KEY.length > 0;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'diverted' | 'unknown';
  statusLabel: string;
  statusColor: string;
  departure: {
    airport: string;
    iata: string;
    scheduled: string;    // "14:30"
    estimated: string;    // "14:45"
    terminal?: string;
    gate?: string;
    delay?: number;       // minutes
  };
  arrival: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated: string;
    terminal?: string;
    gate?: string;
    delay?: number;
  };
}

// ── Status mapping ───────────────────────────────────────────────────────

function mapStatus(status: string): { status: FlightInfo['status']; label: string; color: string } {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return { status: 'scheduled', label: 'On Time', color: '#4CAF50' };
    case 'active':
      return { status: 'active', label: 'In Flight', color: '#2196F3' };
    case 'landed':
      return { status: 'landed', label: 'Landed', color: '#4CAF50' };
    case 'cancelled':
      return { status: 'cancelled', label: 'Cancelled', color: '#F44336' };
    case 'diverted':
      return { status: 'diverted', label: 'Diverted', color: '#FF9800' };
    default:
      return { status: 'unknown', label: 'Unknown', color: '#9E9E9E' };
  }
}

function formatFlightTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  try {
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return '--:--';
  }
}

// ── Lookup Flight ────────────────────────────────────────────────────────

export async function lookupFlight(flightNumber: string): Promise<FlightInfo | null> {
  if (!isConfigured()) return null;

  // Normalize: "AI 101" → "AI101", "6E 2341" → "6E2341"
  const normalized = flightNumber.replace(/\s+/g, '').toUpperCase();

  const cacheKey = `flight_${normalized}`;
  const cached = await getCached<FlightInfo>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/flights?access_key=${API_KEY}&flight_iata=${normalized}&limit=1`
    );
    if (!response.ok) return null;
    const data = await response.json();

    const flight = data.data?.[0];
    if (!flight) return null;

    const statusInfo = mapStatus(flight.flight_status);
    const depDelay = flight.departure?.delay;
    const arrDelay = flight.arrival?.delay;

    // Override status label if delayed
    let statusLabel = statusInfo.label;
    let statusColor = statusInfo.color;
    if (depDelay && depDelay > 0 && statusInfo.status === 'scheduled') {
      statusLabel = `Delayed ${depDelay}min`;
      statusColor = '#FF9800';
    }

    const result: FlightInfo = {
      flightNumber: normalized,
      airline: flight.airline?.name || '',
      status: statusInfo.status,
      statusLabel,
      statusColor,
      departure: {
        airport: flight.departure?.airport || '',
        iata: flight.departure?.iata || '',
        scheduled: formatFlightTime(flight.departure?.scheduled),
        estimated: formatFlightTime(flight.departure?.estimated || flight.departure?.scheduled),
        terminal: flight.departure?.terminal || undefined,
        gate: flight.departure?.gate || undefined,
        delay: depDelay || undefined,
      },
      arrival: {
        airport: flight.arrival?.airport || '',
        iata: flight.arrival?.iata || '',
        scheduled: formatFlightTime(flight.arrival?.scheduled),
        estimated: formatFlightTime(flight.arrival?.estimated || flight.arrival?.scheduled),
        terminal: flight.arrival?.terminal || undefined,
        gate: flight.arrival?.gate || undefined,
        delay: arrDelay || undefined,
      },
    };

    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
