import React, { useEffect, useState, useRef } from "react";
import { apiUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StudentQuizTake() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(1);
  const [answers, setAnswers] = useState({});
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Quiz timer state (declare hooks unconditionally)
  const [remainingMs, setRemainingMs] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const fileInputRef = useRef(null);
  const [sidebarFiles, setSidebarFiles] = useState([]);
  const [activitySubmitted, setActivitySubmitted] = useState(false);
  // Determine whether this quiz is an Activity-type. Check quiz-level flags and per-question types.
  const isActivity = Boolean(
    quiz && (
      quiz.activityType === 'activity' ||
      quiz.type === 'Activity' ||
      quiz.type === 'activity' ||
      (Array.isArray(quiz.questions) && quiz.questions.some(q => (q.type || '').toString().toLowerCase() === 'activity'))
    )
  );

  // Format milliseconds helper
  const formatMs = ms => {
    if (ms === null) return '';
    if (ms <= 0) return "Time's up";
    const total = Math.floor(ms / 1000);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  };
  const location = useLocation();
  const { user } = useAuth() || {};
 
  // Compute initial milliseconds for display when quiz not yet started
  const initialMs = quiz ? (quiz.timeLimit ? Number(quiz.timeLimit) * 60 * 1000 : (quiz.dueDate ? Math.max(0, new Date(quiz.dueDate).getTime() - Date.now()) : null)) : null;

  // Determine the text to show for the timer:
  // - If there is no timeLimit and no dueDate => "No Time limit"
  // - If remainingMs is null (quiz not started) but we have an initialMs, show the full initial time
  // - Otherwise show the live remainingMs
  const timeDisplay = (() => {
    if (!quiz) return '';
    if (!quiz.timeLimit && !quiz.dueDate) return 'No Time limit';
    const ms = remainingMs !== null ? remainingMs : initialMs;
    return formatMs(ms);
  })();

  const timerExpired = remainingMs !== null && remainingMs <= 0;
  // If the page was opened with ?start=1, auto-start the quiz (set endAt and show first question)
  useEffect(() => {
    if (!quiz) return;
    const params = new URLSearchParams(location.search);
    if (params.get('start')) {
      if (quiz.timeLimit) {
        const newEnd = Date.now() + Number(quiz.timeLimit) * 60 * 1000;
        setEndAt(newEnd);
        try { localStorage.setItem('active_quiz_endAt', String(newEnd)); localStorage.setItem('active_quiz_id', String(id)); } catch (e) {}
      } else if (quiz.dueDate) {
        const d = new Date(quiz.dueDate).getTime();
        if (!isNaN(d)) {
          setEndAt(d);
          try { localStorage.setItem('active_quiz_endAt', String(d)); localStorage.setItem('active_quiz_id', String(id)); } catch (e) {}
        }
      }
      setCurrent(1);
    }
  }, [quiz, location.search]);

  // On mount, restore any active quiz timer from localStorage (only if it matches this quiz id)
  useEffect(() => {
    try {
      const storedEnd = localStorage.getItem('active_quiz_endAt');
      const storedId = localStorage.getItem('active_quiz_id');
      if (storedEnd && storedId === String(id)) {
        const num = Number(storedEnd);
        if (!isNaN(num) && num > Date.now()) {
          setEndAt(num);
        }
      }
    } catch (e) {}
  }, [id]);

  // Timer effect: update remainingMs when endAt is set
  useEffect(() => {
    if (!endAt) return;
    // set initial value
    setRemainingMs(Math.max(0, endAt - Date.now()));
    const t = setInterval(() => {
      const diff = Math.max(0, endAt - Date.now());
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(t);
        try { localStorage.removeItem('active_quiz_endAt'); localStorage.removeItem('active_quiz_id'); } catch (e) {}
      }
    }, 1000);
    return () => clearInterval(t);
  }, [endAt]);
  useEffect(() => {
    loadQuiz();
    loadAttempts();
  }, [id]);
  const loadQuiz = async () => {
    const resp = await fetch(apiUrl(`/quizzes/${id}`), {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    if (!resp.ok) return;
    setQuiz(await resp.json());
  };
  const loadAttempts = async () => {
    const resp = await fetch(apiUrl(`/quizzes/${id}/attempts`), {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    if (!resp.ok) return;
    setAttemptInfo(await resp.json());
  };
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
  const updateAnswer = (qid, val) => {
    setAnswers(prev => ({
      ...prev,
      [qid]: val
    }));
  };
  const submitQuiz = async () => {
    // validate all questions answered
    if (!quiz) return;
    const unanswered = [];
    quiz.questions.forEach(qq => {
      const val = answers[qq.id];
      if (qq.type === "Multiple Choice") {
        if (val === undefined || val === null || val === "") unanswered.push(qq.id);
      } else if (qq.type === "Identification") {
        if (!val || typeof val === "string" && val.trim() === "") unanswered.push(qq.id);
      } else if (qq.type === "Activity") {
        if (!val) unanswered.push(qq.id);
      } else {
        if (val === undefined || val === null || val === "") unanswered.push(qq.id);
      }
    });
    if (unanswered.length > 0) {
      // Ask user to confirm submitting incomplete answers
      try {
        const confirmFn = window.customConfirm || (msg => Promise.resolve(window.confirm(msg)));
        const ok = await confirmFn('Some questions are unanswered. Submit anyway?');
        if (!ok) {
          // navigate user to first unanswered question
          setCurrent(prev => {
            const first = unanswered[0];
            const idx = quiz.questions.findIndex(q => q.id === first);
            return idx >= 0 ? idx + 1 : prev;
          });
          return;
        }
      } catch (e) {
        // fallback: if confirmation fails, abort (no UI validation message)
        return;
      }
    }
    

    // If the student attached files in the sidebar, send multipart/form-data
    try {
      if (sidebarFiles && sidebarFiles.length > 0) {
        const form = new FormData();
        // include answers, but replace File objects with a placeholder that includes question id
        // and append actual File objects under per-question fieldnames: files_q<questionId>
        const sendAnswers = {};
        Object.keys(answers).forEach(k => {
          const key = Number(k);
          const v = answers[key];
          if (v instanceof File) {
            // placeholder includes question id so server can map files by fieldname
            sendAnswers[key] = `__FILE__:${key}:${v.name}`;
            form.append(`files_q${key}`, v, v.name);
          } else if (Array.isArray(v) && v.length && v[0] instanceof File) {
            // support array of Files for a single question
            sendAnswers[key] = `__FILE__:${key}:${v.map(f=>f.name).join(',')}`;
            v.forEach(f => form.append(`files_q${key}`, f, f.name));
          } else {
            sendAnswers[key] = v;
          }
        });

        form.append('answers', JSON.stringify(sendAnswers));

        const resp = await fetch(apiUrl(`/quizzes/${id}/submit`), {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token')
          },
          body: form
        });
          if (resp.ok) {
          // Mark this quiz as viewed for the current user so it won't show as new
          try {
            const storageKey = `recentViewedItems_${(user && user.email) ? user.email : 'guest'}`;
            const raw = localStorage.getItem(storageKey);
            const viewed = raw ? JSON.parse(raw) : [];
            const key = `Quiz-${id}`;
            if (!viewed.includes(key)) {
              viewed.push(key);
              localStorage.setItem(storageKey, JSON.stringify(viewed));
              try { localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); } catch(e){}
            }
          } catch(e) {}
          if (isActivity) {
            try { localStorage.removeItem('active_quiz_endAt'); localStorage.removeItem('active_quiz_id'); } catch (e) {}
            setActivitySubmitted(true);
            return;
          }
          try { localStorage.removeItem('active_quiz_endAt'); localStorage.removeItem('active_quiz_id'); } catch (e) {}
          navigate(`/student/quizzes/${id}/score`);
          return;
        }
        // if multipart wasn't accepted, fall back to JSON-only
      }
    } catch (err) {
      console.error('Multipart submit failed:', err);
    }

    // Fallback: prepare serializable answers (replace File objects with filenames)
    const sendAnswers = {};
    Object.keys(answers).forEach(k => {
      const key = Number(k);
      const v = answers[key];
      if (v instanceof File) {
        // include question id in placeholder so server can map uploaded files when present
        sendAnswers[key] = `__FILE__:${key}:${v.name}`;
      } else if (Array.isArray(v) && v.length && v[0] instanceof File) {
        sendAnswers[key] = `__FILE__:${key}:${v.map(f=>f.name).join(',')}`;
      } else {
        sendAnswers[key] = v;
      }
    });
    const resp2 = await fetch(apiUrl(`/quizzes/${id}/submit`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({ answers: sendAnswers })
    });
    if (resp2.ok) {
      // Mark this quiz as viewed for the current user so it won't show as new
      try {
        const storageKey = `recentViewedItems_${(user && user.email) ? user.email : 'guest'}`;
        const raw = localStorage.getItem(storageKey);
        const viewed = raw ? JSON.parse(raw) : [];
        const key = `Quiz-${id}`;
        if (!viewed.includes(key)) {
          viewed.push(key);
          localStorage.setItem(storageKey, JSON.stringify(viewed));
          try { localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); } catch(e){}
        }
      } catch(e) {}
      if (isActivity) {
        try { localStorage.removeItem('active_quiz_endAt'); localStorage.removeItem('active_quiz_id'); } catch (e) {}
        setActivitySubmitted(true);
      } else {
        try { localStorage.removeItem('active_quiz_endAt'); localStorage.removeItem('active_quiz_id'); } catch (e) {}
        navigate(`/student/quizzes/${id}/score`);
      }
    }
  };

  const handleUnsubmit = async () => {
    // Try to notify server (if endpoint exists). If it fails, just revert UI.
    try {
      const resp = await fetch(apiUrl(`/quizzes/${id}/unsubmit`), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      if (!resp.ok) {
        // ignore and continue
      }
    } catch (e) {
      // ignore network errors
    }
    setActivitySubmitted(false);
  };
  if (!quiz || !attemptInfo) return /*#__PURE__*/_jsx("p", {
    children: "Loading..."
  });
  if (attemptInfo.remaining <= 0) return /*#__PURE__*/_jsx("h2", {
    children: "You have used all attempts for this quiz."
  });

  // END SCREEN
  if (submitted) {
    return /*#__PURE__*/_jsx("div", {
      className: "quiz-end-screen",
      children: /*#__PURE__*/_jsxs("div", {
        className: "card end-card",
        children: [/*#__PURE__*/_jsx("img", {
          src: "https://cdn-icons-png.flaticon.com/512/3159/3159066.png",
          width: "80"
        }), isActivity && /*#__PURE__*/_jsx("div", {
          className: "card",
          style: { padding: 12, marginTop: 12, textAlign: 'center' },
          children: /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", { style: { fontSize: 13, color: '#666', marginBottom: 8 }, children: "Your work" }), /*#__PURE__*/_jsx("div", { children: "+ Add or create" }), /*#__PURE__*/_jsx("div", { style: { marginTop: 8 }, children: /*#__PURE__*/_jsx("button", { className: "gc-open-btn", onClick: () => submitQuiz(), children: "Mark as done" }) })]
          })
        })]
      })
    });
  }
  const q = quiz.questions[current - 1];
  // helper to render a preview card for attached files (pdf/image/other)
  const renderPreviewCard = (filePath) => {
    if (!filePath) return null;
    const f = String(filePath);
    const url = f.startsWith('http') ? f : apiUrl(f);
    const fileName = f.split('/').pop();
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
      });
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
    });
  };

  const handleAddCreate = () => {
    if (activitySubmitted) return; // disable adding after submit
    fileInputRef.current?.click();
  };

  const downloadLocalFile = (file) => {
    try {
      const href = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = href;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      console.error('Local download failed', e);
    }
  };

  const handleSidebarFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;
    // add to sidebarFiles
    setSidebarFiles(prev => [...prev, ...files]);
    // also attach the first file to first activity question (keeps old behavior)
    const firstAct = quiz.questions.find(q => (q.type === 'Activity' || q.type === 'activity'));
    if (firstAct) updateAnswer(firstAct.id, files[0]);
    // reset input so selecting same file again works
    e.target.value = '';
  };

  const removeSidebarFile = (idx) => {
    if (activitySubmitted) return; // prevent removing when already submitted
    setSidebarFiles(prev => {
      const copy = prev.slice();
      const removed = copy.splice(idx, 1)[0];
      // If the removed file was attached to the first activity answer, clear or replace it
      const firstAct = quiz.questions.find(q => (q.type === 'Activity' || q.type === 'activity'));
      if (firstAct) {
        const currentVal = answers[firstAct.id];
        if (currentVal instanceof File && currentVal.name === removed.name) {
          // pick next file if available
          const next = copy[0] || null;
          updateAnswer(firstAct.id, next);
        }
      }
      return copy;
    });
  };

  const handleCloseActivity = () => {
    // Default behavior: go back to previous page. Adjust if you prefer a specific route.
    try {
      navigate(-1);
    } catch (e) {
      navigate('/student/quizzes');
    }
  };

  

  return /*#__PURE__*/_jsxs("div", {
    className: "student-quiz-take",
    style: {
      display: 'flex',
      gap: 80,
      alignItems: 'flex-start'
    },
    children: [/*#__PURE__*/_jsxs("main", {
      style: {
        flex: 1,
        paddingLeft: 60,
        maxWidth: '900px'
      },
      children: [/* Render all questions at once */
      quiz.questions.map((qq, idx) => /*#__PURE__*/_jsxs("div", {
        className: "card question-card",
        style: { position: 'relative' },
        children: [(String(qq.type).toLowerCase() === 'activity') ? null : /*#__PURE__*/_jsx("div", {
          className: "question-points",
          children: `${qq.points ? qq.points : 1} pts`
        }), /*#__PURE__*/_jsx("h2", {
          children: String(qq.type).toLowerCase() === 'activity' ? 'Submission' : ["Question ", idx + 1, "/", quiz.questions.length]
        }), /*#__PURE__*/_jsx("p", {
          className: "subtext",
          children: "Contextualize your topic with a subtitle"
        }), /*#__PURE__*/_jsx("div", {
          className: "question-text",
          children: qq.question
        }), qq.type === "Multiple Choice" && qq.options && /*#__PURE__*/_jsx("div", {
          children: JSON.parse(qq.options).map((op, i) => /*#__PURE__*/_jsxs("div", {
            className: "approval-row",
            children: [/*#__PURE__*/_jsx("div", {
              className: "approval-avatar",
              children: /*#__PURE__*/_jsx("span", { children: (i + 1).toString() })
            }), /*#__PURE__*/_jsx("div", {
              className: "approval-text",
              children: op
            }), /*#__PURE__*/_jsx("div", {
              className: "approval-actions",
              children: /*#__PURE__*/_jsx("button", {
                type: "button",
                className: answers[qq.id] === op ? "accept-btn selected" : "accept-btn",
                onClick: () => updateAnswer(qq.id, op),
                children: answers[qq.id] === op ? "Selected" : "Select"
              })
            })]
          }, i))
        }), qq.type === "Identification" && /*#__PURE__*/_jsxs("div", {
          className: "id-row",
          children: [/*#__PURE__*/_jsx("div", {
            className: "approval-avatar",
            children: /*#__PURE__*/_jsx("span", { children: "A" })
          }), /*#__PURE__*/_jsx("div", {
            style: { flex: 1, display: 'flex', alignItems: 'center' },
            children: /*#__PURE__*/_jsx("input", {
              type: "text",
              className: "input",
              placeholder: "Type your answer...",
              value: answers[qq.id] || '',
              onChange: e => updateAnswer(qq.id, e.target.value),
              style: { padding: '12px 14px', borderRadius: 8, border: '1px solid #e6e6e6', width: '100%' }
            })
          })]
        }), qq.type === "Activity" && /*#__PURE__*/_jsxs("div", {
          style: { marginTop: 12 },
          children: [/* posted files (teacher) */ (() => {
            try {
              const files = qq.files ? JSON.parse(qq.files) : (qq.filePath ? [qq.filePath] : []);
              if (!files || files.length === 0) return null;
              return /*#__PURE__*/_jsxs("div", {
                children: files.map((f, i) => /*#__PURE__*/_jsxs("div", {
                  className: "card",
                  style: { padding: 12, marginBottom: 12 },
                  children: [/* header/title */ /*#__PURE__*/_jsx("div", { style: { fontWeight: 700, marginBottom: 8 }, children: qq.title || qq.question || 'Files' }), /*#__PURE__*/_jsx("div", { children: renderPreviewCard(f) })]
                }, i))
              });
            } catch (e) {
              return null;
            }
          })()]
        }), /*#__PURE__*/_jsx("button", {
          type: "button",
          "aria-label": "Close activity",
          onClick: handleCloseActivity,
          className: "question-close-btn",
          children: "✕"
        })]
      }, idx)),
      /* Submit button (restored to main area) */
      , (!isActivity ? /*#__PURE__*/_jsxs("div", {
        style: { display: 'flex', justifyContent: 'center', marginTop: 18 },
        children: [/*#__PURE__*/_jsx("button", { className: "gc-open-btn", style: { padding: '10px 20px' }, onClick: activitySubmitted ? handleUnsubmit : () => submitQuiz(), children: activitySubmitted ? 'Unsubmit' : (isActivity ? 'Mark as done' : 'Submit') })]
      }) : null)]
    }), /*#__PURE__*/_jsx("aside", {
      style: { width: 340 },
      children: /*#__PURE__*/_jsxs("div", {
        children: [/* Time remaining card (hidden for Activity quizzes) */ !isActivity ? /*#__PURE__*/_jsx("div", {
          className: "card",
          style: { padding: 16, textAlign: 'center' },
          children: /*#__PURE__*/_jsxs("div", {
            children: [/*#__PURE__*/_jsx("div", { style: { fontSize: 13, color: '#666', marginBottom: 8 }, children: "Time Remaining" }), /*#__PURE__*/_jsx("div", { style: { fontSize: 28, fontWeight: 700, color: timerExpired ? '#ef4444' : '#111' }, children: timeDisplay })]
          })
        }) : null, /*#__PURE__*/_jsxs("div", {
          className: "card",
          style: { padding: 12, marginTop: 12 },
          children: [isActivity ? /*#__PURE__*/_jsxs("div", {
            children: [/* header */ /*#__PURE__*/_jsxs("div", {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
              children: [/*#__PURE__*/_jsx("strong", { children: "Your work" }), /*#__PURE__*/_jsx("div", { style: { fontSize: 12, color: '#666' }, children: "Assigned" })]
            }), /*#__PURE__*/_jsxs("div", {
              children: [/* selected files preview list */ sidebarFiles && sidebarFiles.length > 0 ? /*#__PURE__*/_jsxs("div", {
                style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 },
                children: [sidebarFiles.map((f, i) => {
                  const fileUrl = f && f instanceof File ? URL.createObjectURL(f) : null;
                  const fileName = f.name || String(f).split('/').pop();
                  const ext = (fileName || '').split('.').pop()?.toLowerCase();
                  if (ext === 'pdf') {
                    return /*#__PURE__*/_jsxs("div", {
                      key: i,
                      className: "gc-pdf-card",
                      children: [/*#__PURE__*/_jsx("iframe", { src: fileUrl, className: "gc-pdf-preview", title: fileName }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: fileUrl, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadLocalFile(f), children: "Download" })] })] })]
                    }, i);
                  }
                  if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
                    return /*#__PURE__*/_jsxs("div", {
                      key: i,
                      className: "gc-pdf-card",
                      children: [/*#__PURE__*/_jsxs("div", { className: "gc-pdf-preview", children: [/*#__PURE__*/_jsx("img", { src: fileUrl, alt: fileName, style: { maxWidth: '100%', maxHeight: 160, objectFit: 'contain' } })] }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: fileUrl, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadLocalFile(f), children: "Download" })] })] })]
                    }, i);
                  }
                  return /*#__PURE__*/_jsxs("div", {
                    key: i,
                    className: "gc-pdf-card",
                    children: [/*#__PURE__*/_jsxs("div", { className: "gc-pdf-preview", children: [/*#__PURE__*/_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }, children: '📄' })] }), /*#__PURE__*/_jsxs("div", { className: "gc-pdf-info", children: [/*#__PURE__*/_jsx("p", { className: "gc-pdf-name", children: fileName }), /*#__PURE__*/_jsxs("div", { children: [/*#__PURE__*/_jsx("a", { href: fileUrl, target: "_blank", rel: "noreferrer", className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadLocalFile(f), children: "Download" }), activitySubmitted ? /*#__PURE__*/_jsx("div", { style: { color: '#6b7280', fontSize: 12, display: 'inline-block', marginLeft: 8 }, children: "Submitted" }) : /*#__PURE__*/_jsx("button", { className: "sidebar-file-remove", "aria-label": "Remove file", onClick: () => removeSidebarFile(i), style: { marginLeft: 8 }, children: "✕" })] })] })]
                  }, i);
                })]
              }) : null, /*#__PURE__*/_jsx("div", {
                style: { marginBottom: 10 },
                children: /*#__PURE__*/_jsx("button", { className: activitySubmitted ? "view-all-btn disabled" : "view-all-btn", style: { padding: '8px 18px', width: '100%', borderRadius: 8, textAlign: 'center', opacity: activitySubmitted ? 0.6 : 1, cursor: activitySubmitted ? 'not-allowed' : 'pointer' }, onClick: handleAddCreate, disabled: activitySubmitted, children: "+ Add or create" })
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: { display: 'flex', justifyContent: 'center' },
              children: /*#__PURE__*/_jsx("button", { className: "gc-open-btn", style: { padding: '8px 18px', width: '100%' }, onClick: activitySubmitted ? handleUnsubmit : () => submitQuiz(), children: activitySubmitted ? 'Unsubmit' : 'Mark as done' })
            }), /*#__PURE__*/_jsx("input", {
              type: "file",
              ref: fileInputRef,
              style: { display: 'none' },
              onChange: handleSidebarFileChange,
              multiple: true,
              accept: "image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            }), /*#__PURE__*/_jsx("div", {
              style: { marginTop: 12 },
              children: (() => {
                const firstAct = quiz.questions.find(q => (q.type === 'Activity' || q.type === 'activity'));
                if (!firstAct) return null;
                const val = answers[firstAct.id];
                if (!val) return /*#__PURE__*/_jsx("div", { style: { color: '#666', textAlign: 'center' }, children: null });
                if (val instanceof File) {
                  // already shown in the sidebar list; avoid duplicate filename under the button
                  return null;
                }
                return renderPreviewCard(val);
              })()
            })]
          }) : /*#__PURE__*/_jsx("div", { style: { color: '#666' }, children: "" })]
        })]
      })
    })]
  });
}