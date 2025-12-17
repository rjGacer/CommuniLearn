import { useState } from "react";
import "../css/login.css";
import axios from "axios";
import Logo from "../assets/LMS.svg";
import AuthCard from "../components/AuthCard";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const Login = ({
  onToggle
}) => {
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const handleSubmit = async e => {
    e.preventDefault();
    const email = e.currentTarget.elements.namedItem("email").value;
    try {
      const res = await axios.post("/api/auth/login", {
        email,
        password
      }, {
        withCredentials: true
      });

      // Save JWT
      localStorage.setItem("token", res.data.token);

      // Attempt to fetch persisted profile and merge
      let mergedUser = { email };
      try {
        const p = await fetch(`/api/profile/${encodeURIComponent(email)}`);
        if (p.ok) {
          const pj = await p.json();
          if (pj.user) mergedUser = Object.assign({}, mergedUser, pj.user);
        }
      } catch (e) {
        // ignore
      }

      // Extract actual role and name from auth response (fallbacks to merged)
      const role = res.data.user?.role || mergedUser.role;
      const name = res.data.user?.name || mergedUser.name;
      mergedUser = Object.assign({}, mergedUser, { role, name });

      // Save user to context (support passing full user object)
      login(mergedUser);

      /* -------------------------------------------
          ⭐ AUTO-ENROLL STUDENTS AFTER LOGIN
      --------------------------------------------*/
      if (role === "student") {
        try {
          await axios.post("/api/modules/auto-enroll", {}, {
            headers: {
              Authorization: "Bearer " + res.data.token
            },
            withCredentials: true
          });
          console.log("Student auto-enrolled successfully.");
        } catch (err) {
          console.error("Auto-enroll failed:", err);
        }
      }

      // Redirect based on role
      if (role === "superteacher") {
        navigate("/superteacher/approvals");
      } else if (role === "teacher") {
        navigate("/teacher/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsx("section", {
      className: "logo-section",
      children: /*#__PURE__*/_jsx("img", {
        src: Logo,
        alt: "CommuniLearn Logo"
      })
    }), /*#__PURE__*/_jsx("section", {
      className: "form-section",
      children: /*#__PURE__*/_jsx(AuthCard, {
        title: "Welcome",
        subtitle: "Sign in to your account.",
        footer: /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(FcGoogle, {
            size: 20
          }), /*#__PURE__*/_jsx("a", {
            href: "#",
            onClick: e => {
              e.preventDefault();
              onToggle();
            },
            style: {
              cursor: "pointer"
            },
            children: "Sign Up Here!"
          })]
        }),
        note: "Learn Languages the Fun Way!",
        children: /*#__PURE__*/_jsxs("form", {
          onSubmit: handleSubmit,
          children: [/*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Email / Google Account"
            }), /*#__PURE__*/_jsx("input", {
              name: "email",
              type: "email",
              placeholder: "Enter your email",
              required: true
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Password"
            }), /*#__PURE__*/_jsx("input", {
              type: "password",
              placeholder: "Enter your password",
              required: true,
              onChange: e => setPassword(e.target.value)
            })]
          }), /*#__PURE__*/_jsx("button", {
            type: "submit",
            className: "btn btn-primary",
            children: "LOGIN"
          })]
        })
      })
    })]
  });
};
export default Login;