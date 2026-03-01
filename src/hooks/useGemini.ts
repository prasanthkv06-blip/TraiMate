/**
 * TrailMate — Gemini AI React Hooks
 */

import { useState, useRef, useCallback } from 'react';
import { chatWithGuide, generateItineraryFromAI, type ChatMessage } from '../lib/gemini';
import type { Activity } from '../constants/aiData';

// ── useAIChat ────────────────────────────────────────────────────────────

interface AIChatResult {
  sendMessage: (message: string) => Promise<string>;
  history: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  clearHistory: () => void;
}

export function useAIChat(destination: string): AIChatResult {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setIsTyping(true);
    setError(null);

    try {
      const response = await chatWithGuide(message, destination, history);

      if (mountedRef.current) {
        setHistory(prev => [
          ...prev,
          { role: 'user', text: message },
          { role: 'model', text: response },
        ]);
      }

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'AI chat failed';
      if (mountedRef.current) setError(errorMsg);
      throw err;
    } finally {
      if (mountedRef.current) setIsTyping(false);
    }
  }, [destination, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setError(null);
  }, []);

  return { sendMessage, history, isTyping, error, clearHistory };
}

// ── useAIItinerary ───────────────────────────────────────────────────────

interface AIItineraryResult {
  generate: (
    destination: string,
    numDays: number,
    styles: string[],
    tripType: 'solo' | 'group',
  ) => Promise<Record<number, Activity[]>>;
  isGenerating: boolean;
  error: string | null;
}

export function useAIItinerary(): AIItineraryResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    destination: string,
    numDays: number,
    styles: string[],
    tripType: 'solo' | 'group',
  ): Promise<Record<number, Activity[]>> => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateItineraryFromAI(destination, numDays, styles, tripType);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Itinerary generation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, error };
}
