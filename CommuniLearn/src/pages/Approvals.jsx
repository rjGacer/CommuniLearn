import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiUrl } from "../config";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Approval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  useEffect(() => {
    fetch(apiUrl('/auth/pending-users'), {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }).then(res => res.json()).then(setPendingUsers).catch(err => console.error("Error loading pending users:", err));
  }, []);
  const approve = async id => {
    await fetch(apiUrl(`/auth/approve/${id}`), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    setPendingUsers(prev => prev.filter(u => u.id !== id));
  };
  const deny = async id => {
    await fetch(apiUrl(`/auth/deny/${id}`), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    setPendingUsers(prev => prev.filter(u => u.id !== id));
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "page-wrap",
    children: [/*#__PURE__*/_jsx("div", {
      className: "page-header-box",
      children: /*#__PURE__*/_jsx("h1", {
        className: "page-title",
        children: "Pending Accounts"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "card-container",
      children: pendingUsers.length === 0 ? /*#__PURE__*/_jsx("p", {
        style: {
          textAlign: "center",
          padding: "1rem",
          color: "#777"
        },
        children: "No pending approval requests."
      }) : pendingUsers.map(u => /*#__PURE__*/_jsxs("div", {
        className: "approval-row",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "row-left",
          children: [/*#__PURE__*/_jsx(Avatar, {
            name: u.name,
            email: u.email || null,
            className: "avatar-small"
          }), /*#__PURE__*/_jsx("div", {
            className: "student-name",
            children: u.name
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "row-right",
          children: [/*#__PURE__*/_jsx("button", {
            className: "btn-accept",
            onClick: () => approve(u.id),
            children: "Accept"
          }), /*#__PURE__*/_jsx("button", {
            className: "btn-deny",
            style: {
              marginLeft: "10px",
              background: "#ce3434",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px"
            },
            onClick: () => deny(u.id),
            children: "Deny"
          })]
        })]
      }, u.id))
    })]
  });
}