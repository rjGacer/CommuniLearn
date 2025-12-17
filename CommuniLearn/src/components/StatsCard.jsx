import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StatsCard({
  icon: Icon,
  title,
  value,
  subtitle,
  button
}) {
  return /*#__PURE__*/_jsxs("div", {
    className: "bg-white rounded-xl shadow-sm p-6 border border-gray-100",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "flex items-center justify-between mb-4",
      children: [/*#__PURE__*/_jsx("div", {
        className: "p-3 bg-blue-50 rounded-lg",
        children: /*#__PURE__*/_jsx(Icon, {
          className: "text-blue-600",
          size: 24
        })
      }), button && /*#__PURE__*/_jsx("button", {
        className: "px-4 py-2 bg-gray-100 rounded-full text-sm flex items-center gap-2",
        children: button
      })]
    }), /*#__PURE__*/_jsx("h3", {
      className: "text-3xl font-bold",
      children: value
    }), /*#__PURE__*/_jsx("p", {
      className: "text-gray-600 text-sm",
      children: subtitle
    })]
  });
}