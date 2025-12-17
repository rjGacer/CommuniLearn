import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ActionButton({
  icon: Icon,
  label,
  primary
}) {
  return /*#__PURE__*/_jsxs("button", {
    className: `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
        ${primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`,
    children: [/*#__PURE__*/_jsx(Icon, {
      size: 16
    }), label]
  });
}