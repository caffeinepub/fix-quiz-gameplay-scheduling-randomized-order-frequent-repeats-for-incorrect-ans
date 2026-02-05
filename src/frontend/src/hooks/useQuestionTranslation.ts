import { useState, useCallback } from 'react';
import { translateText } from '../config/translation';

interface TranslationCache {
  [questionText: string]: string;
}

interface TranslationState {
  isTranslating: boolean;
  error: string | null;
}

export function useQuestionTranslation() {
  const [cache, setCache] = useState<TranslationCache>({});
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    error: null,
  });

  const getTranslation = useCallback(
    async (questionText: string): Promise<string | null> => {
      // Return cached translation if available
      if (cache[questionText]) {
        return cache[questionText];
      }

      // Prevent concurrent requests for the same question
      if (state.isTranslating) {
        return null;
      }

      setState({ isTranslating: true, error: null });

      try {
        const translatedText = await translateText({
          text: questionText,
          sourceLang: 'de',
          targetLang: 'en',
        });

        // Cache the translation
        setCache((prev) => ({
          ...prev,
          [questionText]: translatedText,
        }));

        setState({ isTranslating: false, error: null });
        return translatedText;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Translation failed';
        setState({ isTranslating: false, error: errorMessage });
        return null;
      }
    },
    [cache, state.isTranslating]
  );

  const getCachedTranslation = useCallback(
    (questionText: string): string | null => {
      return cache[questionText] || null;
    },
    [cache]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    getTranslation,
    getCachedTranslation,
    isTranslating: state.isTranslating,
    error: state.error,
    clearError,
  };
}
