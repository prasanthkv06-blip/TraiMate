/**
 * TrailMate — API Cache Layer
 * In-memory Map (30min TTL) + AsyncStorage (24hr TTL)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMORY_TTL = 30 * 60 * 1000;   // 30 minutes
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = 'traimate_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>();

export async function getCached<T>(key: string): Promise<T | null> {
  // 1. Check memory cache
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry && Date.now() - memEntry.timestamp < MEMORY_TTL) {
    return memEntry.data;
  }

  // 2. Check AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() - entry.timestamp < STORAGE_TTL) {
        // Promote back to memory cache
        memoryCache.set(key, entry);
        return entry.data;
      }
      // Expired — clean up
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    }
  } catch {
    // Storage read failed — continue without cache
  }

  return null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };

  // Write to memory
  memoryCache.set(key, entry);

  // Write to AsyncStorage (fire and forget)
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage write failed — memory cache still works
  }
}

export async function invalidateCache(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignore
  }
}
