import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const loadStudents = async () => {
    try {
      const res = await fetch("http://localhost:5000/auth/approved", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Error loading approved students:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveStudent = async id => {
    if (!(await window.customConfirm("Remove this student?"))) return;
    try {
      const resp = await fetch(`http://localhost:5000/auth/remove/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({ error: 'Remove failed' }));
        return alert(err.error || 'Failed to remove student');
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
    setSelectedStudent(s);
    try {
      if (s && s.email) {
        const res = await fetch(`http://localhost:5000/profile/${encodeURIComponent(s.email)}`);
        if (res.ok) {
          const j = await res.json();
          const server = j.user || null;
          if (server) {
            setSelectedStudent(Object.assign({}, s, server));
          }
        }
      }
    } catch (e) {
      // ignore errors — show basic info
      console.error('Failed to fetch student profile', e);
    }
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
            name: s.name,
            email: s.email || null,
            className: "avatar-small"
          }), /*#__PURE__*/_jsx("div", {
            className: "student-name",
            children: s.name
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "row-right",
          children: /*#__PURE__*/_jsx("button", {
            className: "btn-view",
            onClick: () => viewStudent(s),
            children: "View"
          })
        })]
      }, s.id))
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
              name: selectedStudent.name,
              email: selectedStudent.email || null,
              className: "modal-avatar"
            })
          }), /*#__PURE__*/_jsxs("div", {
            className: "details-row",
            children: [/*#__PURE__*/_jsx("label", {
              children: "Name:"
            }), /*#__PURE__*/_jsx("p", {
              children: selectedStudent.name
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
            onClick: () => handleRemoveStudent(selectedStudent.id),
            children: "Remove Student"
          })]
        })]
      })
    })]
  });
}