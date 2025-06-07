export interface SettingsError extends Error {
    type: string;
}
export type SettingsErrorType = 'invalid-api-key' | 'network-error' | 'unknown';
export interface SettingsState {
    apiKeys?: Record<string, string>;
    features?: Record<string, boolean>;
    security?: Record<string, any>;
    version?: string;
    [key: string]: any;
}
