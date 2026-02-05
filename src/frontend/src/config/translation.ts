// Translation service configuration
// Uses a mock translation endpoint by default
// Set VITE_TRANSLATION_API_URL in .env to use a real translation service

const TRANSLATION_API_URL = import.meta.env.VITE_TRANSLATION_API_URL || 'https://api.mymemory.translated.net/get';

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  translatedText: string;
}

export async function translateText(request: TranslationRequest): Promise<string> {
  try {
    // Using MyMemory Translation API as a free fallback
    // Format: https://api.mymemory.translated.net/get?q=TEXT&langpair=SOURCE|TARGET
    const url = `${TRANSLATION_API_URL}?q=${encodeURIComponent(request.text)}&langpair=${request.sourceLang}|${request.targetLang}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // MyMemory API response format
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    
    throw new Error('Invalid translation response format');
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text. Please try again.');
  }
}
