/**
 * Secure storage utility for sensitive data like API keys
 * Uses localStorage in development but should use more secure options in production
 */

import { SettingsError, SettingsErrorType } from '../types/settings';

/**
 * Interface for secure storage operations
 */
interface SecureStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * LocalStorage implementation (for development)
 * WARNING: This is not secure for production use
 */
class LocalStorageAdapter implements SecureStorage {
  private prefix = 'osipelican_secure_';

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch (error) {
      console.error('LocalStorage getItem error:', error);
      throw new SettingsError(
        'Failed to retrieve data from storage',
        SettingsErrorType.STORAGE_ERROR
      );
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, value);
    } catch (error) {
      console.error('LocalStorage setItem error:', error);
      throw new SettingsError(
        'Failed to save data to storage',
        SettingsErrorType.STORAGE_ERROR
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('LocalStorage removeItem error:', error);
      throw new SettingsError(
        'Failed to remove data from storage',
        SettingsErrorType.STORAGE_ERROR
      );
    }
  }
}

/**
 * Electron secure storage implementation
 * Uses IPC to communicate with the main process for secure storage
 */
class ElectronSecureStorage implements SecureStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      // This assumes you've added a secureStorage API to your Electron preload script
      // You would need to implement this in your Electron main process
      return await window.electronAPI.secureStorage?.getItem(key) || null;
    } catch (error) {
      console.error('ElectronSecureStorage getItem error:', error);
      // Fall back to localStorage if Electron API fails
      return new LocalStorageAdapter().getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      await window.electronAPI.secureStorage?.setItem(key, value);
    } catch (error) {
      console.error('ElectronSecureStorage setItem error:', error);
      // Fall back to localStorage if Electron API fails
      return new LocalStorageAdapter().setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      await window.electronAPI.secureStorage?.removeItem(key);
    } catch (error) {
      console.error('ElectronSecureStorage removeItem error:', error);
      // Fall back to localStorage if Electron API fails
      return new LocalStorageAdapter().removeItem(key);
    }
  }
}

/**
 * Simple encryption/decryption for localStorage
 * NOTE: This is not truly secure, just obfuscation
 */
class EncryptedLocalStorage implements SecureStorage {
  private adapter = new LocalStorageAdapter();
  private encryptionKey = 'osipelican-local-encryption-key';

  private encrypt(text: string): string {
    // Simple XOR encryption (not secure, just obfuscation)
    const key = this.encryptionKey;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode
  }

  private decrypt(encoded: string): string {
    try {
      const text = atob(encoded); // Base64 decode
      const key = this.encryptionKey;
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await this.adapter.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = this.encrypt(value);
    await this.adapter.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await this.adapter.removeItem(key);
  }
}

// Choose the appropriate storage implementation
// In a real app, you would use ElectronSecureStorage in production
// and possibly EncryptedLocalStorage or LocalStorageAdapter in development
let secureStorage: SecureStorage;

if (typeof window !== 'undefined' && window.electronAPI?.secureStorage) {
  secureStorage = new ElectronSecureStorage();
} else if (typeof window !== 'undefined') {
  // Use encrypted localStorage as fallback
  secureStorage = new EncryptedLocalStorage();
} else {
  // For SSR or environments without window
  secureStorage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {}
  };
}

export default secureStorage;
