export const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3001`)
  : `${window.location.protocol}//${window.location.host}`;

