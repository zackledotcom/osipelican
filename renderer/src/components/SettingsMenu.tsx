import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, AlertCircle, Check, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { ThemeToggle } from './ThemeToggle';
import { isValidGeminiApiKey } from '../types/settings';
import { useGemini } from '../hooks/useGemini';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Settings menu component for managing API keys and feature toggles
 */
export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
  // Get settings from store
  const { 
    apiKeys, 
    features, 
    security,
    lastError,
    setApiKey, 
    clearApiKey, 
    toggleFeature,
    toggleApiKeyMasking,
    resetSettings,
    exportSettings,
    importSettings
  } = useSettingsStore();
  
  // Get Gemini API methods
  const { testApiKey, isLoading: isTestingApiKey } = useGemini();
  
  // Local state
  const [geminiKey, setGeminiKey] = useState(apiKeys.googleGemini || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiKeyError, setGeminiKeyError] = useState<string | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testKeyResult, setTestKeyResult] = useState<boolean | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  // Focus trap for accessibility
  useEffect(() => {
    if (isOpen) {
      // Set focus to the modal
      modalRef.current?.focus();
    }
  }, [isOpen]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGeminiKey(apiKeys.googleGemini || '');
      setGeminiKeyError(null);
      setShowSavedMessage(false);
      setTestKeyResult(null);
      setIsTestingKey(false);
      setImportError(null);
    }
  }, [isOpen, apiKeys.googleGemini]);
  
  // Early return if modal is closed
  if (!isOpen) return null;
  
  /**
   * Validates and saves the Gemini API key
   */
  const handleSaveGeminiKey = async () => {
    // Validate key format
    if (!isValidGeminiApiKey(geminiKey)) {
      setGeminiKeyError('Invalid API key format. Google API keys are typically ~40 characters.');
      return;
    }
    
    setGeminiKeyError(null);
    
    try {
      await setApiKey('googleGemini', geminiKey);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    } catch (error) {
      setGeminiKeyError(error instanceof Error ? error.message : 'Failed to save API key');
    }
  };
  
  /**
   * Clears the Gemini API key after confirmation
   */
  const handleClearGeminiKey = () => {
    if (window.confirm('Are you sure you want to remove this API key?')) {
      clearApiKey('googleGemini')
        .then(() => {
          setGeminiKey('');
          setGeminiKeyError(null);
          setTestKeyResult(null);
        })
        .catch(error => {
          setGeminiKeyError(error instanceof Error ? error.message : 'Failed to clear API key');
        });
    }
  };
  
  /**
   * Tests if the Gemini API key is valid
   */
  const handleTestGeminiKey = async () => {
    // Validate key format first
    if (!isValidGeminiApiKey(geminiKey)) {
      setGeminiKeyError('Invalid API key format. Google API keys are typically ~40 characters.');
      return;
    }
    
    setGeminiKeyError(null);
    setIsTestingKey(true);
    setTestKeyResult(null);
    
    try {
      const isValid = await testApiKey(geminiKey);
      setTestKeyResult(isValid);
      
      if (isValid) {
        // Auto-save if valid
        await setApiKey('googleGemini', geminiKey);
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      } else {
        setGeminiKeyError('API key is invalid or has insufficient permissions.');
      }
    } catch (error) {
      setGeminiKeyError(error instanceof Error ? error.message : 'Failed to test API key');
      setTestKeyResult(false);
    } finally {
      setIsTestingKey(false);
    }
  };
  
  /**
   * Toggles the web surfing feature
   */
  const handleWebSurfingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleFeature('webSurfing', e.target.checked);
  };
  
  /**
   * Toggles API key masking
   */
  const handleApiKeyMaskingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    toggleApiKeyMasking(e.target.checked);
  };
  
  /**
   * Exports settings to a JSON file
   */
  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'osipelican-settings.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  /**
   * Opens the file picker for importing settings
   */
  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };
  
  /**
   * Imports settings from a JSON file
   */
  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportError(null);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const settingsJson = event.target?.result as string;
        const success = importSettings(settingsJson);
        
        if (success) {
          // Update local state with new settings
          setGeminiKey(apiKeys.googleGemini || '');
          alert('Settings imported successfully');
        } else {
          setImportError('Failed to import settings: Invalid format');
        }
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import settings');
      } finally {
        setIsImporting(false);
        // Reset file input
        if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setImportError('Failed to read file');
      setIsImporting(false);
    };
    
    reader.readAsText(file);
  };
  
  /**
   * Resets all settings after confirmation
   */
  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      resetSettings();
      setGeminiKey('');
      setGeminiKeyError(null);
      setTestKeyResult(null);
    }
  };
  
  // Derived state
  const isGeminiKeyValid = isValidGeminiApiKey(geminiKey);
  const canEnableWebSurfing = !!apiKeys.googleGemini;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => {
        // Close when clicking outside the modal
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="settings-title" className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Theme Settings */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              <ThemeToggle />
            </div>
          </div>
          
          {/* API Keys */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>
            
            {/* Google Gemini API Key */}
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Google Gemini API Key
                </label>
                <a 
                  href="https://ai.google.dev/tutorials/setup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs flex items-center"
                >
                  Get API Key <ExternalLink size={12} className="ml-1" />
                </a>
              </div>
              
              <div className="flex">
                <div className="relative flex-1">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      setGeminiKeyError(null);
                      setTestKeyResult(null);
                    }}
                    placeholder="Enter your Google Gemini API key"
                    className={`w-full px-3 py-2 border ${
                      geminiKeyError 
                        ? 'border-red-500 dark:border-red-400' 
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-l-md 
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                    focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    aria-invalid={!!geminiKeyError}
                    aria-describedby={geminiKeyError ? "gemini-key-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    aria-label={showGeminiKey ? "Hide API key" : "Show API key"}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                <button
                  onClick={handleSaveGeminiKey}
                  disabled={!geminiKey.trim() || isTestingKey}
                  className="px-3 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 
                           disabled:bg-blue-400 disabled:cursor-not-allowed"
                  aria-label="Save API key"
                >
                  <Save size={18} />
                </button>
                
                <button
                  onClick={handleTestGeminiKey}
                  disabled={!geminiKey.trim() || isTestingKey}
                  className="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 
                           disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
                  aria-label="Test API key"
                >
                  {isTestingKey ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                </button>
                
                {apiKeys.googleGemini && (
                  <button
                    onClick={handleClearGeminiKey}
                    className="px-3 py-2 ml-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    aria-label="Clear API key"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              {geminiKeyError && (
                <div id="gemini-key-error" className="flex items-center text-red-600 dark:text-red-400 text-sm mt-1">
                  <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                  <span>{geminiKeyError}</span>
                </div>
              )}
              
              {showSavedMessage && !geminiKeyError && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm mt-1">
                  <Check size={16} className="mr-1" />
                  API key saved successfully
                </div>
              )}
              
              {testKeyResult === true && !geminiKeyError && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm mt-1">
                  <Check size={16} className="mr-1" />
                  API key is valid
                </div>
              )}
              
              {testKeyResult === false && !geminiKeyError && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm mt-1">
                  <AlertCircle size={16} className="mr-1" />
                  API key is invalid or has insufficient permissions
                </div>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your API key is stored securely and never sent to our servers.
              </p>
            </div>
          </div>
          
          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Features</h3>
            
            {/* Web Surfing */}
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="toggle-web-surfing" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Web Surfing with Google Gemini
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enable web browsing capabilities using Google Gemini
                  </p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-web-surfing"
                    checked={features.webSurfing}
                    onChange={handleWebSurfingToggle}
                    disabled={!canEnableWebSurfing}
                    className="sr-only"
                    aria-describedby={!canEnableWebSurfing ? "web-surfing-error" : undefined}
                  />
                  <label
                    htmlFor="toggle-web-surfing"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      !canEnableWebSurfing ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      features.webSurfing ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                        features.webSurfing ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
              
              {!canEnableWebSurfing && (
                <div id="web-surfing-error" className="flex items-center text-amber-600 dark:text-amber-400 text-xs mt-2">
                  <AlertCircle size={14} className="mr-1 flex-shrink-0" />
                  Google Gemini API key required for web surfing
                </div>
              )}
            </div>
          </div>
          
          {/* Security */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security</h3>
            
            {/* API Key Masking */}
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="toggle-api-key-masking" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mask API Keys
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Hide API keys in the UI for better security
                  </p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-api-key-masking"
                    checked={security.maskApiKeys}
                    onChange={handleApiKeyMaskingToggle}
                    className="sr-only"
                  />
                  <label
                    htmlFor="toggle-api-key-masking"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      security.maskApiKeys ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                        security.maskApiKeys ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Backup & Restore */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Backup & Restore</h3>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-3">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleExportSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  Export Settings
                </button>
                
                <button
                  onClick={handleImportClick}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import Settings'}
                </button>
                
                <input
                  type="file"
                  ref={importFileInputRef}
                  onChange={handleImportSettings}
                  accept=".json"
                  className="hidden"
                />
                
                {importError && (
                  <div className="flex items-center text-red-600 dark:text-red-400 text-sm mt-1">
                    <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
                
                <button
                  onClick={handleResetSettings}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center mt-2"
                >
                  Reset All Settings
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Export your settings to back them up or transfer them to another device.
                Importing settings will overwrite your current settings.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
