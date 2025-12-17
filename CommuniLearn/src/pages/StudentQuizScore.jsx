import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StudentQuizScore() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [scoreData, setScoreData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [previewOpen, setPreviewOpen] = useState({});

  const togglePreview = (idx, url) => {
    setPreviewOpen(prev => ({ ...prev, [idx]: prev[idx] ? null : url }));
  };
  useEffect(() => {
    loadScore();
  }, [id]);

  useEffect(() => {
    if (scoreData) {
      try { console.log('StudentQuizScore loaded scoreData', scoreData); } catch (e) {}
    }
  }, [scoreData]);
  const loadScore = async () => {
    const resp = await fetch(`http://localhost:5000/quizzes/${id}/score`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });
    if (!resp.ok) return;
    const data = await resp.json();
    setScoreData(data);
    // also attempt to load any module submissions for this quiz (may return current student's submission)
    try {
      const sresp = await fetch(`http://localhost:5000/quizzes/${id}/submissions`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      if (sresp.ok) {
        const subs = await sresp.json();
        setSubmissions(Array.isArray(subs) ? subs : []);
      }
    } catch (e) {
      console.error('failed loading submissions', e);
    }
  };

  const downloadFile = async (url) => {
    try {
      const full = url.startsWith('http') ? url : `http://localhost:5000${url}`;
      const resp = await fetch(full, { headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
      if (!resp.ok) return alert('Failed to download file');
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      const parts = url.split('/');
      a.download = parts[parts.length - 1] || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      console.error('download error', e);
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
      str = str.replace(/\\\\/g, '/').replace(/\\/g, '/');

      if (str.startsWith('[')) {
        try {
          const parsed = JSON.parse(str);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {}
      }

      const urlRegex = /(https?:\/\/[^\s"']+|\/uploads\/[^\s"']+)/g;
      const matches = str.match(urlRegex);

      if (matches?.length) return matches;

      if (str.includes('/uploads/')) return [str];

      return [];
    };

    const renderFile = (file, key) => {
      const url = file.startsWith('http') ? file : `http://localhost:5000${file}`;
      const ext = (file.split('.').pop() || '').toLowerCase();

      if (ext === 'pdf') {
        return (
          <div key={key} style={{ marginTop: 10 }}>
            <iframe src={url} style={{ width: '100%', height: 250 }} />
            <a href={url} target="_blank" rel="noreferrer">Open PDF</a>
          </div>
        );
      }

      if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
        return (
          <div key={key} style={{ marginTop: 10 }}>
            <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: 250 }} />
            <a href={url} target="_blank" rel="noreferrer">Open Image</a>
          </div>
        );
      }

      return (
        <div key={key} style={{ marginTop: 10 }}>
          <a href={url} target="_blank" rel="noreferrer">{file}</a>
        </div>
      );
    };

  const renderFileCard = (file, i) => {
    if (!file) return null;
    const f = String(file);
    const url = f.startsWith('http') ? f : `http://localhost:5000${f}`;
    const fileName = f.split('/').pop();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 160, height: 120, border: '1px solid #eef0f3' }}>
            <iframe src={url} title={fileName} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{fileName}</div>
            <div style={{ marginTop: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button onClick={() => downloadFile(f)} style={{ marginLeft: 8 }} className="quiz-view-btn">Download</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 120, height: 90, border: '1px solid #eef0f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</div>
        <div>
          <div style={{ fontWeight: 600 }}>{fileName}</div>
          <div style={{ marginTop: 8 }}>
            <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
            <button onClick={() => downloadFile(f)} style={{ marginLeft: 8 }} className="quiz-view-btn">Download</button>
          </div>
        </div>
      </div>
    );
  };

  // collect any file paths from a detail object (robust for different backend shapes)
  const collectPathsFromDetail = (d) => {
    const out = [];
    if (!d) return out;

    // DIRECT handling for student file submissions
    if (d.filePath) {
      out.push(String(d.filePath));
    }

    if (Array.isArray(d.filePaths)) {
      d.filePaths.forEach(fp => out.push(String(fp)));
    }
    const pushIf = (v) => { if (!v) return; if (Array.isArray(v)) v.forEach(x=>{ if (x) out.push(String(x)); }); else out.push(String(v)); };

      // NEW — direct extract for simple file paths (student Activity submissions)
      if (typeof d.userAnswer === "string") {
        const ua = d.userAnswer.trim();

        // Direct PDF/FILE handling
        if (ua.startsWith("/uploads/")) {
          out.push(ua);
          return out;
        }

        // Fallback: detect typical file extensions
        if (/\.(pdf|docx?|pptx?|png|jpg|jpeg|gif)$/i.test(ua)) {
          out.push(ua);
          return out;
        }
      }

    // recursive scan to find any strings containing /uploads/ or http urls inside nested structures
    const recursiveScan = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        let s = obj;
        // normalize escaped slashes and common JSON-escaped sequences
        try { s = s.replace(/\\\//g, '/').replace(/\\\\/g, '/').replace(/\\n/g, ' '); } catch (e) {}
        // handle file placeholder pattern __FILE__:<qid>:<filename>
        try {
          if (s.startsWith('__FILE__:')) {
            const parts = s.split(':');
            const fname = parts.slice(2).join(':');
            if (fname) {
              // search loaded submissions for matching filename
              if (submissions && submissions.length > 0) {
                for (const sub of submissions) {
                  if (!sub) continue;
                  // check common fields
                  if (sub.filePath && String(sub.filePath).endsWith(fname)) out.push(String(sub.filePath));
                  if (sub.filePaths && Array.isArray(sub.filePaths)) {
                    sub.filePaths.forEach(fp => { if (String(fp).endsWith(fname)) out.push(String(fp)); });
                  }
                  // deeper scan
                  try { recursiveScan(sub); } catch (e) {}
                }
              }
            }
            return;
          }
        } catch (e) {}
        // try extracting normalized paths from the string
        const ex = extractPathsFromString(s);
        if (ex && ex.length) {
          for (const m of ex) out.push(m);
          return;
        }
        if (s.includes('/uploads/') || /https?:\/\//.test(s) || /\.(pdf|png|jpg|jpeg|gif|docx?|pptx?)$/i.test(s)) out.push(s);
        return;
      }
      if (Array.isArray(obj)) {
        for (const item of obj) recursiveScan(item);
        return;
      }
      if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          try { recursiveScan(obj[k]); } catch (e) {}
        }
      }
    };

    // common fields
    if (Array.isArray(d.submittedFiles) && d.submittedFiles.length) pushIf(d.submittedFiles);
    if (Array.isArray(d.files) && d.files.length) pushIf(d.files);
    if (Array.isArray(d.uploads) && d.uploads.length) pushIf(d.uploads);

    // direct answer fields that may contain paths or json arrays
    if (d.userAnswer) {
      if (typeof d.userAnswer === 'string') {
        const ex = extractPathsFromString(d.userAnswer);
        if (ex && ex.length) pushIf(ex);
        try { const parsed = JSON.parse(d.userAnswer); if (Array.isArray(parsed)) pushIf(parsed); } catch(e) {}
      } else if (Array.isArray(d.userAnswer)) pushIf(d.userAnswer);
      else if (d.userAnswer && typeof d.userAnswer === 'object') {
        if (Array.isArray(d.userAnswer.files)) pushIf(d.userAnswer.files);
        if (Array.isArray(d.userAnswer.uploads)) pushIf(d.userAnswer.uploads);
      }
    }

    if (d.answer) {
      if (typeof d.answer === 'string') {
        const ex = extractPathsFromString(d.answer);
        if (ex && ex.length) pushIf(ex);
        try { const parsed = JSON.parse(d.answer); if (Array.isArray(parsed)) pushIf(parsed); } catch(e) {}
      } else if (Array.isArray(d.answer)) pushIf(d.answer);
      else if (d.answer && typeof d.answer === 'object') {
        if (Array.isArray(d.answer.files)) pushIf(d.answer.files);
        if (Array.isArray(d.answer.uploads)) pushIf(d.answer.uploads);
        // also recursively scan answer object for nested paths
        recursiveScan(d.answer);
      }
    }

    // fallback: check any string fields for /uploads/ substring
    Object.keys(d).forEach(k => {
      const v = d[k];
      if (typeof v === 'string' && v.includes('/uploads/')) {
        const ex = extractPathsFromString(v);
        if (ex && ex.length) pushIf(ex);
      }
    });

    // if nothing found, try module submissions we loaded for this quiz (student view will likely return their submission)
    if (out.length === 0 && submissions && submissions.length > 0) {
      // collect any filePath/filePaths across all submissions (best effort)
      for (const s of submissions) {
        if (!s) continue;
        if (s.filePath) pushIf(s.filePath);
        if (s.filePaths) pushIf(s.filePaths);
        // some submissions embed files in nested objects
        recursiveScan(s);
      }
    }

    // if still nothing found, do a deep scan of the detail object itself
    if (out.length === 0) recursiveScan(d);

    // dedupe and normalize
    return Array.from(new Set(out.map(String)));
  };
  if (!scoreData) return /*#__PURE__*/_jsx("p", {
    children: "Loading score..."
  });
  return /*#__PURE__*/_jsxs("div", {
    className: "score-page",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "card score-header",
      children: [/*#__PURE__*/_jsx("h1", {
        children: scoreData.quizTitle
      }), /*#__PURE__*/_jsxs("h2", {
        children: ["Score: ", scoreData.score, " / ", scoreData.total]
      }), /*#__PURE__*/_jsx("button", {
        className: "btn",
        onClick: () => navigate("/student/quizzes"),
        children: "Back to Quizzes"
      })]
    }), /*#__PURE__*/_jsx("div", {
      className: "score-details",
      children: scoreData.details.map((d, i) => /*#__PURE__*/_jsxs("div", {
        className: `card answer-card ${d.isCorrect ? "correct" : "wrong"}`,
        children: [/*#__PURE__*/_jsxs("div", {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
          children: [/*#__PURE__*/_jsxs("h3", {
            children: ["Question ", i + 1]
          }), /*#__PURE__*/_jsx("div", {
            style: { fontSize: 13, color: '#444' },
            children: d.type === 'Activity' ? /*#__PURE__*/_jsx("strong", {
              children: d.submitted ? "Submitted" : "Not submitted"
            }) : /*#__PURE__*/_jsxs("strong", {
              children: [d.awarded ?? 0, " / ", d.points ?? 1, " pts"]
            })
          })]
        }), /*#__PURE__*/_jsx("p", {
          children: /*#__PURE__*/_jsx("strong", {
            children: d.question
          })
          }), /*#__PURE__*/_jsxs("p", {
          children: [/*#__PURE__*/_jsx("strong", { children: "Your Answer:" }), " ", (() => {
            try {
              // Multiple Choice: render the full option list and highlight according to rules
              if (d.type === 'Multiple Choice') {
                const userAns = d.userAnswer;
                const correctAns = d.correctAnswer;
                const options = Array.isArray(d.options) ? d.options : [];

                // If no options were provided by the backend, fall back to the previous single-box display
                if (!options || options.length === 0) {
                  const ansText = (d.userAnswer ?? d.answer ?? '') || '<No answer>';
                  const display = typeof ansText === 'string' ? ansText : JSON.stringify(ansText);
                  const isCorrect = !!d.isCorrect;
                  const boxStyle = {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px',
                    borderRadius: 8,
                    background: isCorrect ? '#e6ffed' : '#ffecec',
                    border: isCorrect ? '1px solid #7be29a' : '1px solid #ff9b9b',
                    color: '#111'
                  };
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div style={boxStyle}>
                        <div style={{ flex: 1 }}>{display}</div>
                        <div style={{ marginLeft: 12 }}>
                          <span style={{ padding: '4px 8px', borderRadius: 999, background: isCorrect ? '#0f9d58' : '#e55a4e', color: '#fff', fontSize: 12 }}>
                            Selected
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ marginTop: 10 }}>
                    {options.map((opt, idx) => {
                      const isSelected = opt === userAns;
                      const isCorrect = opt === correctAns;

                      let bg = "#f7f7f7";
                      let border = "1px solid #ccc";

                      if (isCorrect) {
                        bg = "#e6ffed";          // green background
                        border = "1px solid #7be29a";
                      }
                      if (isSelected && !isCorrect) {
                        bg = "#ffecec";          // red background
                        border = "1px solid #ff9b9b";
                      }

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "10px",
                            marginBottom: "8px",
                            borderRadius: "8px",
                            background: bg,
                            border: border,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <span style={{ flex: 1 }}>{opt}</span>

                          {isSelected && (
                            <span
                              style={{
                                padding: "4px 10px",
                                fontSize: "12px",
                                borderRadius: "999px",
                                background: isCorrect ? "#0f9d58" : "#e55a4e",
                                color: "white",
                                marginLeft: 12
                              }}
                            >
                              {isCorrect ? 'Selected - correct' : 'Selected - wrong'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Identification: preserve the previous single-box behavior
              if (d.type === 'Identification') {
                const ansText = (d.userAnswer ?? d.answer ?? '') || '<No answer>';
                const display = typeof ansText === 'string' ? ansText : JSON.stringify(ansText);
                const isCorrect = !!d.isCorrect;
                const boxStyle = {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderRadius: 8,
                  background: isCorrect ? '#e6ffed' : '#ffecec',
                  border: isCorrect ? '1px solid #7be29a' : '1px solid #ff9b9b',
                  color: '#111'
                };
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={boxStyle}>
                      <div style={{ flex: 1 }}>{display}</div>
                      <div style={{ marginLeft: 12 }}>
                        <span style={{ padding: '4px 8px', borderRadius: 999, background: isCorrect ? '#0f9d58' : '#e55a4e', color: '#fff', fontSize: 12 }}>
                          Selected
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback behavior (files / other types) — preserve existing extraction & preview logic
              const rawAnswerStr = (typeof d.userAnswer === 'string' && d.userAnswer) || (typeof d.answer === 'string' && d.answer) || '';
              const simpleFiles = extractPathsFromString(rawAnswerStr || '');
              if (simpleFiles && simpleFiles.length > 0) {
                return (
                  <div>{simpleFiles.map((f, idx) => renderFile(f, `simple-${i}-${idx}`))}</div>
                );
              }
              let paths = collectPathsFromDetail(d) || [];
              if ((!paths || paths.length === 0) && typeof d.userAnswer === 'string') {
                paths = extractPathsFromString(d.userAnswer);
              }
              if ((!paths || paths.length === 0) && typeof d.answer === 'string') {
                paths = extractPathsFromString(d.answer);
              }
              if ((!paths || paths.length === 0)) {
                try {
                  const serialized = JSON.stringify(d);
                  const found = extractPathsFromString(serialized);
                  if (found && found.length) paths = found;
                } catch (e) {}
              }
              if (paths && paths.length > 0) {
                return /*#__PURE__*/_jsxs("div", { children: [paths.map((p, i) => renderFileCard(p, i))] });
              }
              const rawCandidate = (typeof d.userAnswer === 'string' && d.userAnswer.trim()) || (typeof d.answer === 'string' && d.answer.trim()) || null;
              if (rawCandidate && (rawCandidate.includes('/uploads/') || rawCandidate.startsWith('/'))) {
                const raw = rawCandidate.trim();
                const url = raw.startsWith('http') ? raw : `http://localhost:5000${raw}`;
                const fileName = raw.split('/').pop();
                return /*#__PURE__*/_jsxs("div", {
                  children: [/*#__PURE__*/_jsxs("div", {
                    style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
                    children: [/*#__PURE__*/_jsx("div", { style: { fontWeight: 600 }, children: fileName }), /*#__PURE__*/_jsxs("div", {
                      children: [/*#__PURE__*/_jsx("button", { onClick: () => window.open(url, '_blank'), className: "gc-open-btn", children: "Open" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => downloadFile(raw), children: "Download" }), /*#__PURE__*/_jsx("button", { style: { marginLeft: 8 }, onClick: () => togglePreview(i, url), children: previewOpen[i] ? 'Hide Preview' : 'Preview' })]
                    })]
                  }), previewOpen[i] ? /*#__PURE__*/_jsx("div", { style: { marginTop: 8 }, children: /*#__PURE__*/_jsx("iframe", { src: url, title: fileName, style: { width: '100%', height: 400, border: 'none' } }) }) : null]
                });
              }
            } catch (e) {
              console.error('Answer render error', e);
            }
            return /*#__PURE__*/_jsx("span", { style: { color: d.isCorrect ? "green" : "red" }, children: d.userAnswer ?? d.answer });
          })()]
        }), !d.isCorrect && /*#__PURE__*/_jsxs("p", {
          children: [/*#__PURE__*/_jsx("strong", {
            children: "Correct Answer:"
          }), " ", d.correctAnswer]
        })]
      }, i))
    })]
  });
}