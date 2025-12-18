import { useEffect, useState } from "react";
import "../css/teacher.css";
import { ChevronDown, ChevronUp, Trash2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config";
import api from "../services/api";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TeacherQuizzes() {
  const [modules, setModules] = useState([]);
  const [openModule, setOpenModule] = useState(null);
  const [openQuizId, setOpenQuizId] = useState(null);
  const [quizDetails, setQuizDetails] = useState({});
  const navigate = useNavigate();
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const resp = await api.get('/modules');
        const data = resp.data;
        setModules(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching modules:", err);
      }
    };
    fetchQuizzes();
  }, []);
  const toggleModule = id => {
    setOpenModule(prev => prev === id ? null : id);
    setOpenQuizId(null);
  };

  // Format due date/time for display. For date-only values, show time as 11:59 PM.
  const formatDueString = dueDateStr => {
    if (!dueDateStr) return "No Due Date";
    const parts = String(dueDateStr).split("T");
    const datePart = parts[0] || "";
    const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
    const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
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
    const dt = new Date(dueDateStr);
    if (isNaN(dt.getTime())) return "No Due Date";
    return `Due: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };
  const loadQuizDetails = async quizId => {
    if (quizDetails[quizId]) {
      setOpenQuizId(prev => prev === quizId ? null : quizId);
      return;
    }
    try {
      const r = await api.get(`/quizzes/${quizId}`);
      const data = r.data;
      setQuizDetails(prev => ({
        ...prev,
        [quizId]: data
      }));
      setOpenQuizId(quizId);
    } catch (err) {
      console.error("Error loading quiz details:", err);
    }
  };
  const handleEditQuiz = quiz => {
    navigate("/teacher/quiz-builder", {
      state: {
        quizId: quiz.id,
        moduleId: quiz.moduleId,
        title: quiz.title
      }
    });
  };
  const handleDeleteQuiz = async quizId => {
    if (!(await window.customConfirm("Delete this quiz? This action cannot be undone."))) return;
    try {
      try {
        const resp = await api.delete(`/quizzes/${quizId}`);
        if (!(resp && resp.status >= 200 && resp.status < 300)) {
          console.error('Delete quiz failed', resp);
          alert('Failed to delete quiz');
          return;
        }
      } catch (err) {
        console.error('Delete quiz failed', err);
        alert('Failed to delete quiz');
        return;
      }
      setModules(prev => prev.map(m => ({
        ...m,
        quizzes: (m.quizzes || []).filter(q => q.id !== quizId)
      })));
      setQuizDetails(prev => {
        const copy = {
          ...prev
        };
        delete copy[quizId];
        return copy;
      });
      if (openQuizId === quizId) setOpenQuizId(null);
      alert("Quiz deleted");
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert("Error deleting quiz");
    }
  };
  const handleDeleteQuestion = async (questionId, quizId) => {
    if (!(await window.customConfirm("Delete this question?"))) return;
    try {
      try {
        const resp = await api.delete(`/quizzes/question/${questionId}`);
        if (!(resp && resp.status >= 200 && resp.status < 300)) {
          console.error('Failed to delete question', resp);
          alert('Failed to delete question');
          return;
        }
      } catch (err) {
        console.error('Failed to delete question', err);
        alert('Failed to delete question');
        return;
      }
      setQuizDetails(prev => {
        const details = prev[quizId];
        if (!details) return prev;
        return {
          ...prev,
          [quizId]: {
            ...details,
            questions: details.questions.filter(q => q.id !== questionId)
          }
        };
      });
      alert("Question deleted");
    } catch (err) {
      console.error("Error deleting question:", err);
      alert("Error deleting question");
    }
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "page-wrap",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "page-header-box",
      children: [/*#__PURE__*/_jsx("h1", {
        className: "page-title",
        children: "Quizzes"
      }), /*#__PURE__*/_jsx("p", {
        className: "page-subtitle",
        children: "Module-Specific Quizzes"
      })]
    }), /*#__PURE__*/_jsxs("div", {
      className: "quiz-module-list",
      children: [modules.length === 0 && /*#__PURE__*/_jsx("p", {
        className: "empty-text",
        children: "No quizzes created yet."
      }), modules.map((m, index) => /*#__PURE__*/_jsxs("div", {
        className: "module-block",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "module-block-header",
          onClick: () => {
            const mid = m.id || m._id;
            toggleModule(mid);
          },
          children: [/*#__PURE__*/_jsx("h2", {
            className: "module-title",
            children: m.title
          }), (openModule === (m.id || m._id)) ? /*#__PURE__*/_jsx(ChevronUp, {
            size: 20
          }) : /*#__PURE__*/_jsx(ChevronDown, {
            size: 20
          })]
          }), (openModule === (m.id || m._id)) && /*#__PURE__*/_jsxs("div", {
          className: "module-block-content",
          children: [m.description && /*#__PURE__*/_jsx("p", {
            className: "module-desc",
            children: m.description
          }), m.document && /*#__PURE__*/_jsx("a", {
            href: m.document && (m.document.startsWith('http') ? m.document : apiUrl(m.document)),
            target: "_blank",
            rel: "noopener noreferrer",
            className: "module-doc-link",
            children: "\uD83D\uDCC4 View Attached Document"
          }), /*#__PURE__*/_jsx("h3", {
            className: "module-subtitle",
            children: "Quizzes"
          }), (m.quizzes ?? []).length === 0 && /*#__PURE__*/_jsx("p", {
            children: "No quizzes yet for this module"
          }), (m.quizzes ?? []).map(q => {
            const qid = q.id || q._id;
            const isOpen = openQuizId === qid;
            const details = quizDetails[qid];
            return /*#__PURE__*/_jsxs("div", {
              className: "quiz-item",
              children: [/*#__PURE__*/_jsxs("div", {
                style: {
                  flex: 1
                },
                children: [/*#__PURE__*/_jsx("h4", {
                  className: "quiz-title",
                  children: q.title
                }), /*#__PURE__*/_jsxs("p", {
                    className: "quiz-meta",
                    children: [
                      (details && Array.isArray(details.questions) ? details.questions.reduce((s, qq) => s + (Number(qq.points) || 1), 0) : (q.totalPoints ?? 0)),
                      " pts \u2022",
                      " ",
                      formatDueString(q.dueDate)
                    ]
                })]
              }), /*#__PURE__*/_jsxs("div", {
                style: {
                  display: "flex",
                  gap: 8,
                  alignItems: "center"
                },
                children: [/*#__PURE__*/_jsx("button", {
                  type: "button",
                  className: "quiz-view-btn",
                  onClick: () => navigate(`/teacher/quiz/${qid}/view`),
                  children: "View"
                }), /*#__PURE__*/_jsx("button", {
                  type: "button",
                  className: "quiz-edit-btn",
                  onClick: () => handleEditQuiz({
                    id: qid,
                    title: q.title,
                    moduleId: m.id || m._id
                  }),
                  title: "Edit quiz",
                  children: /*#__PURE__*/_jsx(Edit2, {
                    size: 16
                  })
                }), /*#__PURE__*/_jsx("button", {
                  type: "button",
                  className: "quiz-delete-btn",
                  onClick: () => handleDeleteQuiz(qid),
                  title: "Delete quiz",
                  children: /*#__PURE__*/_jsx(Trash2, {
                    size: 16
                  })
                })]
              }), isOpen && details && /*#__PURE__*/_jsxs("div", {
                className: "quiz-questions",
                children: [details.questions.length === 0 && /*#__PURE__*/_jsx("p", {
                  children: "No questions yet."
                }), details.questions.map(qq => {
                  let options = [];
                  let files = [];
                  try {
                    options = qq.options ? JSON.parse(qq.options) : [];
                  } catch {}
                  try {
                    files = qq.files ? JSON.parse(qq.files) : [];
                  } catch {}
                    const qqid = qq.id || qq._id;
                    return /*#__PURE__*/_jsxs("div", {
                      className: "quiz-question-item",
                      children: [/*#__PURE__*/_jsxs("div", {
                        style: {
                          flex: 1
                        },
                        children: [/*#__PURE__*/_jsxs("div", {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          },
                          children: [/*#__PURE__*/_jsx("p", {
                            style: {
                              margin: 0,
                              fontWeight: 600
                            },
                            children: qq.question || "(no text)"
                          }), /*#__PURE__*/_jsx("span", {
                            style: {
                              fontSize: 12,
                              color: '#666'
                            },
                            children: `${Number(qq.points) || 1} pts`
                          })]
                        }), /*#__PURE__*/_jsxs("small", {
                          children: ["Type: ", qq.type]
                        }), options.length > 0 && /*#__PURE__*/_jsx("div", {
                          children: /*#__PURE__*/_jsxs("small", {
                            children: ["Options: ", options.join(" | ")]
                          })
                        }), /*#__PURE__*/_jsx("div", {
                          children: /*#__PURE__*/_jsxs("small", {
                            children: ["Answer: ", qq.answer || "(none)"]
                          })
                        }), files.length > 0 && /*#__PURE__*/_jsxs("div", {
                          children: [/*#__PURE__*/_jsx("small", {
                            children: "Files:"
                          }), /*#__PURE__*/_jsx("ul", {
                            children: files.map((f, idx) => /*#__PURE__*/_jsx("li", {
                              children: /*#__PURE__*/_jsx("a", {
                                href: f && (f.startsWith('http') ? f : apiUrl(f)),
                                target: "_blank",
                                rel: "noreferrer",
                                children: f
                              })
                            }, idx))
                          })]
                        })]
                      }), /*#__PURE__*/_jsx("div", {
                        style: {
                          display: "flex",
                          gap: 8
                        },
                        children: /*#__PURE__*/_jsx("button", {
                          className: "delete-option-btn",
                          onClick: () => handleDeleteQuestion(qqid, qid),
                          title: "Delete question",
                          children: /*#__PURE__*/_jsx(Trash2, {
                            size: 14
                          })
                        })
                      })]
                    }, qqid);
                })]
              }), isOpen && !details && /*#__PURE__*/_jsx("div", {
                className: "loader-small",
                children: "Loading..."
              })]
            }, qid);
          })]
        })]
      }, m.id ?? `mod-${index}`))]
    })]
  });
}