import { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiService, GeminiResponse, GeminiError, GeminiErrorType } from '../services/GeminiService';
import { useSettingsStore } from '../stores/settingsStore';
import debounce from 'lodash.debounce';

/**
 * Hook for interacting with the Google Gemini API
 */
export function useGemini() {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<GeminiErrorType | null>(null);
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCountRef = useRef(0);
  
  // Services
  const geminiService = GeminiService.getInstance();
  const { apiKeys, features } = useSettingsStore();
  
  // Derived state
  const isConfigured = !!apiKeys.googleGemini;
  const isWebSurfingEnabled = isConfigured && features.webSurfing;
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cancel any in-flight requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  /**
   * Handles errors from the Gemini API
   */
  const handleGeminiError = (error: unknown): string => {
    if (error instanceof GeminiError) {
      setErrorType(error.type);
      return error.message;
    } else if (error instanceof Error) {
      setErrorType(GeminiErrorType.UNKNOWN_ERROR);
      return error.message;
    } else {
      setErrorType(GeminiErrorType.UNKNOWN_ERROR);
      return 'Unknown error occurred';
    }
  };
  
  /**
   * Generates a response from the Gemini API
   */
  const generateResponse = useCallback(async (
    prompt: string,
    options?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
      useCache?: boolean;
    }
  ): Promise<GeminiResponse | null> => {
    if (!isConfigured) {
      const errorMessage = 'Google Gemini API key is not set. Please add it in the settings.';
      setError(errorMessage);
      setErrorType(GeminiErrorType.MISSING_API_KEY);
      return null;
    }
    
    // Cancel any previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    // Track request count to handle race conditions
    const requestId = ++requestCountRef.current;
    
    setIsLoading(true);
    setError(null);
    setErrorType(null);
    
    try {
      const response = await geminiService.generateResponse(prompt, options);
      
      // Only update state if this is the most recent request
      if (requestId === requestCountRef.current) {
        setIsLoading(false);
      }
      
      return response;
    } catch (err) {
      // Only update state if this is the most recent request
      if (requestId === requestCountRef.current) {
        const errorMessage = handleGeminiError(err);
        setError(errorMessage);
        setIsLoading(false);
      }
      return null;
    }
  }, [isConfigured, geminiService]);
  
  /**
   * Debounced version of generateResponse to prevent rapid API calls
   */
  const debouncedGenerateResponse = useCallback(
    debounce(generateResponse, 300),
    [generateResponse]
  );
  
  /**
   * Uses Gemini to browse the web for information
   */
  const browseWeb = useCallback(async (query: string): Promise<GeminiResponse | null> => {
    if (!isConfigured) {
      const errorMessage = 'Google Gemini API key is not set. Please add it in the settings.';
      setError(errorMessage);
      setErrorType(GeminiErrorType.MISSING_API_KEY);
      return null;
    }
    
    if (!isWebSurfingEnabled) {
      const errorMessage = 'Web surfing feature is disabled. Please enable it in the settings.';
      setError(errorMessage);
      setErrorType(GeminiErrorType.FEATURE_DISABLED);
      return null;
    }
    
    // Cancel any previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    // Track request count to handle race conditions
    const requestId = ++requestCountRef.current;
    
    setIsLoading(true);
    setError(null);
    setErrorType(null);
    
    try {
      const response = await geminiService.browseWeb(query);
      
      // Only update state if this is the most recent request
      if (requestId === requestCountRef.current) {
        setIsLoading(false);
      }
      
      return response;
    } catch (err) {
      // Only update state if this is the most recent request
      if (requestId === requestCountRef.current) {
        const errorMessage = handleGeminiError(err);
        setError(errorMessage);
        setIsLoading(false);
      }
      return null;
    }
  }, [isConfigured, isWebSurfingEnabled, geminiService]);
  
  /**
   * Debounced version of browseWeb to prevent rapid API calls
   */
  const debouncedBrowseWeb = useCallback(
    debounce(browseWeb, 500),
    [browseWeb]
  );
  
  /**
   * Cancels any in-flight requests
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Tests if an API key is valid
   */
  const testApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorType(null);
      
      const isValid = await geminiService.testApiKey(apiKey);
      
      setIsLoading(false);
      return isValid;
    } catch (err) {
      const errorMessage = handleGeminiError(err);
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [geminiService]);
  
  /**
   * Clears the response cache
   */
  const clearCache = useCallback(() => {
    geminiService.clearCache();
  }, [geminiService]);
  
  return {
    // Core methods
    generateResponse,
    debouncedGenerateResponse,
    browseWeb,
    debouncedBrowseWeb,
    cancelRequest,
    testApiKey,
    clearCache,
    
    // State
    isLoading,
    error,
    errorType,
    
    // Derived state
    isConfigured,
    isWebSurfingEnabled
  };
}
