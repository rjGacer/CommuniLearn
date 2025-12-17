import React, { useEffect, useState } from "react";
import { API_BASE } from "../api.js";
import { jsx as _jsx } from "react/jsx-runtime";
const COLORS = ["#ef4444", "#fb923c", "#f59e0b", "#16a34a", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#0ea5a4"];
function pickColor(key) {
  if (!key) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const idx = Math.abs(hash) % COLORS.length;
  return COLORS[idx];
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return {
    r: bigint >> 16 & 255,
    g: bigint >> 8 & 255,
    b: bigint & 255
  };
}
function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function readableTextColor(bgHex) {
  try {
    const {
      r,
      g,
      b
    } = hexToRgb(bgHex);
    const lum = luminance(r, g, b);
    // WCAG suggests threshold ~0.179 for choosing white/black; using 0.5 for clearer contrast here
    return lum > 0.5 ? '#0f172a' : '#ffffff';
  } catch (e) {
    return '#111827';
  }
}
export default function Avatar({ name, email, src, alt, className }) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";
  const bg = pickColor(email || name || "");
  const textColor = readableTextColor(bg);
  const wrapperClass = className ? className : "avatar-initial";

  const [remoteSrc, setRemoteSrc] = useState(src || null);

  useEffect(() => {
    // Intentionally do not fetch other users' profiles by email here.
    // Avoids many per-user HTTP requests and prevents 3rd-party URL issues.
    // If an explicit `src` prop is provided it will be used; otherwise
    // the component falls back to an initial-letter avatar.
  }, [email, src]);

  const finalSrc = src || remoteSrc;
  // Replace any old localhost backend URL persisted in DB with the configured API base.
  const displaySrc = finalSrc ? String(finalSrc).replace(/^http:\/\/localhost:5000/, (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')) : null;

  if (displaySrc) {
    // Render a wrapper element with the avatar class so CSS rules that target
    // the wrapper (e.g. `.gc-comment-avatar { width: 45px; }`) apply and the
    // inner <img> fills that wrapper without expanding the layout.
    return /*#__PURE__*/_jsx("div", {
      className: wrapperClass,
      children: /*#__PURE__*/_jsx("img", {
        src: displaySrc,
        alt: alt || name || "avatar",
        className: "avatar-img"
      })
    });
  }

  return /*#__PURE__*/_jsx("div", {
    className: `${wrapperClass} avatar-initial`,
    style: {
      background: bg,
      color: textColor
    },
    "aria-label": alt || name || "avatar",
    title: name,
    children: initial
  });
}