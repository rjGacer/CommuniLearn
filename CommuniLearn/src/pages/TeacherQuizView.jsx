import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, Edit2 } from "lucide-react";
import { apiUrl } from "../config";
import api from "../services/api";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function TeacherQuizView() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("test");
  const [scores, setScores] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [filterTaken, setFilterTaken] = useState(true);
  const [filterMissing, setFilterMissing] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/quizzes/${id}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
        setQuiz(res.data);
      } catch (err) {
        console.error("Failed to load quiz", err);
      } finally {
        setLoading(false);
      }
    };
    load();
    loadScores();
  }, [id]);

  // close filter dropdown when clicking outside
  useEffect(() => {
    const onDocClick = e => {
      if (!filterOpen) return;
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [filterOpen]);
  const loadScores = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await api.get(`/quizzes/${id}/scores`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      setScores(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Failed to load scores", err);
    }
  };

  const { user } = useAuth() || {};

  // mark quiz viewed so it won't appear as new in Header/RightSidebar
  const markQuizViewed = (quizId) => {
    try {
      const storageKey = `recentViewedItems_${(user && user.email) ? user.email : 'guest'}`;
      const raw = localStorage.getItem(storageKey);
      const viewed = raw ? JSON.parse(raw) : [];
      const key = `Quiz-${quizId}`;
      if (!viewed.includes(key)) {
        viewed.push(key);
        localStorage.setItem(storageKey, JSON.stringify(viewed));
        try { localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); } catch(e){}
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (quiz && quiz.id) markQuizViewed(quiz.id);
  }, [quiz]);

  // helper to download a file URL via fetch and creating a blob link
  const downloadFile = async url => {
    try {
      const full = url.startsWith('http') ? url : apiUrl(url);
      const resp = await fetch(full, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!resp.ok) {
        alert('Failed to download file');
        return;
      }
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      // try to derive filename from URL
      const parts = url.split('/');
      a.download = parts[parts.length - 1] || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      console.error('Download error', e);
      alert('Download failed');
    }
  };

  // Extract file paths or URLs from messy strings (handles quoted/escaped values)
  const extractPathsFromString = (s) => {
    if (!s || typeof s !== 'string') return [];
    let str = s.trim();
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }
    str = str.replace(/\\\\/g, '\\').replace(/\\/g, '/');
    if (str.startsWith('[')) {
      try { const parsed = JSON.parse(str); if (Array.isArray(parsed)) return parsed.map(String); } catch (e) {}
    }
    const urlRegex = /(https?:\/\/[^\s"']+|\/uploads\/[^\s"']+)/g;
    const matches = str.match(urlRegex);
    if (matches && matches.length) return matches.map(m => m.trim());
    if (str.startsWith('/') || str.includes('/uploads/') || /\.(pdf|png|jpg|jpeg|gif|webp|docx?|pptx?)$/i.test(str)) return [str];
    return [];
  };

  // small renderer for a single file card (pdf/image/other)
  const renderFileCardSimple = (f, i) => {
    if (!f) return null;
    const file = String(f);
    const url = file.startsWith('http') ? file : apiUrl(file);
    const fileName = file.split('/').pop();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <div key={i} className="gc-pdf-card">
          <iframe src={url} className="gc-pdf-preview" title={fileName} />
          <div className="gc-pdf-info">
            <p className="gc-pdf-name">{fileName}</p>
            <div>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button style={{ marginLeft: 8 }} onClick={() => downloadFile(file)}>Download</button>
            </div>
          </div>
        </div>
      );
    }
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
      return (
        <div key={i} className="gc-pdf-card">
          <div className="gc-pdf-preview"><img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }} /></div>
          <div className="gc-pdf-info">
            <p className="gc-pdf-name">{fileName}</p>
            <div>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button style={{ marginLeft: 8 }} onClick={() => downloadFile(file)}>Download</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={i} className="gc-pdf-card">
        <div className="gc-pdf-preview"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }}>📄</div></div>
        <div className="gc-pdf-info">
          <p className="gc-pdf-name">{fileName}</p>
          <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
        </div>
      </div>
    );
  };
  const deleteQuiz = async () => {
    if (!(await window.customConfirm("Delete this entire quiz?"))) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/quizzes/${id}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      alert("Quiz deleted");
      navigate("/teacher/quizzes");
    } catch (e) {
      console.error(e);
    }
  };
  const deleteQuestion = async questionId => {
    if (!(await window.customConfirm("Delete this question?"))) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/quizzes/question/${questionId}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      setQuiz({
        ...quiz,
        questions: quiz.questions.filter(q => q.id !== questionId)
      });
    } catch (e) {
      console.error(e);
    }
  };
  if (loading) return /*#__PURE__*/_jsx("p", {
    className: "loader",
    children: "Loading..."
  });
  if (!quiz) return /*#__PURE__*/_jsx("p", {
    children: "Quiz not found"
  });
  return /*#__PURE__*/_jsxs("div", {
    className: "tqv-container",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "tqv-card",
      style: {
        position: "relative"
      },
      children: [/*#__PURE__*/_jsx("button", {
        onClick: () => navigate('/teacher/quizzes'),
        "aria-label": "Close and go back",
        title: "Back to quizzes",
        className: "tqv-close-btn",
        children: "Close"
      }), /*#__PURE__*/_jsxs("div", {
        className: "tqv-tabs",
        children: [/*#__PURE__*/_jsx("div", {
          className: `tqv-tab ${activeTab === "test" ? "active" : ""}`,
          onClick: () => setActiveTab("test"),
          children: "Test"
        }), /*#__PURE__*/_jsx("div", {
          className: `tqv-tab ${activeTab === "scores" ? "active" : ""}`,
          onClick: () => setActiveTab("scores"),
          children: "Scores"
        })]
      }), activeTab === "test" && /*#__PURE__*/_jsxs("div", {
        className: "tqv-header-content",
        children: [/*#__PURE__*/_jsx("h1", {
          className: "tqv-title",
          children: quiz.title
        }), /*#__PURE__*/_jsxs("p", {
          className: "tqv-subinfo",
          children: [quiz.totalPoints || 0, " points", quiz.dueDate && /*#__PURE__*/_jsxs(_Fragment, {
            children: [" \u2022 Due ", new Date(quiz.dueDate).toLocaleDateString()]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "tqv-btn-row",
          children: [/*#__PURE__*/_jsxs("button", {
            className: "tqv-edit-btn",
            onClick: () => navigate("/teacher/quiz-builder", {
              state: {
                quizId: quiz.id,
                moduleId: quiz.moduleId,
                title: quiz.title,
                description: quiz.description,
                timeLimit: quiz.timeLimit,
                dueDate: quiz.dueDate,
                questions: quiz.questions
              }
            }),
            children: [/*#__PURE__*/_jsx(Edit2, {
              size: 16
            }), " Edit Quiz"]
          }), /*#__PURE__*/_jsxs("button", {
            className: "tqv-delete-btn",
            onClick: deleteQuiz,
            children: [/*#__PURE__*/_jsx(Trash2, {
              size: 16
            }), " Delete Quiz"]
          })]
        })]
      })]
    }), activeTab === "test" && /*#__PURE__*/_jsxs(_Fragment, {
      children: [/*#__PURE__*/_jsx("h2", {
        className: "tqv-section-title",
        children: "Questions"
      }), quiz.questions.map((q, index) => {
        let options = [];
        let files = [];
        try {
          options = q.options ? JSON.parse(q.options) : [];
        } catch {}
        try {
          files = q.files ? JSON.parse(q.files) : [];
        } catch {}
        return /*#__PURE__*/_jsxs("div", {
          className: "tqv-card",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "tqv-question-header",
            children: [/*#__PURE__*/_jsxs("h3", {
              className: "tqv-question-number",
              children: ["Question ", index + 1]
            }), /*#__PURE__*/_jsx("button", {
              className: "tqv-trash",
              onClick: () => deleteQuestion(q.id),
              children: /*#__PURE__*/_jsx(Trash2, {
                size: 16
              })
            })]
          }), /*#__PURE__*/_jsxs("div", {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6
            },
            children: [/*#__PURE__*/_jsx("p", {
              className: "tqv-question-text",
              style: { margin: 0, flex: 1 },
              children: q.question
            }), /*#__PURE__*/_jsx("span", {
              style: { fontSize: 12, color: '#666', marginLeft: 12 },
              children: `${Number(q.points) || 1} pts`
            })]
          }), /*#__PURE__*/_jsxs("p", {
            className: "tqv-type",
            children: ["Type: ", q.type]
          }), q.type === "Multiple Choice" && /*#__PURE__*/_jsx("div", {
            className: "tqv-option-list",
            children: options.map((opt, i) => /*#__PURE__*/_jsx("div", {
              className: `tqv-option-item ${opt === q.answer ? "correct" : ""}`,
              children: opt
            }, i))
          }), q.type === "Identification" && /*#__PURE__*/_jsxs("p", {
            className: "tqv-identification-answer",
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Answer:"
            }), " ", q.answer]
          }), files.length > 0 && /*#__PURE__*/_jsxs("div", {
            className: "tqv-files",
            children: [/*#__PURE__*/_jsx("strong", {
              children: "Files:"
            }), files.map((f, i) => {
              const url = f.startsWith('http') ? f : apiUrl(f);
              const fileName = String(f).split("/").pop();
              const ext = (fileName || "").split('.').pop()?.toLowerCase();
              if (ext === 'pdf') {
                return /*#__PURE__*/_jsxs("div", {
                  className: "gc-pdf-card",
                  children: [/*#__PURE__*/_jsx("iframe", {
                    src: url,
                    className: "gc-pdf-preview"
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "gc-pdf-info",
                    children: [/*#__PURE__*/_jsx("p", {
                      className: "gc-pdf-name",
                      children: fileName
                    }), /*#__PURE__*/_jsx("a", {
                      href: url,
                      target: "_blank",
                      rel: "noreferrer",
                      className: "gc-open-btn",
                      children: "Open"
                    })]
                  })]
                }, i);
              }
              if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                return /*#__PURE__*/_jsxs("div", {
                  className: "gc-pdf-card",
                  children: [/*#__PURE__*/_jsx("div", {
                    className: "gc-pdf-preview",
                    children: /*#__PURE__*/_jsx("img", {
                      src: url,
                      alt: fileName,
                      style: { maxWidth: '100%', maxHeight: '160px', objectFit: 'contain' }
                    })
                  }), /*#__PURE__*/_jsxs("div", {
                    className: "gc-pdf-info",
                    children: [/*#__PURE__*/_jsx("p", {
                      className: "gc-pdf-name",
                      children: fileName
                    }), /*#__PURE__*/_jsx("a", {
                      href: url,
                      target: "_blank",
                      rel: "noreferrer",
                      className: "gc-open-btn",
                      children: "Open"
                    })]
                  })]
                }, i);
              }
              // default: show link with open button
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
                    href: url,
                    target: "_blank",
                    rel: "noreferrer",
                    className: "gc-open-btn",
                    children: "Open"
                  })]
                })]
              }, i);
            })]
          })]
        }, q.id);
      })]
    }), activeTab === "scores" && /*#__PURE__*/_jsxs("div", {
      children: [/*#__PURE__*/_jsxs("div", {
        style: {
          position: "relative"
        },
        children: [/*#__PURE__*/_jsx("h2", {
          className: "tqv-section-title",
          children: "Student Scores"
        }), /*#__PURE__*/_jsxs("div", {
          ref: filterRef,
          className: "tqv-filter-wrap",
          children: [/*#__PURE__*/_jsx("button", {
            className: "tqv-filter-btn",
            "aria-expanded": filterOpen,
            onClick: e => {
              e.stopPropagation();
              setFilterOpen(v => !v);
            },
            children: "Filters \u25BE"
          }), filterOpen && /*#__PURE__*/_jsxs("div", {
            className: "tqv-filter-dropdown",
            onClick: ev => ev.stopPropagation(),
            children: [/*#__PURE__*/_jsxs("label", {
              children: [/*#__PURE__*/_jsx("input", {
                type: "checkbox",
                checked: filterTaken,
                onChange: e => setFilterTaken(e.target.checked),
                style: {
                  marginRight: 8
                }
              }), "Taken"]
            }), /*#__PURE__*/_jsxs("label", {
              style: {
                display: 'block',
                marginTop: 6
              },
              children: [/*#__PURE__*/_jsx("input", {
                type: "checkbox",
                checked: filterMissing,
                onChange: e => setFilterMissing(e.target.checked),
                style: {
                  marginRight: 8
                }
              }), "Missing"]
            })]
          })]
        })]
      }), scores.length === 0 && /*#__PURE__*/_jsx("p", {
        children: "No students are enrolled in this module yet."
      }), (() => {
        const noneChecked = !filterTaken && !filterMissing;
        const visible = noneChecked ? scores : scores.filter(s => {
          const hasScore = s.score !== null && s.score !== undefined;
          if (hasScore && filterTaken) return true;
          if (!hasScore && filterMissing) return true;
          return false;
        });
        if (scores.length > 0 && visible.length === 0) {
          return /*#__PURE__*/_jsx("p", {
            children: "No students match the selected filters."
          });
        }
        return /*#__PURE__*/_jsx("div", {
          className: "tqv-score-list",
          children: visible.map(s => /*#__PURE__*/_jsxs("div", {
            className: "tqv-score-item",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "tqv-score-left",
              children: [/*#__PURE__*/_jsx(Avatar, {
                src: s.profilePic || null,
                name: s.name,
                className: "tqv-pfp"
              }), /*#__PURE__*/_jsx("span", {
                className: "tqv-score-name",
                children: s.name
              })]
            }), /*#__PURE__*/_jsxs("div", {
              className: "tqv-score-right",
                children: [/*#__PURE__*/_jsx("b", {
                style: {
                  marginRight: 12
                },
                children: s.score !== null && s.score !== undefined ? `${s.score}/${s.total ?? quiz.totalPoints ?? (quiz.questions ? quiz.questions.reduce((a,b)=>a+(Number(b.points)||1),0) : 0)}` : 'missing'
              }), /*#__PURE__*/_jsx("button", {
                className: "tqv-view-btn",
                onClick: async () => {
                  setAttemptLoading(true);
                    try {
                    const token = localStorage.getItem('token');
                    const resp = await api.get(`/quizzes/${id}/attempts/list`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
                    const attempts = Array.isArray(resp.data) ? resp.data : [];

                    // find the latest attempt for this student by studentEmail
                    const matches = attempts.filter(a => a.studentEmail === s.email || a.studentId === s.studentId || a.studentId === Number(s.studentId));
                    if (matches.length === 0) {
                      // no quiz attempt found for this student — try module submissions for uploaded files
                      console.log('No quiz attempt found for student, checking module submissions', s);
                      try {
                        const subResp = await api.get(`/quizzes/${id}/submissions`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
                        const subs = Array.isArray(subResp.data) ? subResp.data : [];
                        const found = Array.isArray(subs) ? subs.find(x => x.studentEmail === s.email) : null;
                        if (found) {
                          // open modal and include submitted file path(s)
                          setSelectedAttempt({
                            name: s.name || s.email || 'Student',
                            email: s.email,
                            noAttempt: true,
                            createdAt: found.createdAt,
                            answers: [],
                            submittedFiles: found.filePath ? [found.filePath] : []
                          });
                          return;
                        }
                      } catch (e) {
                        console.error('Error loading submissions', e);
                      }

                      // fallback: open questions-only modal
                      setSelectedAttempt({
                        name: s.name || s.email || 'Student',
                        email: s.email,
                        noAttempt: true,
                        createdAt: null,
                        answers: []
                      });
                      return;
                    }
                    matches.sort((a, b) => {
                      const ta = a.createdAt ? new Date(a.createdAt).getTime() : a.id || 0;
                      const tb = b.createdAt ? new Date(b.createdAt).getTime() : b.id || 0;
                      return tb - ta;
                    });

                    // log the attempt object so we can inspect where student files are stored
                    console.log('Selected attempt for student', s, matches[0]);
                    setSelectedAttempt(matches[0]);

                    // also check module submissions (students might have uploaded via module submissions)
                    try {
                      const subResp = await api.get(`/quizzes/${id}/submissions`);
                      const subs = subResp.data;
                      const found = Array.isArray(subs) ? subs.find(x => x.studentEmail === matches[0].studentEmail || x.studentEmail === s.email) : null;
                      if (found && found.filePath) {
                        setSelectedAttempt(prev => ({
                          ...(prev || {}),
                          submittedFiles: [found.filePath]
                        }));
                      }
                    } catch (e) {
                      console.error('Error loading submissions after selecting attempt', e);
                    }
                  } catch (err) {
                    console.error(err);
                    alert("Error loading attempt");
                  } finally {
                    setAttemptLoading(false);
                  }
                },
                children: "View"
              })]
            })]
          }, s.studentId))
        });
      })(), selectedAttempt && /*#__PURE__*/_jsx("div", {
        className: "modal-overlay",
        onClick: () => setSelectedAttempt(null),
        children: /*#__PURE__*/_jsxs("div", {
          className: "modal-content",
          role: "dialog",
          "aria-modal": "true",
          onClick: e => e.stopPropagation(),
          children: [/*#__PURE__*/_jsxs("div", {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            },
            children: [/*#__PURE__*/_jsxs("div", {
              children: [/*#__PURE__*/_jsx("strong", {
                children: selectedAttempt.name || selectedAttempt.email || 'Student Attempt'
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 12,
                  color: '#666'
                },
                children: selectedAttempt.createdAt ? new Date(selectedAttempt.createdAt).toLocaleString() : ''
              })]
            }), /*#__PURE__*/_jsx("div", {
              children: /*#__PURE__*/_jsx("button", {
                className: "tqv-close-btn",
                onClick: () => setSelectedAttempt(null),
                children: "Close"
              })
            })]
          }), attemptLoading ? /*#__PURE__*/_jsx("p", {
            children: "Loading attempt..."
          }) : /*#__PURE__*/_jsxs("div", {
            children: [selectedAttempt.noAttempt && /*#__PURE__*/_jsxs("div", {
              style: {
                padding: 10,
                background: '#fff7e6',
                border: '1px solid #ffe5b4',
                borderRadius: 6,
                marginBottom: 12
              },
              children: [/*#__PURE__*/_jsx("strong", {
                children: "No attempt found."
              }), " Showing the quiz questions and correct answers only."]
            }), selectedAttempt.submittedFiles && selectedAttempt.submittedFiles.length > 0 && /*#__PURE__*/_jsxs("div", {
              style: {
                padding: 10,
                background: '#f7f9ff',
                border: '1px solid #e1e9ff',
                borderRadius: 6,
                marginBottom: 12
              },
              children: [/*#__PURE__*/_jsx("strong", {
                children: "Submitted files (module):"
              }), /*#__PURE__*/_jsx("ul", {
                style: {
                  marginTop: 6,
                  listStyle: 'none',
                  paddingLeft: 0
                },
                children: selectedAttempt.submittedFiles.map((f, i) => /*#__PURE__*/_jsxs("li", {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '6px 0'
                  },
                  children: [/*#__PURE__*/_jsx("a", {
                    style: {
                      color: '#0b5fff',
                      textDecoration: 'underline'
                    },
                    href: f.startsWith('http') ? f : apiUrl(f),
                    target: "_blank",
                    rel: "noreferrer",
                    children: f.split('/').pop()
                  }), /*#__PURE__*/_jsxs("div", {
                    style: {
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center'
                    },
                    children: [/*#__PURE__*/_jsx("button", {
                      onClick: () => {
                        const url = f.startsWith('http') ? f : apiUrl(f);
                        window.open(url, '_blank');
                      },
                      style: {
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #dfe8ff',
                        background: '#fff',
                        cursor: 'pointer'
                      },
                      children: "View"
                    }), /*#__PURE__*/_jsx("button", {
                      onClick: () => downloadFile(f),
                      title: "Download",
                      style: {
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        background: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      },
                      children: "\u21E9"
                    })]
                  })]
                }, i))
              })]
            }), /*#__PURE__*/_jsx("h3", {
              style: {
                marginTop: 0
              },
              children: "Answers"
            }), /*#__PURE__*/_jsx("div", {
              className: "student-modal-divider"
            }), quiz.questions.map((q, idx) => {
              // parse attempt answers (support multiple shapes)
              let answers = [];
              try {
                if (selectedAttempt.answers) {
                  // if already an array, use directly
                  if (Array.isArray(selectedAttempt.answers)) {
                    answers = selectedAttempt.answers;
                  } else {
                    // could be a JSON string or an object mapping questionId -> value
                    const parsed = typeof selectedAttempt.answers === 'string' ? JSON.parse(selectedAttempt.answers) : selectedAttempt.answers;
                    if (Array.isArray(parsed)) {
                      answers = parsed;
                    } else if (parsed && typeof parsed === 'object') {
                      // convert { "36": "wow", ... } into [{ questionId: 36, answer: 'wow' }, ...]
                      answers = Object.entries(parsed).map(([k, v]) => ({
                        questionId: Number(k),
                        answer: v
                      }));
                    }
                  }
                }
              } catch (e) {
                // keep answers as empty array on parse error
                answers = [];
              }
              const a = answers.find(ax => ax.questionId === q.id || ax.qid === q.id || ax.questionId === Number(q.id));

              // parse options for multiple choice
              let options = [];
              try {
                options = q.options ? JSON.parse(q.options) : [];
              } catch {}
              const studentAns = a ? a.answer ?? a.selected ?? a.value ?? null : null;

              // collect any student-submitted files for this answer (different backends store differently)
              let studentFiles = [];
              try {
                if (a) {
                  if (Array.isArray(a.files) && a.files.length > 0) {
                    studentFiles = a.files;
                  } else if (Array.isArray(a.uploads) && a.uploads.length > 0) {
                    studentFiles = a.uploads;
                  } else if (typeof a.answer === 'string') {
                    // maybe JSON array encoded in answer
                    try {
                      const parsed = JSON.parse(a.answer);
                      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(x => typeof x === 'string')) {
                        studentFiles = parsed;
                      }
                    } catch (e) {
                      // not JSON - maybe a path string or a placeholder like __FILE__:<qid>:<filename>
                      if (a.answer && (a.answer.includes('/uploads') || a.answer.startsWith('/'))) {
                        studentFiles = [a.answer];
                      } else if (a.answer && a.answer.startsWith('__FILE__:')) {
                        try {
                          const parts = a.answer.split(':');
                          const fname = parts.slice(2).join(':');
                          if (fname && selectedQuizAttempt && Array.isArray(selectedQuizAttempt.submittedFiles)) {
                            const found = selectedQuizAttempt.submittedFiles.filter(sf => String(sf).endsWith(fname) || String(sf).includes(fname));
                            if (found.length) studentFiles = found;
                          }
                        } catch (ee) {}
                      }
                    }
                  }
                }
              } catch (e) {
                studentFiles = [];
              }
              return /*#__PURE__*/_jsxs("div", {
                style: {
                  padding: '10px 8px',
                  borderBottom: '1px solid #f1f1f1'
                },
                children: [/*#__PURE__*/_jsxs("div", {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  },
                  children: [/*#__PURE__*/_jsxs("div", {
                    style: {
                      fontWeight: 600
                    },
                    children: ["Question ", idx + 1]
                  }), /*#__PURE__*/_jsx("span", {
                    style: {
                      fontSize: 12,
                      color: '#666'
                    },
                    children: q.type === 'Activity' ? (studentFiles && studentFiles.length > 0 || (studentAns !== null && String(studentAns).trim() !== '') ? 'Submitted' : 'Not submitted') : `${Number(q.points) || 1} pts`
                  })]
                }), /*#__PURE__*/_jsx("div", {
                  style: {
                    marginTop: 6
                  },
                  children: q.question
                }), options.length > 0 ? /*#__PURE__*/_jsxs("div", {
                  style: {
                    marginTop: 8
                  },
                  children: [/*#__PURE__*/_jsx("strong", {
                    children: "Options:"
                  }), /*#__PURE__*/_jsx("div", {
                    style: {
                      marginTop: 8
                    },
                    children: options.map((opt, i) => {
                      const isCorrect = q.answer !== undefined && q.answer !== null && String(opt) === String(q.answer);
                      const isSelected = studentAns !== null && String(opt) === String(studentAns);
                      const baseStyle = {
                        padding: '8px 10px',
                        borderRadius: 6,
                        marginBottom: 6,
                        border: '1px solid #eef0f3',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      };
                      if (isSelected) {
                        if (isCorrect) {
                          baseStyle.background = '#e6ffed';
                          baseStyle.border = '1px solid #7be29a';
                        } else {
                          baseStyle.background = '#ffecec';
                          baseStyle.border = '1px solid #ff9b9b';
                        }
                      } else if (isCorrect) {
                        baseStyle.background = '#f3fff6';
                        baseStyle.border = '1px solid #9ee3b5';
                      }
                      return /*#__PURE__*/_jsx("div", {
                        style: baseStyle,
                        children: /*#__PURE__*/_jsxs("div", {
                          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                          children: [/*#__PURE__*/_jsx("div", { style: { flex: 1 }, children: opt }), /*#__PURE__*/_jsx("div", { style: { minWidth: 80, textAlign: 'right', marginLeft: 12 }, children: isSelected ? /*#__PURE__*/_jsx("span", { style: { padding: '4px 8px', borderRadius: 999, background: isCorrect ? '#9ee3b5' : '#ff9b9b', color: '#fff', fontSize: 12 }, children: isCorrect ? '  ' : '   ' }) : null })]
                        })
                      }, i);
                    })
                  })]
                }) :
                /*#__PURE__*/
                // Identification / open answer
                _jsxs("div", {
                  style: {
                    marginTop: 8
                  },
                  children: [/*#__PURE__*/_jsx("strong", {
                    children: "Student answer:"
                  }), /*#__PURE__*/_jsx("div", {
                    style: {
                      marginTop: 6,
                      color: studentAns ? '#111' : '#666'
                    },
                    children: studentAns ?
                    (() => {
                      // For identification questions, show the student's answer in a colored box with Selected badge
                      if (q.type === 'Identification') {
                        const isCorrect = (q.answer || '').toString().trim().toLowerCase() === String(studentAns).toString().trim().toLowerCase();
                        const display = typeof studentAns === 'string' ? studentAns : JSON.stringify(studentAns);
                        return /*#__PURE__*/_jsxs("div", { style: { marginTop: 8 }, children: [/*#__PURE__*/_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: isCorrect ? '#e6ffed' : '#ffecec', border: isCorrect ? '1px solid #7be29a' : '1px solid #ff9b9b' }, children: [/*#__PURE__*/_jsx("div", { style: { flex: 1 }, children: display }), /*#__PURE__*/_jsx("div", { style: { marginLeft: 12 }, children: !isCorrect ? /*#__PURE__*/_jsx("span", { style: { padding: '4px 8px', borderRadius: 999, background: '#e55a4e', color: '#fff', fontSize: 12 }, children: "wrong" }) : null })] })] });
                      }
                      // If answer is a __FILE__ placeholder, try to match with submittedFiles by filename or by server path
                      if (typeof studentAns === 'string' && studentAns.startsWith('__FILE__:')) {
                        const orig = studentAns.replace('__FILE__:', '');
                        // try to find matching submitted file(s)
                        const submitted = (selectedAttempt && Array.isArray(selectedAttempt.submittedFiles)) ? selectedAttempt.submittedFiles : [];
                        const matches = submitted.filter(p => String(p).endsWith(orig) || String(p).includes(orig));
                        const candidate = matches.length ? matches[0] : (submitted.length ? submitted[0] : null);
                        if (candidate) {
                          const url = candidate.startsWith('http') ? candidate : apiUrl(candidate);
                          const fileName = String(candidate).split('/').pop();
                          const ext = (fileName || '').split('.').pop()?.toLowerCase();
                          if (ext === 'pdf') {
                            return /*#__PURE__*/_jsxs("div", { className: "gc-pdf-card", children: [/*#__PURE__*/_jsx("iframe", { src: url, className: "gc-pdf-preview", title: fileName }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadFile(candidate), children: "Download" })] })] })] });
                          }
                          if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
                            return /*#__PURE__*/_jsxs("div", { className: "gc-pdf-card", children: [/*#__PURE__*/_jsxs("div", { className: "gc-pdf-preview", children: [/*#__PURE__*/_jsx("img", { src: url, alt: fileName, style: { maxWidth: '100%', maxHeight: 160, objectFit: 'contain' } })] }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadFile(candidate), children: "Download" })] })] })] });
                          }
                          // fallback for other file types
                          return /*#__PURE__*/_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", style: { color: '#0b5fff', textDecoration: 'underline' }, children: String(fileName) }), /*#__PURE__*/_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [/*#__PURE__*/_jsx("button", { onClick: () => window.open(url, '_blank'), style: { padding: '6px 10px', borderRadius: 6, border: '1px solid #eef0f3', background: '#fff', cursor: 'pointer' }, children: "View" }), /*#__PURE__*/_jsx("button", { onClick: () => downloadFile(candidate), title: "Download", style: { width: 34, height: 34, borderRadius: 999, background: '#e74c3c', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: "\u21E9" })] })] });
                        }
                        // no submitted match — show fallback text link to first submitted file if available
                        const fallback = (selectedAttempt && selectedAttempt.submittedFiles && selectedAttempt.submittedFiles[0]) ? selectedAttempt.submittedFiles[0] : null;
                        if (fallback) {
                          const url = fallback.startsWith('http') ? fallback : apiUrl(fallback);
                          const fileName = String(fallback).split('/').pop();
                          return /*#__PURE__*/_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", style: { color: '#0b5fff', textDecoration: 'underline' }, children: fileName }), /*#__PURE__*/_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [/*#__PURE__*/_jsx("button", { onClick: () => window.open(url, '_blank'), style: { padding: '6px 10px', borderRadius: 6, border: '1px solid #eef0f3', background: '#fff', cursor: 'pointer' }, children: "View" }), /*#__PURE__*/_jsx("button", { onClick: () => downloadFile(fallback), title: "Download", style: { width: 34, height: 34, borderRadius: 999, background: '#e74c3c', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: "\u21E9" })] })] });
                        }
                        // nothing to show
                        return /*#__PURE__*/_jsx("em", { children: "File submitted (not previewable)" });
                      }

                      // Try extracting any paths/URLs from the answer string first
                      if (typeof studentAns === 'string') {
                        const extracted = extractPathsFromString(studentAns);
                        if (extracted && extracted.length > 0) {
                          return /*#__PURE__*/_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [extracted.map((p, i) => renderFileCardSimple(p, i))] });
                        }
                      }

                      // If answer is already a server path or URL, render preview like other file lists
                      if (typeof studentAns === 'string' && (studentAns.startsWith('/') || studentAns.startsWith('http') || /\.(pdf|png|jpg|jpeg|gif|webp)$/i.test(String(studentAns)))) {
                        const url = studentAns.startsWith('http') ? studentAns : apiUrl(studentAns);
                        const fileName = String(studentAns).split('/').pop();
                        const ext = (fileName || '').split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') {
                          return /*#__PURE__*/_jsxs("div", { className: "gc-pdf-card", children: [/*#__PURE__*/_jsx("iframe", { src: url, className: "gc-pdf-preview", title: fileName }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadFile(studentAns), children: "Download" })] })] })] });
                        }
                        if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
                          return /*#__PURE__*/_jsxs("div", { className: "gc-pdf-card", children: [/*#__PURE__*/_jsxs("div", { className: "gc-pdf-preview", children: [/*#__PURE__*/_jsx("img", { src: url, alt: fileName, style: { maxWidth: '100%', maxHeight: 160, objectFit: 'contain' } })] }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadFile(studentAns), children: "Download" })] })] })] });
                        }
                        return String(studentAns);
                      }

                      return String(studentAns);
                    })() : /*#__PURE__*/_jsx("em", {
                      children: "No answer"
                    })
                  }), q.answer && /*#__PURE__*/_jsxs("div", {
                    style: {
                      marginTop: 8
                    },
                    children: [/*#__PURE__*/_jsx("strong", {
                      children: "Correct answer:"
                    }), /*#__PURE__*/_jsx("div", {
                      style: {
                        marginTop: 6,
                        color: '#666'
                      },
                      children: q.answer
                    })]
                  })]
                }), /*#__PURE__*/_jsx("hr", {
                  style: {
                    marginTop: 8,
                    border: 'none',
                    borderTop: '1px solid #eee'
                  }
                }), q.files && (() => {
                  let files = [];
                  try {
                    files = Array.isArray(q.files) ? q.files : JSON.parse(q.files);
                  } catch {
                    files = [];
                  }
                  if (files.length === 0) return null;
                  return /*#__PURE__*/_jsxs("div", {
                    style: {
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    },
                    children: [/*#__PURE__*/_jsx("strong", {
                      children: "Files (question):"
                    }), files.map((f, i) => {
                      const url = f.startsWith('http') ? f : apiUrl(f);
                      const fileName = String(f).split('/').pop();
                      const ext = (fileName || '').split('.').pop()?.toLowerCase();
                      if (ext === 'pdf') {
                        return /*#__PURE__*/_jsxs("div", {
                          className: "gc-pdf-card",
                          children: [/*#__PURE__*/_jsx("iframe", {
                            src: url,
                            className: "gc-pdf-preview",
                            title: fileName
                          }), /*#__PURE__*/_jsxs("div", {
                            className: "gc-pdf-info",
                            children: [/*#__PURE__*/_jsx("p", {
                              className: "gc-pdf-name",
                              children: fileName
                            }), /*#__PURE__*/_jsx("a", {
                              href: url,
                              target: "_blank",
                              rel: "noreferrer",
                              className: "gc-open-btn",
                              children: "Open"
                            })]
                          })]
                        }, i);
                      }
                      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                        return /*#__PURE__*/_jsxs("div", {
                          className: "gc-pdf-card",
                          children: [/*#__PURE__*/_jsx("div", {
                            className: "gc-pdf-preview",
                            children: /*#__PURE__*/_jsx("img", {
                              src: url,
                              alt: fileName,
                              style: {
                                maxWidth: '100%',
                                maxHeight: 160,
                                objectFit: 'contain'
                              }
                            })
                          }), /*#__PURE__*/_jsxs("div", {
                            className: "gc-pdf-info",
                            children: [/*#__PURE__*/_jsx("p", {
                              className: "gc-pdf-name",
                              children: fileName
                            }), /*#__PURE__*/_jsx("a", {
                              href: url,
                              target: "_blank",
                              rel: "noreferrer",
                              className: "gc-open-btn",
                              children: "Open"
                            })]
                          })]
                        }, i);
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
                            children: '📄'
                          })
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "gc-pdf-info",
                          children: [/*#__PURE__*/_jsx("p", {
                            className: "gc-pdf-name",
                            children: fileName
                          }), /*#__PURE__*/_jsx("a", {
                            href: url,
                            target: "_blank",
                            rel: "noreferrer",
                            className: "gc-open-btn",
                            children: "Open"
                          })]
                        })]
                      }, i);
                    })]
                  });
                })(), studentFiles && studentFiles.length > 0 && /*#__PURE__*/_jsxs("div", {
                  style: {
                    marginTop: 8,
                    display: 'none',
                    flexDirection: 'column',
                    gap: 8
                  },
                  children: [/*#__PURE__*/_jsx("strong", {
                    children: "Files (submitted):"
                  }), studentFiles.map((f, i) => {
                    const url = f.startsWith('http') ? f : apiUrl(f);
                    const fileName = String(f).split('/').pop();
                    const ext = (fileName || '').split('.').pop()?.toLowerCase();
                    if (ext === 'pdf') {
                      return /*#__PURE__*/_jsxs("div", {
                        className: "gc-pdf-card",
                        children: [/*#__PURE__*/_jsx("iframe", {
                          src: url,
                          className: "gc-pdf-preview",
                          title: fileName
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "gc-pdf-info",
                          children: [/*#__PURE__*/_jsx("p", {
                            className: "gc-pdf-name",
                            children: fileName
                          }), /*#__PURE__*/_jsxs("div", {
                            children: [/*#__PURE__*/_jsx("a", {
                              href: url,
                              target: "_blank",
                              rel: "noreferrer",
                              className: "gc-open-btn",
                              children: "Open"
                            }), /*#__PURE__*/_jsx("button", {
                              onClick: () => downloadFile(f),
                              style: { marginLeft: 8 },
                              children: "Download"
                            })]
                          })]
                        })]
                      }, i);
                    }
                    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                      return /*#__PURE__*/_jsxs("div", {
                        className: "gc-pdf-card",
                        children: [/*#__PURE__*/_jsx("div", {
                          className: "gc-pdf-preview",
                          children: /*#__PURE__*/_jsx("img", {
                            src: url,
                            alt: fileName,
                            style: { maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }
                          })
                        }), /*#__PURE__*/_jsxs("div", {
                          className: "gc-pdf-info",
                          children: [/*#__PURE__*/_jsx("p", {
                            className: "gc-pdf-name",
                            children: fileName
                          }), /*#__PURE__*/_jsxs("div", {
                            children: [/*#__PURE__*/_jsx("a", {
                              href: url,
                              target: "_blank",
                              rel: "noreferrer",
                              className: "gc-open-btn",
                              children: "Open"
                            }), /*#__PURE__*/_jsx("button", {
                              onClick: () => downloadFile(f),
                              style: { marginLeft: 8 },
                              children: "Download"
                            })]
                          })]
                        })]
                      }, i);
                    }
                    return /*#__PURE__*/_jsxs("div", {
                      className: "gc-pdf-card",
                      children: [/*#__PURE__*/_jsx("div", {
                        className: "gc-pdf-preview",
                        children: /*#__PURE__*/_jsx("div", {
                          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 },
                          children: '📄'
                        })
                      }), /*#__PURE__*/_jsxs("div", {
                        className: "gc-pdf-info",
                        children: [/*#__PURE__*/_jsx("p", {
                          className: "gc-pdf-name",
                          children: fileName
                        }), /*#__PURE__*/_jsxs("div", {
                          children: [/*#__PURE__*/_jsx("a", {
                            href: url,
                            target: "_blank",
                            rel: "noreferrer",
                            className: "gc-open-btn",
                            children: "Open"
                          }), /*#__PURE__*/_jsx("button", {
                            onClick: () => downloadFile(f),
                            style: { marginLeft: 8 },
                            children: "Download"
                          })]
                        })]
                      })]
                    }, i);
                  })]
                })]
              }, q.id);
            })]
          })]
        })
      })]
    })]
  });
}