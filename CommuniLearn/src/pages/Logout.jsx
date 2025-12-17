import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { jsx as _jsx } from "react/jsx-runtime";
export default function Logout() {
  const {
    logout
  } = useAuth();
  useEffect(() => {
    logout(); // instantly logs out
  }, [logout]);
  return /*#__PURE__*/_jsx("div", {
    children: "Logging out..."
  });
}