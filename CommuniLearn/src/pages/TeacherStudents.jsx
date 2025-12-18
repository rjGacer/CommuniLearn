import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { apiUrl } from "../config";
import api from "../services/api";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const loadStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/auth/approved-users', { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading approved students:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveStudent = async id => {
    if (!(await window.customConfirm("Remove this student?"))) return;
    try {
      const resp = await api.delete(`/auth/remove/${id}`);
      if (!(resp && resp.status >= 200 && resp.status < 300)) {
        const err = resp && resp.data ? resp.data : null;
        return alert((err && err.error) || 'Failed to remove student');
      }
      // update UI
      setStudents(prev => prev.filter(s => s.id !== id));
      setSelectedStudent(null);
    } catch (e) {
      console.error('remove student error', e);
      alert('Failed to remove student');
    }
  };
  
  // Open student details and try to enrich from persisted profile
  const viewStudent = async (s) => {
    // Use already-available student data; avoid per-email profile fetches
    setSelectedStudent(s);
  };
  useEffect(() => {
    loadStudents();
  }, []);
  return /*#__PURE__*/_jsxs("div", {
    className: "page-wrap",
    children: [/*#__PURE__*/_jsx("div", {
      className: "page-header-box",
      children: /*#__PURE__*/_jsx("h1", {
        className: "page-title",
        children: "Student Lists"
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "page-content card-container approvals-list",
      children: loading ? /*#__PURE__*/_jsx("p", {
        children: "Loading..."
      }) : students.length === 0 ? /*#__PURE__*/_jsx("p", {
        children: "No approved students yet."
      }) : students.map(s => /*#__PURE__*/_jsxs("div", {
        className: "approval-row",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "row-left",
          children: [/*#__PURE__*/_jsx(Avatar, {
            name: s.fullName,
            email: s.email || null,
            className: "avatar-small"
          }), /*#__PURE__*/_jsx("div", {
            className: "student-name",
            children: s.fullName
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "row-right",
          children: /*#__PURE__*/_jsx("button", {
            className: "btn-view",
            onClick: () => viewStudent(s),
            children: "View"
          })
        })]
      }, s._id))
    }), selectedStudent && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setSelectedStudent(null),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "Student Details"
        }), /*#__PURE__*/_jsxs("div", {
          className: "student-details-box",
          children: [/*#__PURE__*/_jsx("div", {
            className: "modal-avatar-container",
            children: /*#__PURE__*/_jsx(Avatar, {
              name: selectedStudent.fullName,
              email: selectedStudent.email || null,
              className: "modal-avatar"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "details-row",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Name:"
            }), /*#__PURE__*/_jsx("p", {
              children: selectedStudent.fullName
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "details-row",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Email:"
            }), /*#__PURE__*/_jsx("p", {
              children: selectedStudent.email
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "details-row",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Student ID:"
            }), /*#__PURE__*/_jsx("p", {
              children: selectedStudent.studentId && selectedStudent.studentId !== '' ? selectedStudent.studentId : 'None'
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "details-row",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Biography:"
            }), /*#__PURE__*/_jsx("p", {
              children: selectedStudent.bio && selectedStudent.bio !== '' ? selectedStudent.bio : 'None'
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            className: "modal-btn cancel",
            onClick: () => setSelectedStudent(null),
            children: "Close"
          }), /*#__PURE__*/_jsx("button", {
            className: "modal-btn delete",
            onClick: () => handleRemoveStudent(selectedStudent._id),
            children: "Remove Student"
          })]
        })]
      })
    })]
  });
}