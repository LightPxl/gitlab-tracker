/**
 * Enterprise Configuration Utility
 * Centralizes environment variables and provides safe defaults.
 */

export const config = {
    gitlab: {
        baseUrl: 'https://gitlab.com/api/v4',
    },
    supabase: {
        // Using a fallback to resolve ImportMeta.env lint errors in IDE
        url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
        anonKey: (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    },
    isDev: (import.meta as any).env?.DEV || false,
};
