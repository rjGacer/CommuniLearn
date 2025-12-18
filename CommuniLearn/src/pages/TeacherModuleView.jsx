import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config";
import { timeAgo } from "../utils/timeAgo";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function TeacherModuleView() {
  const {
    id
  } = useParams();
  const {
    user
  } = useAuth();
  const [moduleData, setModuleData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [teachersMap, setTeachersMap] = useState({});
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const userEmail = localStorage.getItem("email") ?? ""; // from your auth

  useEffect(() => {
    loadModule();
    loadComments();
  }, [id]);
  const loadModule = async () => {
    try {
      const resp = await fetch(apiUrl(`/modules/${id}`), {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const data = await resp.json();
      // try to enrich with teacher picture from API
      try {
        const tResp = await fetch(apiUrl('/auth/teachers'), { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        if (tResp.ok) {
          const tData = await tResp.json();
          const teacher = Array.isArray(tData) && data.teacherEmail ? tData.find(t => t.email === data.teacherEmail) : null;
          const map = {};
          if (Array.isArray(tData)) {
            for (const t of tData) {
              if (t.email) map[t.email] = t;
            }
          }
          setTeachersMap(map);
          setTeachersMap(map);
          setModuleData({
            ...data,
            teacherPicture: teacher ? teacher.picture : data.picture || null,
            teacherName: teacher ? (teacher.username || teacher.name) : (data.teacherName || null),
            quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
          });
        } else {
          setModuleData({
            ...data,
            teacherPicture: data.picture || null,
            teacherName: data.teacherName || null,
            quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
          });
        }
      } catch (e) {
        setModuleData({
          ...data,
          teacherPicture: data.picture || null,
          teacherName: data.teacherName || null,
          quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };
  const loadComments = async () => {
    try {
      const resp = await fetch(apiUrl(`/module-comments/${id}`), {
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
      const res = await fetch(apiUrl(`/module-comments/${id}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          text: newComment
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Failed to post comment:", err);
        alert("Failed to post comment");
        return;
      }
      setNewComment("");
      loadComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Error posting comment");
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
  if (!moduleData) return /*#__PURE__*/_jsx("p", {
    children: "Loading..."
  });
  return /*#__PURE__*/_jsxs("div", {
    className: "gc-module-page",
    children: [/*#__PURE__*/_jsx("div", {
      className: "gc-header",
      children: /*#__PURE__*/_jsxs("div", {
        className: "gc-header-left",
          children: [/*#__PURE__*/_jsx(Avatar, {
            src: moduleData.teacherPicture || undefined,
            name: moduleData.teacherName || moduleData.teacherEmail.split("@")[0],
            email: moduleData.teacherEmail,
            className: "gc-profile-circle"
          }), /*#__PURE__*/_jsxs("div", {
          children: [/*#__PURE__*/_jsx("h1", {
            className: "gc-title",
            children: moduleData.teacherName || moduleData.teacherEmail.split("@")[0]
          }), /*#__PURE__*/_jsx("p", {
            className: "gc-subtitle",
            children: moduleData.teacherEmail
          }), moduleData.createdAt && /*#__PURE__*/_jsxs("p", {
            className: "gc-date-small",
            children: ["Posted ", timeAgo(moduleData.createdAt)]
          })]
        })]
      })
    }), /*#__PURE__*/_jsxs("div", {
      className: "gc-material-card",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "gc-section-title",
        children: moduleData.title
      }), /*#__PURE__*/_jsx("hr", {
        style: {
          margin: "10px 0",
          opacity: 0.3
        }
      }), moduleData.description && /*#__PURE__*/_jsx("p", {
        style: {
          marginBottom: "15px"
        },
        children: moduleData.description
      }), /*#__PURE__*/_jsx("hr", {
        style: {
          margin: "10px 0",
          opacity: 0.3
        }
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
      })(),
    (moduleData.videoPath || moduleData.mediaPath || moduleData.videoUrl || moduleData.mediaUrl) && (() => {
      const mediaPath = moduleData.videoPath || moduleData.mediaPath || null;
      const mediaUrl = moduleData.videoUrl || moduleData.mediaUrl || null;
      return /*#__PURE__*/_jsxs("div", {
        className: "gc-media-card",
        children: [mediaPath && (() => {
          const fileName = String(mediaPath).split("\\").pop()?.split("/").pop();
          const ext = fileName?.split(".").pop()?.toLowerCase();
          if (ext === "mp4" || ext === "webm" || ext === "mkv") {
            return /*#__PURE__*/_jsx("video", {
              src: `/api/${mediaPath}`,
              controls: true,
              className: "gc-pdf-preview"
            });
          }
          if (ext === "mp3" || ext === "wav" || ext === "ogg") {
            return /*#__PURE__*/_jsx("audio", {
              src: `/api/${mediaPath}`,
              controls: true,
              className: "gc-audio-preview"
            });
          }
          return /*#__PURE__*/_jsxs("div", {
            className: "gc-pdf-card",
            children: [/*#__PURE__*/_jsx("div", {
              className: "gc-pdf-preview",
              children: /*#__PURE__*/_jsx("div", {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: 36
                },
                children: '📁'
              })
            }), /*#__PURE__*/_jsxs("div", {
              className: "gc-pdf-info",
              children: [/*#__PURE__*/_jsx("p", {
                className: "gc-pdf-name",
                children: fileName
              }), /*#__PURE__*/_jsx("a", {
                  href: `/api/${mediaPath}`,
                target: "_blank",
                className: "gc-open-btn",
                children: "Open"
              })]
            })]
          });
        })(), mediaUrl && (() => {
          const url = String(mediaUrl).trim();
          const ytMatch = url.match(/(?:youtube\.com.*(?:v=|\/embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
          if (ytMatch) {
            const embed = `https://www.youtube.com/embed/${ytMatch[1]}`;
            return /*#__PURE__*/_jsx("iframe", {
              src: embed,
              className: "gc-pdf-preview",
              title: "YouTube video",
              frameBorder: "0",
              allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              allowFullScreen: true
            });
          }
          const vMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
          if (vMatch) {
            const embed = `https://player.vimeo.com/video/${vMatch[1]}`;
            return /*#__PURE__*/_jsx("iframe", {
              src: embed,
              className: "gc-pdf-preview",
              title: "Vimeo video",
              frameBorder: "0",
              allow: "autoplay; fullscreen; picture-in-picture",
              allowFullScreen: true
            });
          }
          if (url.match(/\.(mp3|wav|ogg)(?:\?.*)?$/i)) {
            return /*#__PURE__*/_jsx("audio", {
              src: url,
              controls: true,
              className: "gc-audio-preview"
            });
          }
          return /*#__PURE__*/_jsxs("div", {
            style: { marginTop: 8 },
            children: [/*#__PURE__*/_jsx("a", {
              href: url,
              target: "_blank",
              rel: "noreferrer",
              className: "module-doc-link",
              children: url
            })]
          });
        })()]
      });
    })()]
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
              src: c.authorEmail === userEmail ? (user && user.picture) : (c.authorPicture || (teachersMap[c.authorEmail] && teachersMap[c.authorEmail].picture)),
              name: c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName,
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
                children: c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName
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
          }), (userEmail === c.authorEmail || user?.role === "teacher" || user?.role === "superteacher") && /*#__PURE__*/_jsxs("div", {
            style: {
              marginLeft: 8,
              position: "relative"
            },
            children: [/*#__PURE__*/_jsx("button", {
              className: "module-more-btn",
              onClick: () => setMenuOpenId(prev => prev === c.id ? null : c.id),
              children: "\u22EE"
            }), menuOpenId === c.id && /*#__PURE__*/_jsxs("div", {
              className: "module-dropdown",
              style: {
                left: '100%',
                top: 28
              },
              children: [(userEmail === c.authorEmail || user?.role === 'teacher' || user?.role === 'superteacher') && /*#__PURE__*/_jsx("div", {
                className: "module-dropdown-item",
                onClick: () => startEditComment(c),
                children: "\u270F\uFE0F Edit"
              }), /*#__PURE__*/_jsx("div", {
                className: "module-dropdown-item module-dropdown-delete",
                onClick: () => deleteComment(c.id),
                children: "\uD83D\uDDD1\uFE0F Delete"
              })]
            })]
          })]
        }, c.id))
      }), /*#__PURE__*/_jsxs("div", {
        className: "gc-comment-input-row",
        children: [/*#__PURE__*/_jsx(Avatar, {
          src: user?.picture,
          name: user?.name || userEmail.split('@')[0],
          email: user?.email || userEmail,
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