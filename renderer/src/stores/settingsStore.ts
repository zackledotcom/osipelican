import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Settings, 
  DEFAULT_SETTINGS, 
  ApiKeys, 
  isValidGeminiApiKey,
  SettingsError,
  SettingsErrorType
} from '../types/settings';
import secureStorage from '../utils/secureStorage';

/**
 * Extended settings state with actions
 */
interface SettingsState extends Settings {
  // API key management
  setApiKey: (provider: keyof ApiKeys, key: string) => Promise<void>;
  clearApiKey: (provider: keyof ApiKeys) => Promise<void>;
  validateApiKey: (provider: keyof ApiKeys, key: string) => boolean;
  testApiKey: (provider: keyof ApiKeys, key: string) => Promise<boolean>;
  
  // Feature management
  toggleFeature: (feature: keyof Settings['features'], enabled: boolean) => void;
  
  // Security settings
  toggleApiKeyMasking: (enabled: boolean) => void;
  
  // Settings management
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  
  // Error state
  lastError: string | null;
  setLastError: (error: string | null) => void;
}

/**
 * Custom storage adapter for Zustand that uses secureStorage for API keys
 * and localStorage for non-sensitive settings
 */
const hybridStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      // Get regular settings from localStorage
      const settingsJson = localStorage.getItem(name);
      if (!settingsJson) return null;
      
      const settings = JSON.parse(settingsJson);
      
      // Get API keys from secure storage
      const apiKeys: ApiKeys = {};
      const providers = ['googleGemini'] as const;
      
      for (const provider of providers) {
        const key = await secureStorage.getItem(`apiKey_${provider}`);
        if (key) {
          apiKeys[provider] = key;
        }
      }
      
      // Merge API keys with regular settings
      return JSON.stringify({
        ...settings,
        state: {
          ...settings.state,
          apiKeys
        }
      });
    } catch (error) {
      console.error('Error retrieving settings:', error);
      return localStorage.getItem(name);
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const settings = JSON.parse(value);
      const { apiKeys, ...rest } = settings.state;
      
      // Store API keys in secure storage
      if (apiKeys) {
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (key) {
            await secureStorage.setItem(`apiKey_${provider}`, key as string);
          }
        }
      }
      
      // Store everything else in localStorage
      localStorage.setItem(name, JSON.stringify({
        ...settings,
        state: {
          ...rest,
          apiKeys: {} // Don't store API keys in localStorage
        }
      }));
    } catch (error) {
      console.error('Error storing settings:', error);
      localStorage.setItem(name, value);
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      // Remove API keys from secure storage
      const providers = ['googleGemini'] as const;
      for (const provider of providers) {
        await secureStorage.removeItem(`apiKey_${provider}`);
      }
      
      // Remove regular settings from localStorage
      localStorage.removeItem(name);
    } catch (error) {
      console.error('Error removing settings:', error);
      localStorage.removeItem(name);
    }
  }
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      lastError: null,
      
      setApiKey: async (provider, key) => {
        try {
          // Validate key format
          if (!get().validateApiKey(provider, key)) {
            throw new SettingsError(
              'Invalid API key format',
              SettingsErrorType.INVALID_API_KEY
            );
          }
          
          // Store in secure storage
          await secureStorage.setItem(`apiKey_${provider}`, key);
          
          // Update state
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              [provider]: key
            },
            lastError: null
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error saving API key';
          console.error(`Error setting ${provider} API key:`, error);
          set({ lastError: message });
          throw error;
        }
      },
      
      clearApiKey: async (provider) => {
        try {
          // Remove from secure storage
          await secureStorage.removeItem(`apiKey_${provider}`);
          
          // Update state
          set((state) => {
            const newApiKeys = { ...state.apiKeys };
            delete newApiKeys[provider];
            return { 
              apiKeys: newApiKeys,
              lastError: null
            };
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error clearing API key';
          console.error(`Error clearing ${provider} API key:`, error);
          set({ lastError: message });
          throw error;
        }
      },
      
      validateApiKey: (provider, key) => {
        if (provider === 'googleGemini') {
          return isValidGeminiApiKey(key);
        }
        return true;
      },
      
      testApiKey: async (provider, key) => {
        try {
          if (provider === 'googleGemini') {
            // Test Google Gemini API key with a simple request
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
              { 
                method: 'GET',
                signal: AbortSignal.timeout(10000) // 10 second timeout
              }
            );
            
            if (!response.ok) {
              const data = await response.json();
              throw new SettingsError(
                data.error?.message || `API error: ${response.status}`,
                SettingsErrorType.NETWORK_ERROR
              );
            }
            
            set({ lastError: null });
            return true;
          }
          
          return false;
        } catch (error) {
          let message = 'Unknown error testing API key';
          let type = SettingsErrorType.UNKNOWN_ERROR;
          
          if (error instanceof DOMException && error.name === 'AbortError') {
            message = 'Request timed out';
            type = SettingsErrorType.TIMEOUT_ERROR;
          } else if (error instanceof TypeError) {
            message = 'Network error - check your connection';
            type = SettingsErrorType.NETWORK_ERROR;
          } else if (error instanceof SettingsError) {
            message = error.message;
            type = error.type;
          } else if (error instanceof Error) {
            message = error.message;
          }
          
          console.error(`Error testing ${provider} API key:`, error);
          set({ lastError: message });
          throw new SettingsError(message, type);
        }
      },
      
      toggleFeature: (feature, enabled) => 
        set((state) => ({
          features: {
            ...state.features,
            [feature]: enabled
          },
          lastError: null
        })),
      
      toggleApiKeyMasking: (enabled) => 
        set((state) => ({
          security: {
            ...state.security,
            maskApiKeys: enabled
          },
          lastError: null
        })),
      
      resetSettings: () => {
        // Clear API keys from secure storage
        const providers = ['googleGemini'] as const;
        for (const provider of providers) {
          secureStorage.removeItem(`apiKey_${provider}`).catch(console.error);
        }
        
        set({ ...DEFAULT_SETTINGS, lastError: null });
      },
      
      exportSettings: () => {
        const { apiKeys, features, security, version } = get();
        return JSON.stringify({
          apiKeys,
          features,
          security,
          version
        }, null, 2);
      },
      
      importSettings: (settingsJson) => {
        try {
          const settings = JSON.parse(settingsJson);
          
          // Validate settings structure
          if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings format');
          }
          
          // Import API keys
          if (settings.apiKeys) {
            for (const [provider, key] of Object.entries(settings.apiKeys)) {
              if (key && typeof key === 'string') {
                secureStorage.setItem(`apiKey_${provider}`, key).catch(console.error);
              }
            }
          }
          
          // Import other settings
          set((state) => ({
            apiKeys: settings.apiKeys || state.apiKeys,
            features: settings.features || state.features,
            security: settings.security || state.security,
            version: settings.version || state.version,
            lastError: null
          }));
          
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error importing settings';
          console.error('Error importing settings:', error);
          set({ lastError: message });
          return false;
        }
      },
      
      setLastError: (error) => set({ lastError: error })
    }),
    {
      name: 'osipelican-settings',
      storage: createJSONStorage(() => hybridStorage),
      partialize: (state) => ({
        // Don't include API keys in the persisted state
        // They are handled separately by the hybridStorage adapter
        features: state.features,
        security: state.security,
        version: state.version
      }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Settings rehydrated successfully');
        } else {
          console.error('Failed to rehydrate settings');
        }
      }
    }
  )
);
