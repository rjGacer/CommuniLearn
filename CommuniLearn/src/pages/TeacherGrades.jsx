import React, { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import "../css/teacher.css";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config";
import api from "../services/api";

export default function TeacherGrades() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentQuizzes, setStudentQuizzes] = useState([]);
  const [sqLoading, setSqLoading] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [selectedQuizDetails, setSelectedQuizDetails] = useState(null);
  const [selectedQuizAttempt, setSelectedQuizAttempt] = useState(null);

  function titleCase(fullName) {
    if (!fullName) return "";
    return String(fullName)
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get('/auth/approved', { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
        const data = res.data;
        if (mounted) setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading students", err);
        if (mounted) setStudents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  const openStudentQuizzes = async (s) => {
    setSelectedStudent(s);
    setSqLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await api.get('/quizzes/teacher', { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      const modules = resp.data;
      const quizzes = [];
      (Array.isArray(modules) ? modules : []).forEach((m) => {
        (m.quizzes || []).forEach((q) => quizzes.push({ ...q, moduleTitle: m.title }));
      });

      const results = await Promise.all(
        quizzes.map(async (q) => {
          try {
              const token = localStorage.getItem('token');
              const r = await api.get(`/quizzes/${q.id}/scores`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
              const data = r.data;
            const entry = Array.isArray(data)
              ? data.find((x) =>
                  (x.studentEmail && x.studentEmail === s.email) ||
                  (x.email && x.email === s.email) ||
                  (x.studentId && (x.studentId === s.id || x.studentId === Number(s.id)))
                )
              : null;
            return { quiz: q, score: entry ? entry.score : null };
          } catch (e) {
            return { quiz: q, score: null };
          }
        })
      );

      setStudentQuizzes(results.map((r) => ({ id: r.quiz.id, title: r.quiz.title, totalPoints: r.quiz.totalPoints || null, score: r.score })));
    } catch (err) {
      console.error("Failed to load quizzes/scores", err);
      setStudentQuizzes([]);
    } finally {
      setSqLoading(false);
    }
  };

  const openQuizAttempt = async (quiz) => {
    if (!selectedStudent) return;
    setAttemptLoading(true);
    try {
      const token = localStorage.getItem('token');
      const qResp = await api.get(`/quizzes/${quiz.id}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      const quizData = qResp.data;
      setSelectedQuizDetails(quizData);

      const aResp = await api.get(`/quizzes/${quiz.id}/attempts/list`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      const attemptsData = aResp.data || [];
      const attempts = Array.isArray(attemptsData) ? attemptsData : [];
      const matches = attempts.filter((a) => a.studentEmail === selectedStudent.email || a.studentId === selectedStudent.id || a.studentId === Number(selectedStudent.id));
      if (matches.length === 0) {
        setSelectedQuizAttempt(null);
        return;
      }
      matches.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : a.id || 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : b.id || 0;
        return tb - ta;
      });
      setSelectedQuizAttempt(matches[0]);
    } catch (err) {
      console.error("Failed loading quiz attempts", err);
      alert("Failed to load attempt details");
    } finally {
      setAttemptLoading(false);
    }
  };

  // helper to download a file URL via fetch and creating a blob link (copied from TeacherQuizView)
  const downloadFile = async (url) => {
    try {
      const full = url.startsWith('http') ? url : apiUrl(url);
      const resp = await fetch(full, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      if (!resp.ok) {
        alert('Failed to download file');
        return;
      }
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
      console.error('Download error', e);
      alert('Download failed');
    }
  };

  // Render a horizontal preview card for a submitted file (PDF/image/other)
  const renderFileCard = (file, i) => {
    if (!file) return null;
    const f = String(file);
    const url = f.startsWith('http') ? f : apiUrl(f);
    const fileName = f.split('/').pop();
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    const cardStyle = { width: '100%', borderRadius: 8, border: '1px solid #eef0f3', background: '#fff', overflow: 'hidden' };
    const horizontalCardStyle = Object.assign({}, cardStyle, { display: 'flex', alignItems: 'center', gap: 12, padding: 10 });
    const thumbStyle = { width: 120, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 4, background: '#f7fafc' };

    if (ext === 'pdf') {
      return (
        <div key={i} className="gc-pdf-card" style={horizontalCardStyle}>
          <div className="gc-pdf-preview" style={thumbStyle}>
            <iframe src={url} title={fileName} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
          <div className="gc-pdf-info" style={{ flex: 1 }}>
            <p className="gc-pdf-name" style={{ margin: 0 }}>{fileName}</p>
            <div style={{ marginTop: 8 }}>
              <a href={url} target="_blank" rel="noreferrer" className="gc-open-btn">Open</a>
              <button onClick={() => downloadFile(file)} style={{ marginLeft: 8 }} className="quiz-view-btn">Download</button>
            </div>
          </div>
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return (
        <div key={i} className="gc-pdf-card" style={horizontalCardStyle}>
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
    return (
      <div key={i} className="gc-pdf-card" style={horizontalCardStyle}>
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

  // Open the quiz and show the latest attempt for the selected student if present
  const openQuizOrLatestAttempt = async (quiz) => {
    if (!selectedStudent) return;
    setAttemptLoading(true);
    try {
      const token = localStorage.getItem('token');
      const qResp = await api.get(`/quizzes/${quiz.id}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      const quizData = qResp.data;
      setSelectedQuizDetails(quizData);

      const aResp = await api.get(`/quizzes/${quiz.id}/attempts/list`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      const attemptsData = aResp.data || [];
      const attempts = Array.isArray(attemptsData) ? attemptsData : [];
      const matches = attempts.filter((a) => a.studentEmail === selectedStudent.email || a.studentId === selectedStudent.id || a.studentId === Number(selectedStudent.id));
      if (matches.length === 0) {
        // no attempt: show quiz (selectedQuizAttempt stays null)
        setSelectedQuizAttempt(null);
      } else {
        matches.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : a.id || 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : b.id || 0;
          return tb - ta;
        });
        setSelectedQuizAttempt(matches[0]);
      }
    } catch (err) {
      console.error("Failed loading quiz/attempts for direct view", err);
      alert("Failed to load quiz or attempts");
    } finally {
      setAttemptLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header-box">
        <h1 className="page-title">Grades</h1>
      </div>

      <div className="page-content card-container approvals-list">
        {loading ? (
          <p>Loading...</p>
        ) : students.length === 0 ? (
          <p style={{ textAlign: "center", padding: "1rem", color: "#777" }}>No students found.</p>
        ) : (
          students.map((s) => (
            <div className="approval-row" key={s.id}>
              <div className="row-left">
                <Avatar name={s.name} email={s.email || null} className="avatar-small" />
                <div className="student-name">{titleCase(s.name)}</div>
              </div>
              <div className="row-right">
                <button className="approval-btn approval-approve" onClick={() => openStudentQuizzes(s)}>
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedStudent && (
        <div className="modal-overlay" onClick={() => { setSelectedStudent(null); setStudentQuizzes([]); }}>
          <div className="modal-content" role="dialog" aria-modal={"true"} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <Avatar name={selectedStudent.name} email={selectedStudent.email || null} className="tqv-pfp" />
                <div>
                  <div className="student-fullname">{titleCase(selectedStudent.name)}</div>
                  <div className="student-email">{selectedStudent.email || ""}</div>
                </div>
              </div>
              <div>
                <button className="tqv-close-btn tqv-close-text" title="Close" aria-label="Close" onClick={() => { setSelectedStudent(null); setStudentQuizzes([]); }}>
                  Close
                </button>
              </div>
            </div>

            <h3 className="modal-title">Quizzes & Scores</h3>
            <div className="student-modal-divider" />

            {sqLoading ? (
              <p>Loading...</p>
            ) : studentQuizzes.length === 0 ? (
              <p className="muted">No quizzes found or no scores available.</p>
            ) : (
              <div>
                {studentQuizzes.map((q) => (
                  <div key={q.id} className="quiz-row">
                    <div>
                      <div className="quiz-title">{q.title}</div>
                      {q.totalPoints !== null && <div className="quiz-meta">{q.totalPoints} Item(s)</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="quiz-score" style={{ color: q.score !== null && q.score !== undefined ? "#111" : "#666" }}>
                        {q.score !== null && q.score !== undefined ? `${q.score}${q.totalPoints ? `/${q.totalPoints}` : ""}` : <span className="score-missing">missing</span>}
                      </div>
                        <button className="tqv-view-btn" onClick={() => openQuizOrLatestAttempt(q)}>
                          View
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedQuizDetails && (
        <div className="modal-overlay" onClick={() => { setSelectedQuizAttempt(null); setSelectedQuizDetails(null); }}>
          <div className="modal-content" role="dialog" aria-modal={"true"} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong>{selectedQuizAttempt?.name || selectedQuizAttempt?.email || 'Student Attempt'}</strong>
                <div style={{ fontSize: 12, color: '#666' }}>{selectedQuizAttempt?.createdAt ? new Date(selectedQuizAttempt.createdAt).toLocaleString() : ''}</div>
              </div>
              <div>
                <button className="tqv-close-btn" onClick={() => { setSelectedQuizAttempt(null); setSelectedQuizDetails(null); }}>Close</button>
              </div>
            </div>

            {attemptLoading ? <p>Loading attempt...</p> : (
              <div>
                {selectedQuizAttempt && selectedQuizAttempt.noAttempt && (
                  <div style={{ padding: 10, background: '#fff7e6', border: '1px solid #ffe5b4', borderRadius: 6, marginBottom: 12 }}>
                    <strong>No attempt found.</strong> Showing the quiz questions and correct answers only.
                  </div>
                )}

                {selectedQuizAttempt && selectedQuizAttempt.submittedFiles && selectedQuizAttempt.submittedFiles.length > 0 && (
                  <div style={{ padding: 10, background: '#f7f9ff', border: '1px solid #e1e9ff', borderRadius: 6, marginBottom: 12 }}>
                    <strong>Submitted files (module):</strong>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedQuizAttempt.submittedFiles.map((f, i) => renderFileCard(f, i))}
                    </div>
                  </div>
                )}

                <h3 style={{ marginTop: 0 }}>Answers</h3>
                <div className="student-modal-divider" />

                {(selectedQuizDetails?.questions || []).map((q, idx) => {
                  // parse attempt answers (support multiple shapes)
                  let answers = [];
                  try {
                    if (selectedQuizAttempt && selectedQuizAttempt.answers) {
                      if (Array.isArray(selectedQuizAttempt.answers)) {
                        answers = selectedQuizAttempt.answers;
                      } else {
                        const parsed = typeof selectedQuizAttempt.answers === 'string' ? JSON.parse(selectedQuizAttempt.answers) : selectedQuizAttempt.answers;
                        if (Array.isArray(parsed)) {
                          answers = parsed;
                        } else if (parsed && typeof parsed === 'object') {
                          answers = Object.entries(parsed).map(([k, v]) => ({ questionId: Number(k), answer: v }));
                        }
                      }
                    }
                  } catch (e) {
                    answers = [];
                  }
                  const a = answers.find(ax => ax.questionId === q.id || ax.qid === q.id || ax.questionId === Number(q.id));

                  // parse options for multiple choice
                  let options = [];
                  try { options = q.options ? (Array.isArray(q.options) ? q.options : JSON.parse(q.options)) : []; } catch (e) { options = []; }
                  const studentAns = a ? a.answer ?? a.selected ?? a.value ?? null : null;

                  // collect any student-submitted files for this answer
                  let studentFiles = [];
                  try {
                    if (a) {
                      if (Array.isArray(a.files) && a.files.length > 0) studentFiles = a.files;
                      else if (Array.isArray(a.uploads) && a.uploads.length > 0) studentFiles = a.uploads;
                      else if (typeof a.answer === 'string') {
                        try {
                          const parsed = JSON.parse(a.answer);
                          if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(x => typeof x === 'string')) studentFiles = parsed;
                        } catch (e) {
                          if (a.answer && (a.answer.includes('/uploads') || a.answer.startsWith('/'))) studentFiles = [a.answer];
                          else if (a.answer && a.answer.startsWith('__FILE__:')) {
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
                  } catch (e) { studentFiles = []; }

                  return (
                    <div key={q.id} style={{ padding: '10px 8px', borderBottom: '1px solid #f1f1f1' }}>
                      <div style={{ fontWeight: 600 }}>Question {idx + 1}</div>
                      <div style={{ marginTop: 6 }}>{q.question}</div>

                      {options.length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                          <strong>Options:</strong>
                          <div style={{ marginTop: 8 }}>
                            {options.map((opt, i) => {
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
                              return (
                                <div key={i} style={baseStyle}>
                                  <div style={{ flex: 1 }}>{opt}</div>
                                  <div style={{ marginLeft: 12, fontSize: 12, color: '#444', minWidth: 80, textAlign: 'right' }}>
                                    {isSelected ? (
                                      <span style={{ padding: '4px 8px', borderRadius: 999, background: isCorrect ? '#0f9d58' : '#e55a4e', color: '#fff', fontSize: 12 }}>
                                        {isCorrect ? 'Selected - correct' : 'Selected - wrong'}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          <strong>Student answer:</strong>
                          <div style={{ marginTop: 6, color: studentAns ? '#111' : '#666' }}>
                            {(() => {
                              const isFilePath = (val) => {
                                if (!val || typeof val !== 'string') return false;
                                const lower = val.toLowerCase();
                                if (lower.startsWith('/') || lower.includes('/uploads/') || /\.(pdf|png|jpg|jpeg|gif|webp)$/i.test(lower)) return true;
                                return false;
                              };

                              if (studentFiles && studentFiles.length > 0) {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {studentFiles.map((sf, i) => renderFileCard(sf, i))}
                                  </div>
                                );
                              }

                              if (isFilePath(studentAns)) {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {renderFileCard(studentAns, 0)}
                                  </div>
                                );
                              }
                              if (studentAns) {
                                if (q.type === 'Identification') {
                                  const isCorrect = (q.answer || '').toString().trim().toLowerCase() === String(studentAns).toString().trim().toLowerCase();
                                  return (
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: isCorrect ? '#e6ffed' : '#ffecec', border: isCorrect ? '1px solid #7be29a' : '1px solid #ff9b9b' }}>
                                              <div style={{ flex: 1 }}>{String(studentAns)}</div>
                                              <div style={{ marginLeft: 12 }}>{!isCorrect ? <span style={{ padding: '4px 8px', borderRadius: 999, background: '#e55a4e', color: '#fff', fontSize: 12 }}>wrong</span> : null}</div>
                                      </div>
                                    </div>
                                  );
                                }
                                return String(studentAns);
                              }
                              return <em>No answer</em>;
                            })()}
                          </div>
                          {q.answer && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Correct answer:</strong>
                              <div style={{ marginTop: 6, color: '#666' }}>{q.answer}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
