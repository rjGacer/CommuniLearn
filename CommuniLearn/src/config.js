// Central API base URL for frontend. Set VITE_API_URL in your deployment.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export function apiUrl(path) {
  if (!path) return API_BASE_URL || '';
  // if path already absolute, return as-is
  if (/^https?:\/\//.test(path)) return path;
  // ensure we don't duplicate slashes
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
