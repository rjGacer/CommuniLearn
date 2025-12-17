import React from 'react';
import { jsx as _jsx } from "react/jsx-runtime";
const ToggleLink = ({
  isLogin,
  onToggle
}) => /*#__PURE__*/_jsx("div", {
  style: {
    textAlign: 'center',
    marginTop: '1rem'
  },
  children: /*#__PURE__*/_jsx("button", {
    type: "button",
    onClick: onToggle,
    style: {
      background: 'none',
      border: 'none',
      color: '#1E90FF',
      cursor: 'pointer',
      fontSize: '0.9rem',
      textDecoration: 'underline'
    },
    children: isLogin ? 'Need an account? Sign Up' : 'Have an account? Log In'
  })
});
export default ToggleLink;