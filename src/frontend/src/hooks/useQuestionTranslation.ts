import { useState, useCallback, useRef } from 'react';
import { translateText, type TranslationRequest } from '../config/translation';

interface TranslationCache {
  [key: string]: string;
}

export function useQuestionTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<TranslationCache>({});
  const activeRequestRef = useRef<string | null>(null);

  const getTranslation = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) {
      return null;
    }

    // Check cache first
    if (cacheRef.current[text]) {
      return cacheRef.current[text];
    }

    // If there's already a request for this text, wait for it
    if (activeRequestRef.current === text) {
      return null;
    }

    try {
      setIsTranslating(true);
      setError(null);
      activeRequestRef.current = text;

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
      activeRequestRef.current = null;
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
