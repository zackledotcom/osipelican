import { useSettingsStore } from '../stores/settingsStore';
import { isValidGeminiApiKey } from '../types/settings';

/**
 * Response from the Gemini API
 */
export interface GeminiResponse {
  text: string;
  sourceUrls?: string[];
  model?: string;
  finishReason?: string;
  safetyRatings?: any[];
}

/**
 * Error types for Gemini API calls
 */
export enum GeminiErrorType {
  INVALID_API_KEY = 'INVALID_API_KEY',
  MISSING_API_KEY = 'MISSING_API_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  CONTENT_FILTER_ERROR = 'CONTENT_FILTER_ERROR',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for Gemini API errors
 */
export class GeminiError extends Error {
  type: GeminiErrorType;
  statusCode?: number;
  
  constructor(message: string, type: GeminiErrorType = GeminiErrorType.UNKNOWN_ERROR, statusCode?: number) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.name = 'GeminiError';
  }
}

/**
 * Service for interacting with the Google Gemini API
 */
export class GeminiService {
  private static instance: GeminiService;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private requestTimeoutMs = 30000; // 30 seconds
  private cache = new Map<string, { response: GeminiResponse, timestamp: number }>();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {}
  
  /**
   * Get the singleton instance of the GeminiService
   */
  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }
  
  /**
   * Validates the API key format
   */
  private validateApiKey(apiKey: string | undefined): void {
    if (!apiKey) {
      throw new GeminiError(
        'Google Gemini API key is not set. Please add it in the settings.',
        GeminiErrorType.MISSING_API_KEY
      );
    }
    
    if (!isValidGeminiApiKey(apiKey)) {
      throw new GeminiError(
        'Invalid Google Gemini API key format. Please check your API key.',
        GeminiErrorType.INVALID_API_KEY
      );
    }
  }
  
  /**
   * Generates a cache key for a request
   */
  private getCacheKey(prompt: string, options: any = {}): string {
    return `${prompt}:${JSON.stringify(options)}`;
  }
  
  /**
   * Checks if a cached response is valid
   */
  private isCacheValid(cacheEntry: { response: GeminiResponse, timestamp: number }): boolean {
    return Date.now() - cacheEntry.timestamp < this.cacheTtlMs;
  }
  
  /**
   * Generates a response from the Gemini API
   */
  public async generateResponse(
    prompt: string, 
    options: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
      useCache?: boolean;
    } = {}
  ): Promise<GeminiResponse> {
    const apiKey = useSettingsStore.getState().apiKeys.googleGemini;
    
    // Validate API key
    this.validateApiKey(apiKey);
    
    // Check cache if enabled
    const useCache = options.useCache !== false;
    const cacheKey = this.getCacheKey(prompt, options);
    
    if (useCache) {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse && this.isCacheValid(cachedResponse)) {
        return cachedResponse.response;
      }
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    
    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            topK: options.topK ?? 40,
            topP: options.topP ?? 0.95,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
          }
        }),
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        
        // Handle specific error types
        if (statusCode === 400) {
          throw new GeminiError(
            errorData.error?.message || 'Invalid request to Gemini API',
            GeminiErrorType.UNKNOWN_ERROR,
            statusCode
          );
        } else if (statusCode === 401) {
          throw new GeminiError(
            'Invalid API key or unauthorized access',
            GeminiErrorType.INVALID_API_KEY,
            statusCode
          );
        } else if (statusCode === 403) {
          throw new GeminiError(
            'Access forbidden. Your API key may not have access to this resource.',
            GeminiErrorType.INVALID_API_KEY,
            statusCode
          );
        } else if (statusCode === 429) {
          throw new GeminiError(
            'Rate limit exceeded. Please try again later.',
            GeminiErrorType.RATE_LIMIT_ERROR,
            statusCode
          );
        } else if (statusCode >= 500) {
          throw new GeminiError(
            'Gemini API server error. Please try again later.',
            GeminiErrorType.NETWORK_ERROR,
            statusCode
          );
        } else {
          throw new GeminiError(
            errorData.error?.message || `Failed to generate response from Gemini API (${statusCode})`,
            GeminiErrorType.UNKNOWN_ERROR,
            statusCode
          );
        }
      }
      
      // Parse response
      const data = await response.json();
      
      // Check for content filtering
      if (data.promptFeedback?.blockReason) {
        throw new GeminiError(
          `Content filtered: ${data.promptFeedback.blockReason}`,
          GeminiErrorType.CONTENT_FILTER_ERROR
        );
      }
      
      // Extract response
      const geminiResponse: GeminiResponse = {
        text: data.candidates[0].content.parts[0].text,
        model: data.candidates[0].modelName,
        finishReason: data.candidates[0].finishReason,
        safetyRatings: data.candidates[0].safetyRatings
      };
      
      // Cache the response
      if (useCache) {
        this.cache.set(cacheKey, {
          response: geminiResponse,
          timestamp: Date.now()
        });
      }
      
      return geminiResponse;
    } catch (error) {
      // Clear timeout if it's still active
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error instanceof GeminiError) {
        throw error;
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GeminiError(
          'Request to Gemini API timed out. Please try again later.',
          GeminiErrorType.TIMEOUT_ERROR
        );
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new GeminiError(
          'Network error. Please check your internet connection.',
          GeminiErrorType.NETWORK_ERROR
        );
      } else {
        console.error('Error calling Gemini API:', error);
        throw new GeminiError(
          error instanceof Error ? error.message : 'Unknown error calling Gemini API',
          GeminiErrorType.UNKNOWN_ERROR
        );
      }
    }
  }
  
  /**
   * Uses Gemini to browse the web for information
   */
  public async browseWeb(query: string): Promise<GeminiResponse> {
    const settings = useSettingsStore.getState();
    const apiKey = settings.apiKeys.googleGemini;
    
    // Validate API key
    this.validateApiKey(apiKey);
    
    // Check if web surfing is enabled
    if (!settings.features.webSurfing) {
      throw new GeminiError(
        'Web surfing feature is disabled. Please enable it in the settings.',
        GeminiErrorType.FEATURE_DISABLED
      );
    }
    
    try {
      // For web browsing, we'll use a special prompt that instructs Gemini to search the web
      const webBrowsingPrompt = `Search the web for information about: ${query}. 
      Please provide a comprehensive answer based on current information available online. 
      Include relevant facts, recent developments, and cite your sources.`;
      
      // Use a longer timeout for web browsing
      const response = await this.generateResponse(webBrowsingPrompt, {
        temperature: 0.3, // Lower temperature for more factual responses
        maxOutputTokens: 4096, // Allow longer responses for web search results
        useCache: true // Enable caching for web browsing
      });
      
      return response;
    } catch (error) {
      if (error instanceof GeminiError) {
        throw error;
      } else {
        console.error('Error browsing web with Gemini:', error);
        throw new GeminiError(
          error instanceof Error ? error.message : 'Unknown error browsing the web',
          GeminiErrorType.UNKNOWN_ERROR
        );
      }
    }
  }
  
  /**
   * Checks if web surfing is enabled
   */
  public isWebSurfingEnabled(): boolean {
    const settings = useSettingsStore.getState();
    return !!settings.apiKeys.googleGemini && settings.features.webSurfing;
  }
  
  /**
   * Clears the response cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Tests if an API key is valid
   */
  public async testApiKey(apiKey: string): Promise<boolean> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      console.error('Error testing Gemini API key:', error);
      return false;
    }
  }
}
