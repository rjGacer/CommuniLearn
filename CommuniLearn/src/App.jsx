// App.tsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

/* TEACHER PAGES */
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherModule from "./pages/TeacherModule";
import Settings from "./pages/Settings";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherAnnouncements from "./pages/TeacherAnnouncements";
import TeacherGrades from "./pages/TeacherGrades";
import TeacherQuizzes from "./pages/TeacherQuizzes";
import TeacherApprovals from "./pages/TeacherApprovals";
import TeacherQuizBuilder from "./pages/TeacherQuizBuilder";
import TeacherModuleView from "./pages/TeacherModuleView";
import TeacherQuizView from "./pages/TeacherQuizView";
import Profile from "./pages/Profile";

/* SUPERTEACHER */
import Approval from "./pages/Approvals";

/* STUDENT PAGES */
import StudentDashboard from "./pages/StudentDashboard";
import StudentModules from "./pages/StudentModules";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import StudentQuizzes from "./pages/StudentQuizzes";
import StudentQuizTake from "./pages/StudentQuizTake";
import StudentQuizScore from "./pages/StudentQuizScore";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function App() {
  const {
    user
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  return /*#__PURE__*/_jsx(BrowserRouter, {
    children: user ? /*#__PURE__*/_jsxs("div", {
      className: "min-h-screen",
      style: {
        display: "flex"
      },
      children: [/*#__PURE__*/_jsx(Sidebar, {}), /*#__PURE__*/_jsxs("div", {
        style: {
          marginLeft: "16rem",
          flex: 1
        },
        children: [/*#__PURE__*/_jsx(Header, {}), /*#__PURE__*/_jsx("main", {
          style: {
            padding: "1.5rem"
          },
          children: /*#__PURE__*/_jsxs(Routes, {
            children: [
              user.role === "superteacher" && /*#__PURE__*/_jsxs(_Fragment, {
                children: [
                  /*#__PURE__*/_jsx(Route, {
                    path: "/superteacher/approvals",
                    element: /*#__PURE__*/_jsx(Approval, {})
                  }),
                  /*#__PURE__*/_jsx(Route, { path: "/profile", element: /*#__PURE__*/_jsx(Profile, {}) }),
                  /*#__PURE__*/_jsx(Route, {
                    path: "*",
                    element: /*#__PURE__*/_jsx(Navigate, {
                      to: "/superteacher/approvals",
                      replace: true
                    })
                  })
                ]
              }),

              user.role === "teacher" && /*#__PURE__*/_jsxs(_Fragment, {
                children: [
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/dashboard", element: /*#__PURE__*/_jsx(TeacherDashboard, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/profile", element: /*#__PURE__*/_jsx(Profile, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/module", element: /*#__PURE__*/_jsx(TeacherModule, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/settings", element: /*#__PURE__*/_jsx(Settings, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/students", element: /*#__PURE__*/_jsx(TeacherStudents, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/announcements", element: /*#__PURE__*/_jsx(TeacherAnnouncements, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/grades", element: /*#__PURE__*/_jsx(TeacherGrades, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/quizzes", element: /*#__PURE__*/_jsx(TeacherQuizzes, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/approvals", element: /*#__PURE__*/_jsx(TeacherApprovals, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/module/:id", element: /*#__PURE__*/_jsx(TeacherModuleView, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/quiz-builder", element: /*#__PURE__*/_jsx(TeacherQuizBuilder, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/teacher/quiz/:id/view", element: /*#__PURE__*/_jsx(TeacherQuizView, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "*", element: /*#__PURE__*/_jsx(Navigate, { to: "/teacher/dashboard", replace: true }) })
                ]
              }),

              user.role === "student" && /*#__PURE__*/_jsxs(_Fragment, {
                children: [
                  /*#__PURE__*/_jsx(Route, { path: "/profile", element: /*#__PURE__*/_jsx(Profile, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/dashboard", element: /*#__PURE__*/_jsx(StudentDashboard, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/modules", element: /*#__PURE__*/_jsx(StudentModules, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/quizzes", element: /*#__PURE__*/_jsx(StudentQuizzes, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/announcements", element: /*#__PURE__*/_jsx(StudentAnnouncements, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/quiz/:id", element: /*#__PURE__*/_jsx(StudentQuizTake, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/quizzes/:id/score", element: /*#__PURE__*/_jsx(StudentQuizScore, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "/student/module/:id", element: /*#__PURE__*/_jsx(TeacherModuleView, {}) }),
                  /*#__PURE__*/_jsx(Route, { path: "*", element: /*#__PURE__*/_jsx(Navigate, { to: "/student/dashboard", replace: true }) })
                ]
              })
            ]
          })
        })]
      })]
    }) : /*#__PURE__*/_jsx("div", {
      className: "container",
      children: isLogin ? /*#__PURE__*/_jsx(Login, {
        onToggle: () => setIsLogin(false)
      }) : /*#__PURE__*/_jsx(Signup, {
        onToggle: () => setIsLogin(true)
      })
    })
  });
}
export default App;