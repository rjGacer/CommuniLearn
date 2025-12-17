import RightSidebar from "./RightSidebar";
import "../css/student.css";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StudentPageLayout({
  children,
  title,
  subtitle
}) {
  const {
    user
  } = useAuth ? useAuth() : {
    user: null
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "gc-module-page",
    style: {
      display: "flex",
      gap: 20,
      width: "100%"
    },
    children: [/*#__PURE__*/_jsxs("div", {
      style: {
        flex: 1,
        maxWidth: "72%",
        paddingRight: 20
      },
      children: [/*#__PURE__*/_jsxs("div", {
        className: "gc-header",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "gc-header-left",
          children: [/*#__PURE__*/_jsx("h1", {
            className: "gc-title",
            children: title
          }), subtitle && /*#__PURE__*/_jsx("p", {
            className: "gc-subtitle",
            children: subtitle
          })]
        }), /*#__PURE__*/_jsxs("div", {
          style: {
            marginLeft: "auto",
            display: "flex",
            gap: 12
          },
          children: [/*#__PURE__*/_jsx("div", {
            className: "icon-btn",
            title: "role-pill",
            children: "STUDENT"
          }), /*#__PURE__*/_jsx("div", {
            className: "icon-btn",
            title: "notifications",
            children: "\uD83D\uDD14"
          }), /*#__PURE__*/_jsx(Avatar, {
            name: user?.name || null,
            email: user?.email || null,
            className: "gc-profile-circle"
          })]
        })]
      }), children]
    }), /*#__PURE__*/_jsx(RightSidebar, {})]
  });
}