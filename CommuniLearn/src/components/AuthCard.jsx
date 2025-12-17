import React from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AuthCard = ({
  title,
  subtitle,
  footer,
  note,
  children
}) => {
  return /*#__PURE__*/_jsxs("div", {
    className: "card",
    children: [/*#__PURE__*/_jsx("h1", {
      children: title
    }), /*#__PURE__*/_jsx("p", {
      children: subtitle
    }), children, /*#__PURE__*/_jsx("div", {
      className: "google-link",
      children: footer
    }), note && /*#__PURE__*/_jsx("p", {
      className: "note",
      children: note
    })]
  });
};
export default AuthCard;