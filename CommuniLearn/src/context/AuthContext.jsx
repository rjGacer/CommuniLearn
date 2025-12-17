// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "../api.js";
import { jsx as _jsx } from "react/jsx-runtime";

export const AuthContext = /*#__PURE__*/createContext(undefined);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Restore from localStorage and merge server profile if available
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      // fetch server copy and merge (so saved picture persists across logins)
      (async () => {
        try {
          const base = (API_BASE || '').replace(/\/$/, '');
          if (base) {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: 'Bearer ' + token } : {};
            const res = await fetch(`${base}/profile`, { headers });
            if (res.ok) {
              const j = await res.json();
              const serverUser = j.user || null;
              if (serverUser) {
                const merged = Object.assign({}, parsed || {}, serverUser);
                setUser(merged);
                try { localStorage.setItem('user', JSON.stringify(merged)); } catch(e){}
              }
            }
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, []);

  const login = (emailOrUser, name, role) => {
    // login can accept either a user object or (email, name, role)
    const newUser = typeof emailOrUser === 'object' && emailOrUser !== null
      ? emailOrUser
      : { email: emailOrUser, name, role };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    // fetch remote profile and merge (non-blocking)
    (async () => {
    try {
      const base = (API_BASE || '').replace(/\/$/, '');
      if (base) {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        const res = await fetch(`${base}/profile`, { headers });
        if (res.ok) {
          const j = await res.json();
          const serverUser = j.user || null;
          if (serverUser) {
            const merged = Object.assign({}, newUser, serverUser);
            setUser(merged);
            try { localStorage.setItem('user', JSON.stringify(merged)); } catch(e){}
          }
        }
      }
    } catch (e) {
      // ignore
    }
    })();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const updateProfile = (updates) => {
    // Try to persist to backend; fall back to local update if request fails
    return (async () => {
      try {
        let base = (API_BASE || '').replace(/\/$/, '');
        const url = `${base}/auth/profile`;
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = 'Bearer ' + token;
        const resp = await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updates)
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.token) {
            try { localStorage.setItem('token', json.token); } catch (e) {}
          }
          const serverUser = json.user || null;
          const updated = Object.assign({}, user || {}, serverUser || updates);
          setUser(updated);
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
          return updated;
        }
      } catch (e) {
        // ignore and fallback to local
        console.error('Failed to persist profile update', e);
      }

      // fallback local update
      const updated = Object.assign({}, user || {}, updates);
      setUser(updated);
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
      return updated;
    })();
  };

  return /*#__PURE__*/_jsx(AuthContext.Provider, {
    value: { user, login, logout, updateProfile },
    children: children
  });
};

// Hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};