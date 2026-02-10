import { useState, useCallback, useRef } from 'react';
import { translateText, type TranslationRequest } from '../config/translation';

interface TranslationCache {
  [key: string]: string;
}

export function useQuestionTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<TranslationCache>({});
  const activeRequestsRef = useRef<Set<string>>(new Set());

  const getTranslation = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) {
      return null;
    }

    // Check cache first
    if (cacheRef.current[text]) {
      return cacheRef.current[text];
    }

    // If there's already a request for this text, return null (will use cache when ready)
    if (activeRequestsRef.current.has(text)) {
      return null;
    }

    try {
      setIsTranslating(true);
      setError(null);
      activeRequestsRef.current.add(text);

      const request: TranslationRequest = {
        text,
        sourceLang: 'de',
        targetLang: 'en',
      };

      const translation = await translateText(request);
      
      // Cache the result
      if (translation) {
        cacheRef.current[text] = translation;
      }

      return translation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsTranslating(false);
      activeRequestsRef.current.delete(text);
    }
  }, []);

  const getCachedTranslation = useCallback((text: string): string | null => {
    return cacheRef.current[text] || null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    getTranslation,
    getCachedTranslation,
    isTranslating,
    error,
    clearError,
  };
}
