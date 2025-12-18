import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiUrl } from "../config";
import "../css/teacher.css";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { timeAgo } from "../utils/timeAgo";

export default function TeacherModuleView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [moduleData, setModuleData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [teachersMap, setTeachersMap] = useState({});
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const userEmail = localStorage.getItem("email") ?? user?.email ?? "";

  useEffect(() => {
    loadModule();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadModule = async () => {
    try {
      const resp = await api.get(`/modules/${id}`);
      const data = resp.data;

      // enrich with teacher picture/name if available
      try {
        const tRes = await api.get("/auth/teachers");
        const tData = tRes.data;
        const teacher = Array.isArray(tData) && data.teacherEmail ? tData.find(t => t.email === data.teacherEmail) : null;
        const map = {};
        if (Array.isArray(tData)) {
          for (const t of tData) {
            if (t.email) map[t.email] = t;
          }
        }
        setTeachersMap(map);
        setModuleData({
          ...data,
          teacherPicture: teacher ? teacher.picture : data.picture || null,
          teacherName: teacher ? (teacher.username || teacher.name) : (data.teacherName || null),
          quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
        });
      } catch (e) {
        setModuleData({
          ...data,
          teacherPicture: data.picture || null,
          teacherName: data.teacherName || null,
          quizzes: Array.isArray(data.quizzes) ? data.quizzes : []
        });
      }
    } catch (err) {
      console.error("Error loading module:", err);
    }
  };

  const loadComments = async () => {
    try {
      const resp = await api.get(`/module-comments/${id}`);
      const data = resp.data;
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      await api.post(`/module-comments/${id}`, { text: newComment, moduleId: Number(id) });
      setNewComment("");
      loadComments();
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Error posting comment");
    }
  };

  const deleteComment = async (commentId) => {
    if (!(await window.customConfirm("Delete this comment?"))) return;
    try {
      await api.delete(`/module-comments/delete/${commentId}`);
      setMenuOpenId(null);
      loadComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Error deleting comment");
    }
  };

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
    setMenuOpenId(null);
  };

  const submitEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      await api.put(`/module-comments/${commentId}`, { text: editingCommentText });
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    } catch (err) {
      console.error("Error editing comment:", err);
      alert("Error editing comment");
    }
  };

  if (!moduleData) return <p>Loading...</p>;

  const teacherName = moduleData.teacherName || moduleData.teacherEmail?.split("@")[0] || moduleData.teacherEmail || 'Instructor';

  return (
    <div className="gc-module-page">
      <div className="gc-header">
        <div className="gc-header-left">
          <Avatar
            src={moduleData.teacherPicture || undefined}
            name={teacherName}
            email={moduleData.teacherEmail}
            className="gc-profile-circle"
          />
          <div>
            <h1 className="gc-title">{teacherName}</h1>
            <p className="gc-subtitle">{moduleData.teacherEmail}</p>
            {moduleData.createdAt && <p className="gc-date-small">Posted {timeAgo(moduleData.createdAt)}</p>}
          </div>
        </div>
      </div>

      <div className="gc-material-card">
        <h1 className="gc-section-title">{moduleData.title}</h1>
        <hr style={{ margin: "10px 0", opacity: 0.3 }} />
        {moduleData.description && <p style={{ marginBottom: "15px" }}>{moduleData.description}</p>}
        <hr style={{ margin: "10px 0", opacity: 0.3 }} />
        {!moduleData.documentPath && <p>No material uploaded.</p>}
        {moduleData.documentPath && (() => {
          const fileName = moduleData.documentPath.split("\\").pop()?.split("/").pop();
          const ext = fileName?.split(".").pop()?.toLowerCase();
          if (ext === "pdf") {
            return (
              <div className="gc-pdf-card">
                <iframe src={apiUrl(moduleData.documentPath)} className="gc-pdf-preview" />
                <div className="gc-pdf-info">
                  <p className="gc-pdf-name">{fileName}</p>
                  <a href={apiUrl(moduleData.documentPath)} target="_blank" className="gc-open-btn">Open</a>
                </div>
              </div>
            );
          }
          return (
            <div className="gc-pdf-card">
              <div className="gc-pdf-preview"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }}>📄</div></div>
              <div className="gc-pdf-info">
                <p className="gc-pdf-name">{fileName}</p>
                <a href={apiUrl(moduleData.documentPath)} target="_blank" className="gc-open-btn">Open</a>
              </div>
            </div>
          );
        })()}

        {(moduleData.videoPath || moduleData.mediaPath || moduleData.videoUrl || moduleData.mediaUrl) && (() => {
          const mediaPath = moduleData.videoPath || moduleData.mediaPath || null;
          const mediaUrl = moduleData.videoUrl || moduleData.mediaUrl || null;
          return (
            <div className="gc-media-card">
              {mediaPath && (() => {
                const fileName = String(mediaPath).split("\\").pop()?.split("/").pop();
                const ext = fileName?.split(".").pop()?.toLowerCase();
                if (ext === "mp4" || ext === "webm" || ext === "mkv") {
                  return <video src={apiUrl(mediaPath)} controls className="gc-pdf-preview" />;
                }
                if (ext === "mp3" || ext === "wav" || ext === "ogg") {
                  return <audio src={apiUrl(mediaPath)} controls className="gc-audio-preview" />;
                }
                return (
                  <div className="gc-pdf-card">
                    <div className="gc-pdf-preview"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 36 }}>📁</div></div>
                    <div className="gc-pdf-info">
                      <p className="gc-pdf-name">{fileName}</p>
                      <a href={apiUrl(mediaPath)} target="_blank" className="gc-open-btn">Open</a>
                    </div>
                  </div>
                );
              })()}

              {mediaUrl && (() => {
                const url = String(mediaUrl).trim();
                const ytMatch = url.match(/(?:youtube\.com.*(?:v=|\/embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
                if (ytMatch) {
                  const embed = `https://www.youtube.com/embed/${ytMatch[1]}`;
                  return <iframe src={embed} className="gc-pdf-preview" title="YouTube video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
                }
                const vMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
                if (vMatch) {
                  const embed = `https://player.vimeo.com/video/${vMatch[1]}`;
                  return <iframe src={embed} className="gc-pdf-preview" title="Vimeo video" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
                }
                if (url.match(/\.(mp3|wav|ogg)(?:\?.*)?$/i)) {
                  return <audio src={url} controls className="gc-audio-preview" />;
                }
                return <div style={{ marginTop: 8 }}><a href={url} target="_blank" rel="noreferrer" className="module-doc-link">{url}</a></div>;
              })()}
            </div>
          );
        })()}
      </div>

      <div className="gc-comments-section">
        <h3 className="gc-section-title">Class comments</h3>
        <div className="gc-comment-list">
          {comments.map(c => (
            <div className="gc-comment" key={c.id}>
              <Avatar
                src={c.authorEmail === userEmail ? (user && user.picture) : (c.authorPicture || (teachersMap[c.authorEmail] && teachersMap[c.authorEmail].picture))}
                name={c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName}
                email={c.authorEmail}
                className="gc-comment-avatar"
              />
              <div className="gc-comment-body">
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <p className="gc-comment-author">{c.username || (c.authorEmail && teachersMap[c.authorEmail] && (teachersMap[c.authorEmail].username || teachersMap[c.authorEmail].name)) || c.authorName}</p>
                  <p className="gc-comment-time">{timeAgo(c.createdAt)}</p>
                  {c.updatedAt && new Date(c.updatedAt) > new Date(c.createdAt) && <span style={{ fontSize: "0.85rem", color: "#999" }}>(edited)</span>}
                </div>

                {editingCommentId === c.id ? (
                  <>
                    <textarea className="gc-comment-input" value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} style={{ marginTop: 8, marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="gc-send-btn" onClick={() => submitEditComment(c.id)} style={{ background: "#16a34a", fontSize: "0.9rem" }}>Save</button>
                      <button className="gc-send-btn" onClick={() => setEditingCommentId(null)} style={{ background: "#6b7280", fontSize: "0.9rem" }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <p className="gc-comment-text">{c.text}</p>
                )}
              </div>

              {(userEmail === c.authorEmail || user?.role === "teacher" || user?.role === "superteacher") && (
                <div style={{ marginLeft: 8, position: "relative" }}>
                  <button className="module-more-btn" onClick={() => setMenuOpenId(prev => prev === c.id ? null : c.id)}>⋮</button>
                  {menuOpenId === c.id && (
                    <div className="module-dropdown" style={{ left: '100%', top: 28 }}>
                      {(userEmail === c.authorEmail || user?.role === 'teacher' || user?.role === 'superteacher') && (
                        <div className="module-dropdown-item" onClick={() => startEditComment(c)}>✏️ Edit</div>
                      )}
                      <div className="module-dropdown-item module-dropdown-delete" onClick={() => deleteComment(c.id)}>🗑️ Delete</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="gc-comment-input-row">
          <Avatar src={user?.picture} name={user?.name || userEmail.split('@')[0]} email={user?.email || userEmail} className="gc-comment-avatar small" />
          <input className="gc-comment-input" placeholder="Add class comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); postComment(); } }} />
          <button className="gc-send-btn" onClick={postComment}>➤</button>
        </div>
      </div>
    </div>
  );
}