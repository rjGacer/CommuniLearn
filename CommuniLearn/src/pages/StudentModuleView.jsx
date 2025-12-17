import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiUrl } from "../config";
import { useParams, useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function StudentModuleView() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const userEmail = localStorage.getItem("email") ?? "";
  useEffect(() => {
    loadModule();
    loadComments();
  }, [id]);
  const loadModule = async () => {
    try {
      const resp = await fetch(apiUrl(`/api/modules/student/${id}`), {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const data = await resp.json();
      setModuleData({
        ...data,
        quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
      });
    } catch (err) {
      console.error("Error loading student module:", err);
    }
  };
  const loadComments = async () => {
    try {
      const resp = await fetch(apiUrl(`/api/module-comments/${id}`), {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const data = await resp.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };
  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      await fetch(apiUrl(`/module-comments/${id}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          text: newComment,
          moduleId: Number(id)
        })
      });
      setNewComment("");
      loadComments();
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };
  const deleteComment = async commentId => {
    if (!(await window.customConfirm("Delete this comment?"))) return;
    try {
      const res = await fetch(apiUrl(`/module-comments/delete/${commentId}`), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Failed to delete comment:", err);
        alert("Failed to delete comment");
        return;
      }
      setMenuOpenId(null);
      loadComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Error deleting comment");
    }
  };
  const startEditComment = comment => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
    setMenuOpenId(null);
  };
  const submitEditComment = async commentId => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await fetch(apiUrl(`/module-comments/${commentId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          text: editingCommentText
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Failed to edit comment:", err);
        alert("Failed to edit comment");
        return;
      }
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    } catch (err) {
      console.error("Error editing comment:", err);
      alert("Error editing comment");
    }
  };
  if (!moduleData) return /*#__PURE__*/_jsx("p", { children: "Loading..." });

  // derive teacher display name from email (fallback to raw email)
    const teacherName = moduleData.teacherName || moduleData.teacherEmail?.split('@')?.[0] || moduleData.teacherEmail || 'Instructor';

  return /*#__PURE__*/_jsxs("div", {
    className: "gc-module-page",
    children: [/*#__PURE__*/_jsx("div", {
      className: "gc-header",
        children: /*#__PURE__*/_jsxs("div", {
          className: "gc-header-left",
          children: [/*#__PURE__*/_jsx(Avatar, {
            name: teacherName,
            email: moduleData.teacherEmail,
            className: "gc-profile-circle"
          }), /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h1", {
              className: "gc-title",
              children: (moduleData.title || '').toUpperCase()
            }), /*#__PURE__*/_jsxs("p", {
              className: "gc-subtitle",
              children: [moduleData.teacherEmail]
            }), moduleData.createdAt && /*#__PURE__*/_jsxs("p", {
              className: "gc-date-small",
              children: ["Posted ", timeAgo(moduleData.createdAt)]
            })]
          })]
        })
    }),

    // Module title card (matches screenshot)
    

    /*#__PURE__*/_jsxs("div", {
      className: "gc-material-card",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "gc-section-title",
        children: "Module Material"
      }), !moduleData.documentPath && /*#__PURE__*/_jsx("p", {
        children: "No material uploaded."
      }), moduleData.documentPath && (() => {
        const fileName = moduleData.documentPath.split("\\").pop()?.split("/").pop();
        const ext = fileName?.split(".").pop()?.toLowerCase();
        if (ext === "pdf") {
          return /*#__PURE__*/_jsxs("div", {
            className: "gc-pdf-card",
            children: [/*#__PURE__*/_jsx("iframe", {
              src: `/api/${moduleData.documentPath}`,
              className: "gc-pdf-preview"
            }), /*#__PURE__*/_jsxs("div", {
              className: "gc-pdf-info",
              children: [/*#__PURE__*/_jsx("p", {
                className: "gc-pdf-name",
                children: fileName
              }), /*#__PURE__*/_jsx("a", {
                href: `/api/${moduleData.documentPath}`,
                target: "_blank",
                className: "gc-open-btn",
                children: "Open"
              })]
            })]
          });
        }
        return /*#__PURE__*/_jsxs("div", {
          className: "gc-pdf-card",
          children: [/*#__PURE__*/_jsx("div", {
            className: "gc-pdf-preview",
            children: /*#__PURE__*/_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }, children: '📄' })
          }), /*#__PURE__*/_jsxs("div", {
            className: "gc-pdf-info",
            children: [/*#__PURE__*/_jsx("p", {
              className: "gc-pdf-name",
              children: fileName
            }), /*#__PURE__*/_jsx("a", {
              href: `/api/${moduleData.documentPath}`,
              target: "_blank",
              className: "gc-open-btn",
              children: "Open"
            })]
          })]
        });
      })()]
    }), /*#__PURE__*/_jsxs("div", {
      className: "gc-quizzes-section",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "gc-section-title",
        children: "Quizzes"
      }), moduleData.quizzes.length === 0 && /*#__PURE__*/_jsx("p", {
        children: "No quizzes yet."
      moduleData.quizzes.map(q => /*#__PURE__*/_jsxs("div", {
        className: "gc-quiz-item",
        children: [/*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h4", {
            children: q.title
          }), /*#__PURE__*/_jsxs("p", {
              children: [q.totalPoints ?? 0, " pts", " \u2022 ", q.dueDate ? (() => {
                // format due date/time: date-only => show 11:59 PM, time-only sentinel => show time
                const parts = String(q.dueDate).split("T");
                const datePart = parts[0] || "";
                const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
                const timePart = timePartRaw ? timePartRaw.slice(0,5) : "";
                if (datePart === "1970-01-01") {
                  if (!timePart) return "Due: --:--";
                  const dt = new Date(`1970-01-01T${timePart}`);
                  return `Due: ${dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                }
                if (!timePart) {
                  const [y, m, d] = datePart.split("-").map(s => Number(s));
                  if (!y || !m || !d) return `Due: ${datePart}`;
                  const dt = new Date(y, m - 1, d, 23, 59, 0, 0);
                  return `Due: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                }
                const dt = new Date(q.dueDate);
                return `Due: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
              })() : "No Due Date"]
          })]
        }), /*#__PURE__*/_jsx("button", {
            className: "gc-view-quiz-btn",
            onClick: () => navigate(`/student/quiz/${q.id}`),
            children: (() => {
              // determine if due date/time passed (supports time-only sentinel)
              const isPast = (() => {
                if (!q.dueDate) return false;
                const parts = String(q.dueDate).split("T");
                const datePart = parts[0] || "";
                const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
                const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
                if (datePart === "1970-01-01") {
                  if (!timePart) return false;
                  const [hh, mm] = timePart.split(":");
                  const cmp = new Date(); cmp.setHours(Number(hh||0), Number(mm||0), 0, 0);
                  return cmp.getTime() <= Date.now();
                }
                const parsed = new Date(q.dueDate);
                if (isNaN(parsed.getTime())) return false;
                return parsed.getTime() <= Date.now();
              })();
              return isPast ? "Time's up" : "Take Quiz";
            })()
        })]
      }, q.id))]
    }), /*#__PURE__*/_jsxs("div", {
      className: "gc-comments-section",
      children: [/*#__PURE__*/_jsx("h3", {
        className: "gc-section-title",
        children: "Class comments"
      }), /*#__PURE__*/_jsx("div", {
        className: "gc-comment-list",
        children: comments.map(c => /*#__PURE__*/_jsxs("div", {
          className: "gc-comment",
          children: [/*#__PURE__*/_jsx(Avatar, {
              name: c.username || c.authorName,
            email: c.authorEmail,
            className: "gc-comment-avatar"
          }), /*#__PURE__*/_jsxs("div", {
            className: "gc-comment-body",
            children: [/*#__PURE__*/_jsxs("div", {
              style: {
                display: "flex",
                gap: 10,
                alignItems: "baseline"
              },
              children: [/*#__PURE__*/_jsx("p", {
                className: "gc-comment-author",
                  children: c.username || c.authorName
              }), /*#__PURE__*/_jsx("p", {
                className: "gc-comment-time",
                children: timeAgo(c.createdAt)
              }), c.updatedAt && new Date(c.updatedAt) > new Date(c.createdAt) && /*#__PURE__*/_jsx("span", {
                style: {
                  fontSize: "0.85rem",
                  color: "#999"
                },
                children: "(edited)"
              })]
            }), editingCommentId === c.id ? /*#__PURE__*/_jsxs(_Fragment, {
              children: [/*#__PURE__*/_jsx("textarea", {
                className: "gc-comment-input",
                value: editingCommentText,
                onChange: e => setEditingCommentText(e.target.value),
                style: {
                  marginTop: 8,
                  marginBottom: 8
                }
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  gap: 8
                },
                children: [/*#__PURE__*/_jsx("button", {
                  className: "gc-send-btn",
                  onClick: () => submitEditComment(c.id),
                  style: {
                    background: "#16a34a",
                    fontSize: "0.9rem"
                  },
                  children: "Save"
                }), /*#__PURE__*/_jsx("button", {
                  className: "gc-send-btn",
                  onClick: () => setEditingCommentId(null),
                  style: {
                    background: "#6b7280",
                    fontSize: "0.9rem"
                  },
                  children: "Cancel"
                })]
              })]
            }) : /*#__PURE__*/_jsx("p", {
              className: "gc-comment-text",
              children: c.text
            })]
          }), userEmail === c.authorEmail && /*#__PURE__*/_jsxs("div", {
            style: {
              marginLeft: 8,
              position: "relative"
            },
            children: [/*#__PURE__*/_jsx("div", {
              className: "comment-menu",
              onClick: () => setMenuOpenId(prev => prev === c.id ? null : c.id),
              children: "\u22EE"
            }), menuOpenId === c.id && userEmail === c.authorEmail && /*#__PURE__*/_jsxs("div", {
              className: "gc-comment-menu",
              style: {
                right: 12
              },
              children: [/*#__PURE__*/_jsx("div", {
                onClick: () => startEditComment(c),
                children: "\u270F\uFE0F Edit"
              }), /*#__PURE__*/_jsx("div", {
                onClick: () => deleteComment(c.id),
                children: "\uD83D\uDDD1\uFE0F Delete"
              })]
            })]
          })]
        }, c.id))
      }), /*#__PURE__*/_jsxs("div", {
        className: "gc-comment-input-row",
        children: [/*#__PURE__*/_jsx(Avatar, {
          name: userEmail,
          email: userEmail,
          className: "gc-comment-avatar small"
        }), /*#__PURE__*/_jsx("input", {
          className: "gc-comment-input",
          placeholder: "Add class comment...",
          value: newComment,
          onChange: e => setNewComment(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter") {
              e.preventDefault();
              postComment();
            }
          }
        }), /*#__PURE__*/_jsx("button", {
          className: "gc-send-btn",
          onClick: postComment,
          children: "\u27A4"
        })]
      })]
    })]
  });
}