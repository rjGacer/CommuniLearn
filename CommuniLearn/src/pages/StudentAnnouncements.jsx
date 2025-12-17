import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import RightSidebar from "../components/RightSidebar";
import { apiUrl } from "../config";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function timeAgo(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hours ago`;
  const days = Math.floor(hr / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
function formatDueParts(due) {
  if (!due) return null;
  try {
    const d = new Date(due);
    const now = Date.now();
    const diff = d.getTime() - now;
    // detect date-only (midnight) and time-only (1970 epoch used as sentinel)
    const isDateOnly = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
    const isTimeOnly = d.getFullYear && d.getFullYear() === 1970;
    if (diff <= 0) return { status: 'timesUp', label: "Time's Up" };
    if (isTimeOnly) {
      return { status: 'timeOnly', timePart: d.toLocaleTimeString() };
    }
    if (!isDateOnly) {
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return { status: 'relative', label: `Due in ${mins}mins` };
      const hours = Math.round(mins / 60);
      if (hours < 24) return { status: 'relative', label: `Due in ${hours}hrs` };
      return { status: 'date', datePart: d.toLocaleDateString(), timePart: d.toLocaleTimeString() };
    }
    return { status: 'date', datePart: d.toLocaleDateString(), timePart: null };
  } catch (e) {
    return null;
  }
}
export default function StudentAnnouncements() {
  const {
    user
  } = useAuth ? useAuth() : {
    user: null
  }; // try context; fallback below
  const fallbackEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
  const currentEmail = user?.email || fallbackEmail || "";
  const [announcements, setAnnouncements] = useState([]);
  const [teachersMap, setTeachersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // comment inputs per announcement id
  const [commentInputs, setCommentInputs] = useState({});
  // editing comment
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  // menu states
  const [openAnnMenu, setOpenAnnMenu] = useState(null);
  const [openCommentMenu, setOpenCommentMenu] = useState(null);
  const [markedAttendanceIds, setMarkedAttendanceIds] = useState({});
  const [attendancesList, setAttendancesList] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'announcement' | 'attendance'

  // close menus when clicking outside
  useEffect(() => {
    const onDocClick = e => {
      const target = e.target;
      if (!target) return;
      if (target.closest('.module-dropdown') || target.closest('.module-more-btn')) return;
      setOpenAnnMenu(null);
      setOpenCommentMenu(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  // edit announcement modal
  const [showEditAnnModal, setShowEditAnnModal] = useState(false);
  const [editAnnId, setEditAnnId] = useState(null);
  const [editAnnText, setEditAnnText] = useState("");

  // load announcements
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/announcements', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        // ensure announcements sorted earliest -> latest
        const sorted = Array.isArray(data) ? data.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
        // Try to fetch teacher profiles so we can display their pictures if available
        try {
          const tRes = await api.get('/auth/teachers', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
          if (tRes && tRes.data) {
            const tData = tRes.data;
            const map = {};
            if (Array.isArray(tData)) {
              for (const t of tData) {
                if (t.email) map[t.email] = t;
              }
            }
            setTeachersMap(map);
            // attach picture/username to announcements where possible
            const enriched = sorted.map(s => ({ ...s, authorPicture: (s.picture || (s.teacherEmail && map[s.teacherEmail] && map[s.teacherEmail].picture)) || null, username: s.username || (s.teacherEmail ? (map[s.teacherEmail] && map[s.teacherEmail].name) : s.username) }));
            setAnnouncements(enriched);
          } else {
            setAnnouncements(sorted);
          }
        } catch (e) {
          setAnnouncements(sorted);
        }
        // load attendance marks so Present button initial state is accurate
        try {
          const attRes = await api.get('/attendance', { headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
          const attData = attRes.data;
          if (Array.isArray(attData)) {
            const map = {};
            for (const a of attData) {
              if (Array.isArray(a.marks) && a.marks.some(m => m.studentEmail === currentEmail)) map[a.id] = true;
            }
            setMarkedAttendanceIds(map);
            setAttendancesList(Array.isArray(attData) ? attData : []);
          }
        } catch (e) {}
      } catch (err) {
        console.error("Failed to load announcements:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // add comment (new comments appear at top of comments list i.e newest-first)
  const addComment = async announcementId => {
    const text = (commentInputs[announcementId] || "").trim();
    if (!text) return;
    try {
      const res = await fetch(apiUrl(`/announcements/${announcementId}/comments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          text
        })
      });
      const newComment = await res.json();
      if (!res.ok) {
        alert(newComment.error || "Failed to add comment");
        return;
      }

      // enrich returned comment with username/picture when missing so UI shows username instead of raw email
      const enriched = {
        ...newComment,
        username: newComment.username || user?.username || user?.name || (newComment.authorEmail?.split?.('@')?.[0] ?? newComment.authorName ?? newComment.authorEmail),
        authorPicture: newComment.authorPicture || user?.picture || (newComment.authorEmail && teachersMap[newComment.authorEmail] && teachersMap[newComment.authorEmail].picture) || null
      };

      // update UI: append to comments array (server keeps createdAt)
      setAnnouncements(prev => prev.map(a => a.id === announcementId ? {
        ...a,
        comments: [...a.comments, enriched]
      } : a));
      setCommentInputs(prev => ({
        ...prev,
        [announcementId]: ""
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to add comment");
    }
  };

  // start editing a comment
  const startEditComment = comment => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
    setOpenCommentMenu(null);
  };

  // submit edited comment
  const submitEditComment = async announcementId => {
    if (!editingCommentId) return;
    const text = editingCommentText.trim();
    if (!text) return alert("Comment cannot be empty");
    try {
      const res = await fetch(apiUrl(`/announcements/${announcementId}/comments/${editingCommentId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          text
        })
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.error || "Failed to edit comment");
        return;
      }

      const enrichedUpdated = {
        ...updated,
        username: updated.username || user?.username || user?.name || (updated.authorEmail?.split?.('@')?.[0] ?? updated.authorName ?? updated.authorEmail),
        authorPicture: updated.authorPicture || (updated.authorEmail && teachersMap[updated.authorEmail] && teachersMap[updated.authorEmail].picture) || user?.picture || null
      };

      setAnnouncements(prev => prev.map(a => a.id === announcementId ? {
        ...a,
        comments: a.comments.map(c => c.id === enrichedUpdated.id ? enrichedUpdated : c)
      } : a));
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error(err);
      alert("Failed to edit comment");
    }
  };

  // delete comment
  const deleteComment = async (announcementId, commentId) => {
    if (!(await window.customConfirm("Delete this comment?"))) return;
    try {
      const res = await fetch(apiUrl(`/announcements/${announcementId}/comments/${commentId}`), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const payload = await res.json();
      if (!res.ok) {
        alert(payload.error || "Failed to delete comment");
        return;
      }
      setAnnouncements(prev => prev.map(a => a.id === announcementId ? {
        ...a,
        comments: a.comments.filter(c => c.id !== commentId)
      } : a));
      setOpenCommentMenu(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    }
  };

  // open edit announcement modal
  const openEditAnnouncement = ann => {
    setEditAnnId(ann.id);
    setEditAnnText(ann.description);
    setShowEditAnnModal(true);
    setOpenAnnMenu(null);
  };

  // submit announcement edit
  const submitEditAnnouncement = async () => {
    if (!editAnnId) return;
    try {
      const res = await fetch(apiUrl(`/announcements/${editAnnId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          description: editAnnText
        })
      });
      const updated = await res.json();
      if (!res.ok) {
        alert(updated.error || "Failed to update announcement");
        return;
      }
      setAnnouncements(prev => prev.map(a => a.id === updated.id ? {
        ...a,
        description: updated.description
      } : a));
      setShowEditAnnModal(false);
      setEditAnnId(null);
      setEditAnnText("");
    } catch (err) {
      console.error(err);
      alert("Failed to update announcement");
    }
  };

  // delete announcement (teacher only) - same behavior as teacher page
  const deleteAnnouncement = async id => {
    if (!(await window.customConfirm("Delete this announcement?"))) return;
    try {
      const res = await fetch(apiUrl(`/announcements/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      const payload = await res.json();
      if (!res.ok) {
        alert(payload.error || "Failed to delete announcement");
        return;
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setOpenAnnMenu(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete announcement");
    }
  };

  const markAttendanceById = async attendanceId => {
    // optimistic UI update: assume mark will succeed to give immediate feedback
    setMarkedAttendanceIds(prev => ({ ...prev, [attendanceId]: true }));
    try {
      const res = await fetch(apiUrl(`/api/attendance/${attendanceId}/mark`), { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        // if server says 'already' leave it marked; otherwise revert optimistic update and show error
        if (payload && payload.error && payload.error.toLowerCase().includes('already')) {
          return;
        }
        setMarkedAttendanceIds(prev => { const copy = { ...prev }; delete copy[attendanceId]; return copy; });
        alert((payload && payload.error) || 'Failed to mark attendance');
        return;
      }
      // success already reflected in UI
    } catch (err) {
      console.error(err);
      // revert optimistic update
      setMarkedAttendanceIds(prev => { const copy = { ...prev }; delete copy[attendanceId]; return copy; });
      alert('Failed to mark attendance');
    }
  };

  const parseAttendanceFromDesc = desc => {
    if (!desc) return { text: desc, attendanceId: null };
    const m = desc.match(/\[ATTENDANCE_ID:(\d+)\]/);
    if (m) {
      const id = Number(m[1]);
      let text = desc.replace(/\s*\[ATTENDANCE_ID:\d+\]/, '');
      // remove any appended " — Due: ..." that teacher creation might have added
      text = text.replace(/\s*—\s*Due:\s*[^\[]*/,'').trim();
      return { text, attendanceId: id };
    }
    return { text: desc, attendanceId: null };
  };
  // delete attendance (teacher only)
  const deleteAttendance = async attendanceId => {
    if (!(await window.customConfirm("Delete this attendance?"))) return;
    try {
      const res = await fetch(apiUrl(`/api/attendance/${attendanceId}`), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>null);
        alert((j && j.error) || 'Failed to delete attendance');
        return;
      }
      setAnnouncements(prev => prev.map(a => {
        const parsed = parseAttendanceFromDesc(a.description);
        if (parsed && parsed.attendanceId === attendanceId) {
          return { ...a, description: parsed.text };
        }
        return a;
      }));
      setAttendancesList(prev => Array.isArray(prev) ? prev.filter(x => x.id !== attendanceId) : prev);
      setMarkedAttendanceIds(prev => { const copy = { ...prev }; delete copy[attendanceId]; return copy; });
      setOpenAnnMenu(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete attendance');
    }
  };
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <main style={{ flex: 1 }}>
        <div className="announcement-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setFilterMode('all')} style={{ padding: '8px 12px', borderRadius: 8, border: filterMode === 'all' ? '1px solid #2563eb' : '1px solid #e6e6e6', background: filterMode === 'all' ? '#2563eb' : '#fff', color: filterMode === 'all' ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600 }}>All</button>
              <button onClick={() => setFilterMode('announcement')} style={{ padding: '8px 12px', borderRadius: 8, border: filterMode === 'announcement' ? '1px solid #2563eb' : '1px solid #e6e6e6', background: filterMode === 'announcement' ? '#2563eb' : '#fff', color: filterMode === 'announcement' ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600 }}>Announcement</button>
              <button onClick={() => setFilterMode('attendance')} style={{ padding: '8px 12px', borderRadius: 8, border: filterMode === 'attendance' ? '1px solid #2563eb' : '1px solid #e6e6e6', background: filterMode === 'attendance' ? '#2563eb' : '#fff', color: filterMode === 'attendance' ? '#fff' : '#111', cursor: 'pointer', fontWeight: 600 }}>Attendance</button>
            </div>
            <h1 className="text-4xl font-bold mb-6" style={{ margin: 0 }}>Announcements</h1>
          </div>
          {loading && <p>Loading announcements...</p>}
          {!loading && announcements.length === 0 && <p>No announcements yet.</p>}

          {/* compute visible announcements based on filter */}
          {(() => {
            const visibleAnnouncements = (announcements || []).filter(a => {
              try {
                const { attendanceId } = parseAttendanceFromDesc(a.description);
                if (filterMode === 'attendance') return !!attendanceId;
                if (filterMode === 'announcement') return !attendanceId;
                return true;
              } catch (e) {
                return filterMode !== 'attendance';
              }
            });
            if (!loading && visibleAnnouncements.length === 0) return <p>No items match this filter.</p>;
            return visibleAnnouncements.map(a => {
              const comments = Array.isArray(a.comments) ? a.comments : [];
              return (
                <div className="announcement-card" key={a.id}>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="module-more-btn"
                      onClick={() => setOpenAnnMenu(prev => prev === a.id ? null : a.id)}
                      aria-label="announcement menu"
                      title="Actions"
                    />
                    {openAnnMenu === a.id && (
                      <div className="module-dropdown">
                        {(a.teacherEmail === currentEmail || user?.role === 'teacher' || user?.role === 'superteacher') && (
                          <>
                            <div className="module-dropdown-item" onClick={() => openEditAnnouncement(a)}>✏️ Edit</div>
                            <div className="module-dropdown-item module-dropdown-delete" onClick={() => deleteAnnouncement(a.id)}>🗑️ Delete</div>
                          </>
                        )}
                        {(() => {
                          const { attendanceId } = parseAttendanceFromDesc(a.description);
                          if (attendanceId && (user?.role === 'teacher' || user?.role === 'superteacher')) {
                            return <div className="module-dropdown-item module-dropdown-delete" onClick={() => deleteAttendance(attendanceId)}>🗑️ Delete Attendance</div>;
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    <div className="announcement-header">
                              <Avatar src={a.authorPicture || undefined} name={a.username || (a.teacherEmail && teachersMap[a.teacherEmail] && (teachersMap[a.teacherEmail].username || teachersMap[a.teacherEmail].name)) || (a.teacherEmail?.split?.('@')?.[0] ?? a.teacherEmail)} email={a.teacherEmail} className="announcement-avatar" />
                              <div className="announcement-meta">
                                <p>{a.username || (a.teacherEmail && teachersMap[a.teacherEmail] && (teachersMap[a.teacherEmail].username || teachersMap[a.teacherEmail].name)) || (a.teacherEmail?.split?.('@')?.[0] ?? a.teacherEmail)}</p>
                                <p>{timeAgo(new Date(a.createdAt))}</p>
                              </div>
                            </div>

                    <div className="announcement-body">
                      {
                        (() => {
                          const { text, attendanceId } = parseAttendanceFromDesc(a.description);
                          return (
                            <>
                              <pre className="announcement-text">{text}</pre>
                              {a.filePath && (() => {
                                const raw = String(a.filePath || '');
                                const fileName = a.displayFileName || raw.split(/[/\\]/).pop() || raw;
                                const ext = (fileName.split('.').pop() || '').toLowerCase();
                                const cleaned = raw.replace(/^[/\\]+/, '').replace(/\\/g, '/');
                                const fileUrl = cleaned.includes('/') ? apiUrl(`/${cleaned}`) : apiUrl(`/uploads/announcements/${cleaned}`);
                                if (ext === "pdf") {
                                  return (
                                    <div className="gc-pdf-card" style={{ marginTop: 8 }}>
                                      <iframe src={fileUrl} className="gc-pdf-preview" title={fileName} />
                                      <div className="gc-pdf-info">
                                        <p className="gc-pdf-name">{fileName}</p>
                                        <a href={fileUrl} target="_blank" rel="noreferrer" download={fileName} className="gc-open-btn">Open</a>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="gc-pdf-card" style={{ marginTop: 8 }}>
                                    <div className="gc-pdf-preview">
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }}>📄</div>
                                    </div>
                                    <div className="gc-pdf-info">
                                      <p className="gc-pdf-name">{fileName}</p>
                                      <a href={fileUrl} target="_blank" rel="noreferrer" download={fileName} className="gc-open-btn">Open</a>
                                    </div>
                                  </div>
                                );
                              })()}
                              {attendanceId && user?.role !== 'teacher' && (
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                  {(() => {
                                    const att = attendancesList.find(x => x.id === attendanceId);
                                    const due = att && att.dueDate ? new Date(att.dueDate) : null;
                                    const pastDue = due ? (Date.now() > due.getTime()) : false;
                                    if (!markedAttendanceIds[attendanceId]) {
                                      if (pastDue) {
                                        return <button className="attendance-btn" disabled style={{ background: '#ef4444' }}>Time's Up</button>;
                                      }
                                      return <button className="attendance-btn" style={{ background: '#0ea5e9' }} onClick={() => markAttendanceById(attendanceId)}>Present</button>;
                                    }
                                    return <button className="attendance-badge" disabled>PRESENT</button>;
                                  })()}

                                  {(() => {
                                    const att = attendancesList.find(x => x.id === attendanceId);
                                    if (att && att.dueDate) {
                                      const parts = formatDueParts(att.dueDate);
                                      if (!parts) return null;
                                      if (parts.status === 'timesUp') return <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 600 }}>{parts.label}</div>;
                                      if (parts.status === 'relative') return <div style={{ fontSize: '0.9rem', color: '#374151' }}>{`(${parts.label}) ${new Date(att.dueDate).toLocaleString()}`}</div>;
                                      if (parts.status === 'timeOnly') return <div style={{ fontSize: '0.9rem', color: '#374151' }}>{parts.timePart}</div>;
                                      if (parts.status === 'date') return (
                                        <div style={{ fontSize: '0.9rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <span>{`Due on ${parts.datePart}`}</span>
                                          {parts.timePart && <span style={{ fontWeight: 600, color: '#374151' }}>{parts.timePart}</span>}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </>
                          );
                        })()
                      }
                    </div>
                  </div>

            <div className="announcement-comments-list">
              {(Array.isArray(a.comments) ? a.comments.slice().sort((x,y)=> new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()) : []).map(c => (
                <div className="gc-comment" key={c.id}>
                  <Avatar src={c.authorEmail === currentEmail ? (user && user.picture) : (c.authorPicture || (teachersMap[c.authorEmail] && teachersMap[c.authorEmail].picture))} name={c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName} email={c.authorEmail} className="gc-comment-avatar" />
                  <div className="gc-comment-body">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <p className="gc-comment-author">{c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName}</p>
                      <p className="gc-comment-time">{timeAgo(new Date(c.createdAt))}</p>
                      {c.updatedAt && new Date(c.updatedAt) > new Date(c.createdAt) && <span style={{ fontSize: '0.85rem', color: '#999' }}>(edited)</span>}
                    </div>

                    {editingCommentId === c.id ? (
                      <>
                        <textarea className="gc-comment-input" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} style={{ marginTop: 8, marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="gc-send-btn" onClick={() => submitEditComment(a.id)} style={{ background: '#16a34a', fontSize: '0.9rem' }}>Save</button>
                          <button className="gc-send-btn" onClick={() => setEditingCommentId(null)} style={{ background: '#6b7280', fontSize: '0.9rem' }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <p className="gc-comment-text">{c.text}</p>
                    )}
                  </div>

                  {(c.authorEmail === currentEmail || user?.role === "teacher" || user?.role === "superteacher") && (
                    <>
                      <button className="module-more-btn" onClick={() => setOpenCommentMenu(prev => prev === c.id ? null : c.id)}>⋮</button>
                      {openCommentMenu === c.id && (
                        <div className="module-dropdown" style={{ right: 12, top: 28 }}>
                          {c.authorEmail === currentEmail && <div className="module-dropdown-item" onClick={() => startEditComment(c)}>✏️ Edit</div>}
                          <div className="module-dropdown-item module-dropdown-delete" onClick={() => deleteComment(a.id, c.id)}>🗑️ Delete</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="announcement-comment">
              <Avatar src={user?.picture} name={user?.username || user?.name || ""} email={currentEmail} className="gc-comment-avatar small" />
              <input className="announcement-input" placeholder="Add a comment…" value={commentInputs[a.id] || ""} onChange={e => setCommentInputs(prev => ({ ...prev, [a.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addComment(a.id); }} />
              <button className="gc-send-btn" onClick={() => addComment(a.id)} title="Send comment">➤</button>
            </div>

                </div>
              );
            });
          })()}

          {showEditAnnModal && (
            <div className="modal-overlay" onClick={() => setShowEditAnnModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">Edit Announcement</h2>
                <div className="modal-form">
                  <label>Description:</label>
                  <textarea value={editAnnText} onChange={e => setEditAnnText(e.target.value)} className="announcement-edit-box" />
                </div>
                <div className="modal-actions">
                  <button className="modal-btn cancel" onClick={() => setShowEditAnnModal(false)}>Cancel</button>
                  <button className="modal-btn create" onClick={submitEditAnnouncement}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <RightSidebar />
    </div>
  );
}