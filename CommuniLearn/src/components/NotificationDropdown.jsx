import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function NotificationDropdown({ items = [], onClose, onItemClick }) {
  return /*#__PURE__*/_jsxs("div", {
    style: { position: 'fixed', top: 64, right: 20, width: 320, background: '#fff', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', padding: 8, zIndex: 9999 },
    children: [/*#__PURE__*/_jsx("div", {
      style: { padding: '10px 12px', borderBottom: '1px solid #eee' },
      children: /*#__PURE__*/_jsx("h4", { style: { margin: 0, fontWeight: 700 }, children: "Notifications" })
    }), items.length === 0 ? /*#__PURE__*/_jsx("div", { style: { padding: 12 }, children: /*#__PURE__*/_jsx("p", { style: { margin: 0, color: '#666' }, children: "No new notifications" }) }) : items.map((n) => /*#__PURE__*/_jsxs("div", {
      role: "button",
      onClick: (e) => { e.stopPropagation(); if (typeof onItemClick === 'function') onItemClick(n); },
      style: { padding: '10px 12px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer' },
      children: [/*#__PURE__*/_jsx("p", { style: { margin: 0, fontSize: 14 }, children: n.title || n.msg || 'Update' }), /*#__PURE__*/_jsx("p", { style: { margin: '6px 0 0', fontSize: 12, color: '#888' }, children: n.created ? (new Date(n.created)).toLocaleString() : (n.time || '') })]
    }, `${n.type || 'it'}-${n.id}`))]
  });
}