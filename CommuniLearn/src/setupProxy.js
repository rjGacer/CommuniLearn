// Runtime helper: rewrite relative fetch/axios requests to use VITE_API_URL when set.
const API_BASE = import.meta.env.VITE_API_URL ?? '';
if (typeof window !== 'undefined' && API_BASE) {
  // patch fetch
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string') {
        const url = input;
        // rewrite absolute localhost calls to the deployed API base
        const localhostMatch = url.match(/^https?:\/\/localhost(:\d+)?(\/.*)?$/i) || url.match(/^https?:\/\/127\.0\.0\.1(:\d+)?(\/.*)?$/i);
        if (localhostMatch) {
          const path = localhostMatch[2] || '/';
          const resolved = API_BASE.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
          return _fetch(resolved, init);
        }
        if (!/^https?:\/\//i.test(url)) {
          const resolved = API_BASE.replace(/\/$/, '') + (url.startsWith('/') ? url : `/${url}`);
          return _fetch(resolved, init);
        }
      } else if (input && input.url) {
        const inputUrl = input.url;
        const localhostMatch = inputUrl.match(/^https?:\/\/localhost(:\d+)?(\/.*)?$/i) || inputUrl.match(/^https?:\/\/127\.0\.0\.1(:\d+)?(\/.*)?$/i);
        if (localhostMatch) {
          const path = localhostMatch[2] || '/';
          const resolved = API_BASE.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
          const newReq = new Request(resolved, input);
          return _fetch(newReq, init);
        }
        if (!/^https?:\/\//i.test(inputUrl)) {
          const resolved = API_BASE.replace(/\/$/, '') + (inputUrl.startsWith('/') ? inputUrl : `/${inputUrl}`);
          const newReq = new Request(resolved, input);
          return _fetch(newReq, init);
        }
      }
    } catch (e) {
      // fall through to original
    }
    return _fetch(input, init);
  };

  try {
    // patch axios if present
    const axios = await import('axios');
    if (axios && axios.default) axios.default.defaults.baseURL = API_BASE;
  } catch (e) {
    // axios not present in runtime or dynamic import failed — ignore
  }
}
