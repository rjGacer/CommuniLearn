import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ModuleCard({
  code,
  description
}) {
  return /*#__PURE__*/_jsxs("div", {
    children: [/*#__PURE__*/_jsx("h4", {
      children: code
    }), /*#__PURE__*/_jsx("p", {
      children: description
    }), /*#__PURE__*/_jsx("button", {
      children: "View"
    })]
  });
}