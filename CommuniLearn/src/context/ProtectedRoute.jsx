import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jsx as _jsx } from "react/jsx-runtime";
export default function ProtectedRoute({
  children
}) {
  const {
    user
  } = useAuth();
  if (!user) {
    return /*#__PURE__*/_jsx(Navigate, {
      to: "/",
      replace: true
    });
  }
  return children;
}