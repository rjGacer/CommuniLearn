import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RightSidebar from "../components/RightSidebar";
import { apiUrl, API_BASE_URL } from "../config";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function StudentQuizzes() {
  // API base (from VITE_API_URL) — falls back to same-origin when empty
  const API_BASE = API_BASE_URL || '';
  const [modules, setModules] = useState([]);
  const [status, setStatus] = useState({});
  const [openModule, setOpenModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScore, setSelectedScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    loadData();
  }, []);

  // Load modules with quizzes grouped by module
  const loadData = async () => {
    setLoading(true);
    try {
      const modulesResp = await fetch(`${API_BASE}/modules/student`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!modulesResp.ok) {
        console.error("Failed to load modules");
        setLoading(false);
        return;
      }
      const modulesData = await modulesResp.json();

      // modulesResp already includes quizzes for each module (server returns module include: { quizzes: true })
      const mods = Array.isArray(modulesData) ? modulesData : [];

      // ensure quizzes array exists and collect quiz ids to load attempt status
      const mergedModules = mods.map(mod => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        document: mod.document,
        quizzes: Array.isArray(mod.quizzes) ? mod.quizzes : []
      }));

      // kick off attempt status loads for all quizzes across modules
      mergedModules.forEach(m => {
        (m.quizzes || []).forEach(q => loadAttemptStatus(q.id));
      });
      setModules(mergedModules);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load attempt status per quiz
  const loadAttemptStatus = async quizId => {
    try {
      const resp = await fetch(`${API_BASE}/quizzes/${quizId}/attempts`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setStatus(prev => ({
        ...prev,
        [quizId]: {
          usedAttempts: data.used ?? 0,
          remainingAttempts: data.remaining ?? 0
        }
      }));
    } catch (err) {
      console.error("Error loading attempt status:", err);
    }
  };
  const toggleModule = id => {
    setOpenModule(prev => prev === id ? null : id);
  };

  // Determine if a quiz dueDate/time has already passed.
  // Supports the same sentinel pattern as Attendance: `1970-01-01THH:MM` means time-only.
  const isDuePassed = dueDateStr => {
    if (!dueDateStr) return false;
    const parts = String(dueDateStr).split("T");
    const datePart = parts[0] || "";
    const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
    const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
    const now = Date.now();
    if (datePart === "1970-01-01") {
      // time-only: compare today's date with the provided time
      if (!timePart) return false;
      const [hh, mm] = timePart.split(":");
      const cmp = new Date();
      cmp.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
      return cmp.getTime() <= now;
    }
    // date-only or date+time: if time is missing treat as end-of-day (23:59)
    if (!timePart) {
      // treat as yyyy-mm-dd 23:59:59 local time
      const [y, m, d] = datePart.split("-").map(s => Number(s));
      if (!y || !m || !d) return false;
      const cmp = new Date(y, m - 1, d, 23, 59, 59, 0);
      return cmp.getTime() <= now;
    }
    const parsed = new Date(dueDateStr);
    if (isNaN(parsed.getTime())) return false;
    return parsed.getTime() <= now;
  };

  // Format due date/time for display. For date-only values, show time as 11:59 PM.
  const formatDueString = dueDateStr => {
    if (!dueDateStr) return "No Due Date";
    const parts = String(dueDateStr).split("T");
    const datePart = parts[0] || "";
    const timePartRaw = parts[1] ? parts[1].split("Z")[0].split("+")[0] : "";
    const timePart = timePartRaw ? timePartRaw.slice(0, 5) : "";
    if (datePart === "1970-01-01") {
      // time-only — show the time only
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

  // Render activity preview card (PDF/image/other) matching Module/Teacher view
  const renderActivityPreview = (quiz) => {
    const file = (quiz.files && quiz.files[0]) || quiz.document || quiz.file || null;
    if (!file) {
      return (
        <div className="gc-pdf-card">
          <div className="gc-pdf-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 36 }}>📄</div>
          </div>
          <div className="gc-pdf-info">
            <p className="gc-pdf-name">No attachment</p>
          </div>
        </div>
      );
    }
    const f = String(file);
    const url = f.startsWith('http') ? f : apiUrl(f);
    const fileName = f.split('/').pop();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <div className="gc-pdf-card">
          <iframe src={url} className="gc-pdf-preview" title={fileName} />
          <div className="gc-pdf-info">
            <p className="gc-pdf-name">{fileName}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button type="button" className="quiz-view-btn" onClick={() => { if (window.confirm('Do you want to start the Quiz?')) navigate(`/student/quiz/${quiz.id}?start=1`); }}>Take Quiz</button>
            </div>
          </div>
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return (
        <div className="gc-pdf-card">
          <div className="gc-pdf-preview">
            <img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain' }} />
          </div>
          <div className="gc-pdf-info">
            <p className="gc-pdf-name">{fileName}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button type="button" className="quiz-view-btn" onClick={() => { if (window.confirm('Do you want to start the Quiz?')) navigate(`/student/quiz/${quiz.id}?start=1`); }}>Take Quiz</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="gc-pdf-card">
        <div className="gc-pdf-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 36 }}>📄</div>
        </div>
        <div className="gc-pdf-info">
          <p className="gc-pdf-name">{fileName}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
            <button type="button" className="quiz-view-btn" onClick={() => { if (window.confirm('Do you want to start the Quiz?')) navigate(`/student/quiz/${quiz.id}?start=1`); }}>Take Quiz</button>
          </div>
        </div>
      </div>
    );
  };

  // Render a submitted file card (used in student View Score for activity questions)
  const renderSubmittedFileCard = (file, idx) => {
    if (!file) return null;
    const f = String(file);
    const url = f.startsWith('http') ? f : apiUrl(f);
    const fileName = f.split('/').pop();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    const cardStyle = { width: 260, borderRadius: 8, border: '1px solid #eef0f3', background: '#fff', overflow: 'hidden' };

    const downloadFile = (origName) => {
      const full = url;
      fetch(full, { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }).then(r => r.blob()).then(blob => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = origName || fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }).catch(() => alert('Download failed'));
    };

    // Horizontal card like Module view: thumbnail at left, info + Open button on right
    const horizontalCardStyle = Object.assign({}, cardStyle, { display: 'flex', alignItems: 'center', gap: 12, padding: 10 });
    const thumbStyle = { width: 120, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 4, background: '#f7fafc' };
    if (ext === 'pdf') {
      return (
        <div key={idx} className="gc-pdf-card" style={horizontalCardStyle}>
          <div className="gc-pdf-preview" style={thumbStyle}>
            <iframe src={url} title={fileName} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
          <div className="gc-pdf-info" style={{ flex: 1 }}>
            <p className="gc-pdf-name" style={{ margin: 0 }}>{fileName}</p>
            <div style={{ marginTop: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
            </div>
          </div>
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return (
        <div key={idx} className="gc-pdf-card" style={horizontalCardStyle}>
          <div className="gc-pdf-preview" style={thumbStyle}>
            <img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
          </div>
          <div className="gc-pdf-info" style={{ flex: 1 }}>
            <p className="gc-pdf-name" style={{ margin: 0 }}>{fileName}</p>
            <div style={{ marginTop: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
            </div>
          </div>
        </div>
      );
    }
    // default horizontal file card
    return (
      <div key={idx} className="gc-pdf-card" style={horizontalCardStyle}>
        <div className="gc-pdf-preview" style={thumbStyle}>
          <div style={{ fontSize: 28 }}>📄</div>
        </div>
        <div className="gc-pdf-info" style={{ flex: 1 }}>
          <p className="gc-pdf-name" style={{ margin: 0 }}>{fileName}</p>
          <div style={{ marginTop: 8 }}>
            <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <main style={{ flex: 1 }}>
        <div className="page-wrap">
          <div className="page-header-box">
            <h1 className="page-title">Quizzes</h1>
            <p className="page-subtitle">All available quizzes, grouped by module.</p>
          </div>
          {loading && <p className="empty-text">Loading modules and quizzes...</p>}
          {!loading && modules.length === 0 && <p className="empty-text">No modules available.</p>}
          {!loading && modules.length > 0 && (
            <div className="quiz-module-list">
              {modules.map(module => {
        const isOpen = openModule === module.id;
        const moduleQuizzes = module.quizzes ?? [];
        return /*#__PURE__*/_jsxs("div", {
          className: "module-block",
          children: [/*#__PURE__*/_jsxs("div", {
            className: "module-block-header",
            onClick: () => toggleModule(module.id),
            children: [/*#__PURE__*/_jsx("h2", {
              className: "module-title",
              children: module.title
            }), isOpen ? /*#__PURE__*/_jsx(ChevronUp, {
              size: 20
            }) : /*#__PURE__*/_jsx(ChevronDown, {
              size: 20
            })]
          }), isOpen && /*#__PURE__*/_jsxs("div", {
            className: "module-block-content",
            children: [module.description && /*#__PURE__*/_jsx("p", {
              className: "module-desc",
              children: module.description
            }), module.document && /*#__PURE__*/_jsx("a", {
              href: `http://localhost:5000/${module.document}`,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "module-doc-link",
              children: "\uD83D\uDCC4 View Attached Document"
            }), /*#__PURE__*/_jsx("h3", {
              className: "module-subtitle",
              children: "Quizzes"
            }), moduleQuizzes.length === 0 && /*#__PURE__*/_jsx("p", {
              className: "no-quizzes-text",
              children: "No quizzes in this module"
            }), moduleQuizzes.map(quiz => {
              const st = status[quiz.id];
              return /*#__PURE__*/_jsxs("div", {
                className: "quiz-item",
                children: [/*#__PURE__*/_jsxs("div", {
                  style: {
                    flex: 1
                  },
                  children: [/*#__PURE__*/_jsx("h4", {
                    className: "quiz-title",
                    children: quiz.title
                  }), /*#__PURE__*/_jsxs("p", {
                    className: "quiz-meta",
                    children: [quiz.totalPoints || 0, " pts \u2022", " ", formatDueString(quiz.dueDate)]
                  }), quiz.description && /*#__PURE__*/_jsx("p", {
                    className: "quiz-desc",
                    children: quiz.description
                  }), st && /*#__PURE__*/_jsxs("p", {
                    className: "quiz-status",
                    children: [(st.remainingAttempts ?? 0) > 0 ? /*#__PURE__*/_jsx(_Fragment, {
                      children: /*#__PURE__*/_jsxs("span", {
                        style: {
                          color: "#16a34a"
                        },
                        children: ["\u2713 ", st.remainingAttempts, " attempts remaining"]
                      })
                    }) : /*#__PURE__*/_jsx("span", {
                      style: {
                        color: "#dc2626"
                      },
                      children: "No attempts remaining"
                    }), (st.usedAttempts ?? 0) > 0 && /*#__PURE__*/_jsxs("span", {
                      style: {
                        marginLeft: "12px",
                        color: "#666"
                      },
                      children: ["(", st.usedAttempts, " completed)"]
                    })]
                  })]
                }), /*#__PURE__*/_jsxs("div", {
                  style: {
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap"
                  },
                  children: [(quiz.type === 'activity' || quiz.activityType === 'activity') ? /*#__PURE__*/_jsx("div", {
                    children: renderActivityPreview(quiz)
                  }) : (isDuePassed(quiz.dueDate) ? /*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: "0.95rem",
                        color: "#c43030ff",
                        fontWeight: 700
                      },
                      children: "Time's up"
                    }) : (!st || (st.usedAttempts ?? 0) === 0) && /*#__PURE__*/_jsx("button", {
                      type: "button",
                      className: "quiz-view-btn",
                      onClick: () => { if (window.confirm('Do you want to start the Quiz?')) navigate(`/student/quiz/${quiz.id}?start=1`); },
                      children: "Take Quiz"
                    })), !isDuePassed(quiz.dueDate) && st && (st.usedAttempts ?? 0) > 0 && /*#__PURE__*/_jsx("button", {
                      type: "button",
                      className: "quiz-view-btn",
                      onClick: async () => {
                        try {
                          setScoreLoading(true);
                          const [quizResp, scoreResp] = await Promise.all([
                            fetch(`${API_BASE}/quizzes/${quiz.id}`, { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }),
                            fetch(`${API_BASE}/quizzes/${quiz.id}/score`, { headers: { Authorization: "Bearer " + localStorage.getItem("token") } })
                          ]);
                          if (!quizResp.ok || !scoreResp.ok) {
                            alert("Failed to load score or quiz details");
                            setScoreLoading(false);
                            return;
                          }
                          const quizData = await quizResp.json();
                          const scoreData = await scoreResp.json();
                          setSelectedScore({ quiz: quizData, quizTitle: scoreData.quizTitle, score: scoreData.score, total: scoreData.total, details: scoreData.details });
                        } catch (err) {
                          console.error(err);
                          alert("Error loading score");
                        } finally {
                          setScoreLoading(false);
                        }
                      },
                      style: {
                        background: "#7c3aed"
                      },
                      children: scoreLoading ? "Loading..." : "View Score"
                    }), !st && /*#__PURE__*/_jsx("span", {
                      style: {
                        fontSize: "0.85rem",
                        color: "#666"
                      },
                      children: "Loading..."
                    })]
                })]
              }, quiz.id);
            })]
          })]
        }, module.id);
              })}
            </div>
          )}
        </div>
      </main>
      {selectedScore && /*#__PURE__*/_jsx("div", {
        className: "modal-overlay",
        onClick: () => setSelectedScore(null),
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
                style: { fontSize: 16 },
                children: `Points ${selectedScore?.score ?? 0}/${selectedScore?.total ?? 0}`
              }), /*#__PURE__*/_jsx("div", {
                style: {
                  fontSize: 12,
                  color: '#666'
                },
                children: (() => {
                  // try to derive a timestamp from selectedScore if present
                  const ts = selectedScore && (selectedScore.createdAt || selectedScore.attemptedAt || selectedScore.submittedAt || selectedScore.timestamp);
                  if (ts) {
                    try {
                      const d = new Date(ts);
                      if (!isNaN(d.getTime())) return d.toLocaleString();
                    } catch (e) {}
                  }
                  return '';
                })()
              })]
            }), /*#__PURE__*/_jsx("div", {
              children: /*#__PURE__*/_jsx("button", {
                className: "tqv-close-btn",
                onClick: () => setSelectedScore(null),
                children: "Close"
              })
            })]
          }), scoreLoading ? /*#__PURE__*/_jsx("p", {
            children: "Loading score..."
          }) : /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("h3", {
              style: { marginTop: 0 },
              children: "Answers"
            }), /*#__PURE__*/_jsx("div", {
              className: "student-modal-divider"
            }), selectedScore.quiz && selectedScore.quiz.questions && selectedScore.quiz.questions.map((q, idx) => {
              // parse score details (use as answers array)
              let answers = [];
              try {
                answers = Array.isArray(selectedScore.details) ? selectedScore.details : (selectedScore.details ? JSON.parse(selectedScore.details) : []);
              } catch (e) {
                answers = [];
              }
              const a = answers.find(ax => ax.id === q.id || ax.questionId === q.id || ax.questionId === Number(q.id) || ax.qid === q.id || ax.questionId === Number(q.id));

              // parse options
              let options = [];
              try { options = q.options ? JSON.parse(q.options) : []; } catch (e) { options = []; }

              const studentAns = a ? a.userAnswer ?? a.answer ?? a.selected ?? a.value ?? null : null;

              // normalize helpers for reliable comparison (trim, lowercase)
              const normalize = s => {
                try {
                  if (s === null || s === undefined) return '';
                  return String(s).trim().toLowerCase();
                } catch (e) {
                  return '';
                }
              };
              const normStudent = normalize(studentAns);
              const normCorrectAns = normalize(q.answer);

              // collect student files
              let studentFiles = [];
              try {
                if (a) {
                  if (Array.isArray(a.files) && a.files.length > 0) studentFiles = a.files;
                  else if (Array.isArray(a.uploads) && a.uploads.length > 0) studentFiles = a.uploads;
                  else if (typeof a.answer === 'string') {
                    try {
                      const parsed = JSON.parse(a.answer);
                      if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) studentFiles = parsed;
                    } catch (e) {
                      if (a.answer && (a.answer.includes('/uploads') || a.answer.startsWith('/'))) studentFiles = [a.answer];
                    }
                  }
                }
              } catch (e) {
                studentFiles = [];
              }

              // compute earned points for this question
              const totalPts = Number(q.points) || 1;
              let earnedPts = 0;
              try {
                // prefer explicit points on the detail record if present
                if (a) {
                  if (a.points !== undefined) earnedPts = Number(a.points) || 0;
                  else if (a.score !== undefined) earnedPts = Number(a.score) || 0;
                  else if (a.pointsEarned !== undefined) earnedPts = Number(a.pointsEarned) || 0;
                }
                // fallback for multiple choice / identification exact-match
                if (!earnedPts) {
                  if (Array.isArray(options) && options.length > 0) {
                    if (normStudent !== '' && normCorrectAns !== '' && normStudent === normCorrectAns) earnedPts = totalPts;else earnedPts = earnedPts || 0;
                  } else {
                    // identification/open answer
                    if (normStudent !== '' && normCorrectAns !== '' && normStudent === normCorrectAns) earnedPts = totalPts;
                  }
                }
              } catch (e) {
                earnedPts = earnedPts || 0;
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
                    style: { fontWeight: 600 },
                    children: ["Question ", idx + 1]
                  }), /*#__PURE__*/_jsxs("span", {
                    style: { fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 },
                    children: [q.type === 'Activity' ? ((studentFiles && studentFiles.length > 0) || (studentAns !== null && String(studentAns).trim() !== '') ? /*#__PURE__*/_jsx("span", { children: 'Submitted' }) : /*#__PURE__*/_jsx("span", { children: 'Not submitted' })) : null, /*#__PURE__*/_jsx("span", { style: { background: '#e8f0ff', color: '#1e40af', padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 600 }, children: `${earnedPts}/${totalPts} pts` })]
                  })]
                }), /*#__PURE__*/_jsx("div", { style: { marginTop: 6 }, children: q.question }), options.length > 0 ? /*#__PURE__*/_jsxs("div", {
                  style: { marginTop: 8 },
                  children: [/*#__PURE__*/_jsx("strong", { children: "Options:" }), /*#__PURE__*/_jsx("div", {
                    style: { marginTop: 8 },
                    children: options.map((opt, i) => {
                      const isCorrect = normCorrectAns !== '' && normalize(opt) === normCorrectAns;
                      const isSelected = normStudent !== '' && normalize(opt) === normStudent;
                      const baseStyle = { padding: '8px 10px', borderRadius: 6, marginBottom: 6, border: '1px solid #eef0f3', background: '#fff' };
                      if (isCorrect && isSelected) {
                        baseStyle.background = '#e6ffed';
                        baseStyle.border = '1px solid #7be29a';
                      } else if (isCorrect) {
                        baseStyle.background = '#f3fff6';
                        baseStyle.border = '1px solid #9ee3b5';
                      } else if (isSelected) {
                        baseStyle.background = '#fff2f2';
                        baseStyle.border = '1px solid #ff9b9b';
                      }
                      return /*#__PURE__*/_jsx("div", {
                        style: baseStyle,
                        children: /*#__PURE__*/_jsxs("div", {
                          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                          children: [/*#__PURE__*/_jsx("div", { children: opt }), /*#__PURE__*/_jsxs("div", { style: { fontSize: 12, color: '#555' }, children: [isSelected ? /*#__PURE__*/_jsx("em", { children: "Selected" }) : null, isCorrect ? isSelected ? /*#__PURE__*/_jsx("span", { style: { marginLeft: 8, color: '#117a3a' }, children: "\u2713 correct" }) : /*#__PURE__*/_jsx("span", { style: { marginLeft: 8, color: '#117a3a' }, children: "\u2713" }) : null] })]
                        })
                      }, i);
                    })
                  })]
                }) : /*#__PURE__*/_jsxs("div", {
                  style: { marginTop: 8 },
                  children: [/*#__PURE__*/_jsx("strong", { children: "Student answer:" }), /*#__PURE__*/_jsx("div", {
                    style: { marginTop: 6, color: studentAns ? '#111' : '#666' },
                    children: studentAns ? (typeof studentAns === 'string' && studentAns.startsWith('__FILE__:') ? (() => {
                      const orig = studentAns.replace('__FILE__:', '');
                      const serverPath = (selectedScore.submittedFiles && selectedScore.submittedFiles.length > 0) ? selectedScore.submittedFiles[0] : (studentFiles.length > 0 ? studentFiles[0] : null);
                      return /*#__PURE__*/_jsxs("div", {
                        style: { display: 'flex', flexDirection: 'column', gap: 8 },
                        children: [/*#__PURE__*/_jsx("a", { style: { color: '#0b5fff', textDecoration: 'underline' }, href: serverPath ? serverPath.startsWith('http') ? serverPath : `http://localhost:5000${serverPath}` : '#', target: "_blank", rel: "noreferrer", onClick: e => { if (!serverPath) { e.preventDefault(); alert('File not found on server'); } }, children: orig }), /*#__PURE__*/_jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [studentFiles && studentFiles.length > 0 ? studentFiles.map((sf, i) => renderSubmittedFileCard(sf, i)) : null] })]
                      });
                    })() : String(studentAns)) : /*#__PURE__*/_jsx("em", { children: "No answer" })
                  }), q.answer && q.type !== 'Activity' && /*#__PURE__*/_jsxs("div", { style: Object.assign({ marginTop: 8 }, (normCorrectAns !== '' && normStudent === normCorrectAns) ? { background: '#e6ffed', border: '1px solid #9ee3b5', padding: 8, borderRadius: 6 } : {}), children: [/*#__PURE__*/_jsx("strong", { children: "Correct answer:" }), /*#__PURE__*/_jsxs("div", { style: { marginTop: 6, color: (normCorrectAns !== '' && normStudent === normCorrectAns) ? '#117a3a' : '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [/*#__PURE__*/_jsx("span", { children: q.answer }), (normCorrectAns !== '' && normStudent === normCorrectAns) ? /*#__PURE__*/_jsx("span", { style: { color: '#117a3a', marginLeft: 8 }, children: "\u2713 correct" }) : null] })] })]
                })
              ]
              }, q.id);
            })]
          })]
        })
      })}
      <RightSidebar />
    </div>
  );
}