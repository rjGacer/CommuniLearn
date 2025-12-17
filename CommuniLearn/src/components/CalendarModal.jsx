import { X } from 'lucide-react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function CalendarModal({
  onClose
}) {
  const now = new Date();
  return /*#__PURE__*/_jsx("div", {
    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
    onClick: onClose,
    children: /*#__PURE__*/_jsxs("div", {
      className: "bg-white rounded-xl p-6 max-w-xs w-full",
      onClick: e => e.stopPropagation(),
      children: [/*#__PURE__*/_jsxs("div", {
        className: "flex justify-between items-center mb-4",
        children: [/*#__PURE__*/_jsx("h3", {
          className: "font-bold",
          children: "Calendar"
        }), /*#__PURE__*/_jsx("button", {
          onClick: onClose,
          children: /*#__PURE__*/_jsx(X, {
            size: 20
          })
        })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "text-center",
        children: [/*#__PURE__*/_jsx("p", {
          className: "text-4xl font-bold text-blue-600",
          children: now.getDate()
        }), /*#__PURE__*/_jsx("p", {
          className: "text-gray-700",
          children: now.toLocaleString('default', {
            month: 'long',
            year: 'numeric'
          })
        }), /*#__PURE__*/_jsx("p", {
          className: "mt-2 text-sm text-gray-500",
          children: now.toLocaleDateString('en-US', {
            weekday: 'long'
          })
        })]
      })]
    })
  });
}