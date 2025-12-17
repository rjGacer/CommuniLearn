export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function joinPath(base, path) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export async function apiFetch(path, options) {
  const opts = { credentials: 'include', ...options };
  const url = /^https?:\/\//.test(path) ? path : joinPath(API_BASE, path);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    let body = undefined;
    try {
      if (ct.includes('application/json')) body = await res.json();
      else body = await res.text();
    } catch {}
    const err = new Error(res.statusText || 'API error');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const get = (path, params, options) => {
  let p = path;
  if (params && Object.keys(params).length) {
    const qp = new URLSearchParams(params).toString();
    p = `${path}${path.includes('?') ? '&' : '?'}${qp}`;
  }
  return apiFetch(p, { method: 'GET', ...options });
};

export const post = (path, body, options) =>
  apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined, ...options });
