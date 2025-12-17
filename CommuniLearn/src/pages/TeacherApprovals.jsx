import { useEffect, useState } from "react";
import api from "../services/api";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TeacherApprovals() {
  const [pending, setPending] = useState([]);
  const titleCase = (fullName) => {
    if (!fullName) return '';
    return String(fullName).split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
  };
  const load = async () => {
    const res = await api.get(`/auth/pending-users`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    setPending(res.data);
  };
  const approve = async id => {
    try {
      await api.post(`/auth/approve/${id}`, {}, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      // optimistic UI: remove approved user from list
      setPending(prev => prev.filter(p => p.id !== id));
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
    } catch (err) {
      console.error('Approve failed', err);
      alert('Failed to approve registrant');
      load();
    }
  };

  const deny = async id => {
    if (!(await window.customConfirm('Reject this registrant?'))) return;
    try {
      await api.post(`/auth/deny/${id}`, {}, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      setPending(prev => prev.filter(p => p.id !== id));
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
    } catch (err) {
      console.error('Deny failed', err);
      alert('Failed to reject registrant');
      load();
    }
  };
  useEffect(() => {
    load();
  }, []);
  return /*#__PURE__*/_jsxs("div", {
    className: "page-wrap",
    children: [/*#__PURE__*/_jsx("div", {
      className: "page-header-box",
      children: /*#__PURE__*/_jsx("h1", {
        className: "page-title",
        children: "Pending Registrants"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "card-container",
      children: (pending.length === 0 ? /*#__PURE__*/_jsx("p", {
        style: {
          textAlign: "center",
          padding: "1rem",
          color: "#777"
        },
        children: "No Pending Registrants."
      }) : pending.map(u => /*#__PURE__*/_jsxs("div", {
        className: "approval-row",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "row-left",
          children: [/*#__PURE__*/_jsx(Avatar, {
            name: u.name,
            email: u.email || null,
            className: "avatar-small"
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", {
              className: "student-name",
                children: titleCase(u.name)
            }), /*#__PURE__*/_jsx("div", {
              style: {
                fontSize: 12,
                color: '#6b7280',
                marginTop: 4
              },
              children: u.email || ''
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "row-right",
          children: [/*#__PURE__*/_jsx("button", {
            className: "approval-btn approval-approve",
            onClick: () => approve(u.id),
            children: "Approve"
          }), /*#__PURE__*/_jsx("button", {
            className: "approval-btn approval-reject",
            onClick: () => deny(u.id),
            style: {
              marginLeft: "10px"
            },
            children: "Reject"
          })]
        })]
      }, u.id)))
    })]
  });
}