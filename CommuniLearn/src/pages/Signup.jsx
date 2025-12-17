import { useState } from "react";
import "../css/login.css";
import axios from "axios";
import Logo from "../assets/LMS.svg";
import AuthCard from "../components/AuthCard";
import { FcGoogle } from "react-icons/fc";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const Signup = ({
  onToggle
}) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student"
  });
  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await axios.post("http://localhost:5000/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      });
      alert(form.role === "teacher" ? "Signup successful! Your teacher account requires admin approval." : "Signup successful! Please wait for Approval!.");

      // ❗ Do NOT auto login
      onToggle();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Signup failed");
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
        title: "Hello there!",
        subtitle: "Sign Up for the Purposive Communication Course",
        footer: /*#__PURE__*/_jsxs(_Fragment, {
          children: [/*#__PURE__*/_jsx(FcGoogle, {
            size: 20
          }), /*#__PURE__*/_jsx("a", {
            href: "#",
            onClick: e => {
              e.preventDefault();
              onToggle();
            },
            children: "Already have an account?"
          })]
        }),
        note: "Note: Teacher approval is required for course access.",
        children: /*#__PURE__*/_jsxs("form", {
          onSubmit: handleSubmit,
          children: [/*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Full Name"
            }), /*#__PURE__*/_jsx("input", {
              type: "text",
              required: true,
              placeholder: "Enter your name",
              onChange: e => setForm({
                ...form,
                name: e.target.value
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Email / Google Account"
            }), /*#__PURE__*/_jsx("input", {
              type: "email",
              required: true,
              placeholder: "Enter your email",
              onChange: e => setForm({
                ...form,
                email: e.target.value
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Password"
            }), /*#__PURE__*/_jsx("input", {
              type: "password",
              required: true,
              placeholder: "Enter your password",
              onChange: e => setForm({
                ...form,
                password: e.target.value
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Confirm Password"
            }), /*#__PURE__*/_jsx("input", {
              type: "password",
              required: true,
              placeholder: "Re-enter your password",
              onChange: e => setForm({
                ...form,
                confirmPassword: e.target.value
              })
            })]
          }), /*#__PURE__*/_jsx("button", {
            type: "submit",
            className: "btn btn-primary",
            children: "SIGN UP"
          })]
        })
      })
    })]
  });
};
export default Signup;