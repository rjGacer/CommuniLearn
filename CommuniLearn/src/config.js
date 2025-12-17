// Central API base URL for frontend. Set VITE_API_URL in your deployment.
// Default to '/api' so fetch/apiUrl callers hit the backend mounted under /api
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export function apiUrl(path) {
  if (!path) return API_BASE_URL || '';
  // if path already absolute, return as-is
  if (/^https?:\/\//.test(path)) return path;
  // ensure we don't duplicate slashes
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
