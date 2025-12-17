// Sidebar.tsx
import { NavLink } from "react-router-dom";
import { Book, Users, FileText, Megaphone, LogOut, Home, ClipboardList, CheckSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Sidebar() {
  const {
    logout,
    user
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /* SUPERTEACHER SIDEBAR */
  if (user?.role === "superteacher") {
    return /*#__PURE__*/_jsxs("aside", {
      className: "sidebar",
      children: [/*#__PURE__*/_jsx("div", {
        className: "sidebar-title",
          children: /*#__PURE__*/_jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            },
            children: [/*#__PURE__*/_jsx("span", {
              className: "sidebar-title-text",
              children: "CommuniLearn"
            })]
          })
      }), /*#__PURE__*/_jsx("nav", {
        style: {
          marginTop: "2rem"
        },
        children: /*#__PURE__*/_jsxs(NavLink, {
          to: "/superteacher/approvals",
          className: ({
            isActive
          }) => `sidebar-item ${isActive ? "active" : ""}`,
          children: [/*#__PURE__*/_jsx(CheckSquare, {
            size: 20
          }), /*#__PURE__*/_jsx("span", {
            children: "Approvals"
          })]
        })
      }), /*#__PURE__*/_jsxs("div", {
        className: "sidebar-bottom",
        children: [/*#__PURE__*/_jsxs(NavLink, {
          onClick: handleLogout,
          to: "/logout",
          className: "sidebar-item",
          children: [/*#__PURE__*/_jsx(LogOut, {
            size: 20
          }), /*#__PURE__*/_jsx("span", {
            children: "Logout"
          })]
        })]
      })]
    });
  }

  /* ROLE MENUS */
  const teacherMenu = [{
    icon: Home,
    label: "Dashboard",
    path: "/teacher/dashboard"
  }, {
    icon: Book,
    label: "Modules",
    path: "/teacher/module"
  }, {
    icon: Users,
    label: "Students",
    path: "/teacher/students"
  }, {
    icon: ClipboardList,
    label: "Grade/Report",
    path: "/teacher/grades"
  }, {
    icon: FileText,
    label: "Quizzes/Test",
    path: "/teacher/quizzes"
  }, {
    icon: Megaphone,
    label: "Announcements",
    path: "/teacher/announcements"
  }, {
    icon: CheckSquare,
    label: "Approvals",
    path: "/teacher/approvals"
  }];
  const studentMenu = [{
    icon: Home,
    label: "Dashboard",
    path: "/student/dashboard"
  }, {
    icon: Book,
    label: "Modules",
    path: "/student/modules"
  }, {
    icon: FileText,
    label: "Quizzes/Test",
    path: "/student/quizzes"
  }, {
    icon: Megaphone,
    label: "Announcements",
    path: "/student/announcements"
  }];
  const menu = user?.role === "student" ? studentMenu : teacherMenu;
  return /*#__PURE__*/_jsxs("aside", {
    className: "sidebar",
    children: [/*#__PURE__*/_jsx("div", {
      className: "sidebar-title",
      children: /*#__PURE__*/_jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        },
        children: [/*#__PURE__*/_jsx("span", {
          className: "sidebar-title-text",
          children: "CommuniLearn"
        })]
      })
    }), /*#__PURE__*/_jsx("nav", {
      style: {
        marginTop: "1rem"
      },
      children: menu.map((item, i) => {
        const Icon = item.icon;
        return /*#__PURE__*/_jsxs(NavLink, {
          to: item.path,
          className: ({
            isActive
          }) => `sidebar-item ${isActive ? "active" : ""}`,
          children: [/*#__PURE__*/_jsx(Icon, {
            size: 20
          }), /*#__PURE__*/_jsx("span", {
            children: item.label
          })]
        }, i);
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "sidebar-bottom",
      children: [/*#__PURE__*/_jsxs(NavLink, {
        onClick: handleLogout,
        to: "/logout",
        className: "sidebar-item",
        children: [/*#__PURE__*/_jsx(LogOut, {
          size: 20
        }), /*#__PURE__*/_jsx("span", {
          children: "Logout"
        })]
      })]
    })]
  });
}