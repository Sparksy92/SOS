/**
 * SOS Unified LocalStorage Wrapper
 * Automatically prefixes all keys with 'sos_' to isolate application state.
 */
export const localStore = {
  get: (key, defaultValue = null) => {
    try {
      const val = localStorage.getItem(`sos_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
      console.error("LocalStore read error:", e);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`sos_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("LocalStore write error:", e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(`sos_${key}`);
    } catch (e) {
      console.error("LocalStore remove error:", e);
    }
  },
  clear: () => {
    try {
      // Clear only keys starting with sos_
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sos_')) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.error("LocalStore clear error:", e);
    }
  }
};
