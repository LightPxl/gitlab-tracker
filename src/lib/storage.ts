
export const STORAGE_KEYS = {
    GITLAB_TOKEN: 'gitlab_token',
    GITLAB_URL: 'gitlab_url',
    GITLAB_GROUP_ID: 'gitlab_group_id',
};

const DEFAULTS = {
    GITLAB_URL: import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com',
    GITLAB_GROUP_ID: import.meta.env.VITE_GITLAB_GROUP_ID || '52',
};

const getItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const setItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage write failures in restricted environments.
    }
};

const removeItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore storage remove failures in restricted environments.
    }
};

const normalizeUrl = (url: string): string => url.trim().replace(/\/$/, '');

export const storage = {
    getToken: () => getItem(STORAGE_KEYS.GITLAB_TOKEN)?.trim() || null,
    setToken: (token: string) => {
        const normalized = token.trim();
        if (!normalized) {
            removeItem(STORAGE_KEYS.GITLAB_TOKEN);
            return;
        }
        setItem(STORAGE_KEYS.GITLAB_TOKEN, normalized);
    },
    removeToken: () => removeItem(STORAGE_KEYS.GITLAB_TOKEN),

    getGroupId: () => getItem(STORAGE_KEYS.GITLAB_GROUP_ID) || DEFAULTS.GITLAB_GROUP_ID,
    setGroupId: (id: string) => {
        const normalized = id.trim();
        if (!normalized) {
            removeItem(STORAGE_KEYS.GITLAB_GROUP_ID);
            return;
        }
        setItem(STORAGE_KEYS.GITLAB_GROUP_ID, normalized);
    },

    getUrl: () => normalizeUrl(getItem(STORAGE_KEYS.GITLAB_URL) || DEFAULTS.GITLAB_URL),
    setUrl: (url: string) => {
        const normalized = normalizeUrl(url);
        if (!normalized) {
            removeItem(STORAGE_KEYS.GITLAB_URL);
            return;
        }
        setItem(STORAGE_KEYS.GITLAB_URL, normalized);
    },
};
