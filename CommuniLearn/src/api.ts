export const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api';

type FetchOptions = RequestInit;

function joinPath(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export async function apiFetch(path: string, options?: FetchOptions) {
  const opts: FetchOptions = { credentials: 'include', ...options };
  const url = /^https?:\/\//.test(path) ? path : joinPath(API_BASE, path);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    let body: any = undefined;
    try {
      if (ct.includes('application/json')) body = await res.json();
      else body = await res.text();
    } catch {}
    const err = new Error(res.statusText || 'API error') as any;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const get = (path: string, params?: Record<string, string>, options?: FetchOptions) => {
  let p = path;
  if (params && Object.keys(params).length) {
    const qp = new URLSearchParams(params).toString();
    p = `${path}${path.includes('?') ? '&' : '?'}${qp}`;
  }
  return apiFetch(p, { method: 'GET', ...options });
};

export const post = (path: string, body?: any, options?: FetchOptions) =>
  apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined, ...options });
