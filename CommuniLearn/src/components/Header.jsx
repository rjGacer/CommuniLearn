import { Bell } from "lucide-react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import NotificationDropdown from "./NotificationDropdown";

export default function Header() {
  const { user } = useAuth() || {};
  const rawRole = (user && user.role) ? String(user.role) : 'guest';
  const roleLabel = rawRole ? (String(rawRole).charAt(0).toUpperCase() + String(rawRole).slice(1)) : 'Guest';
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const ddRef = useRef();

  const storageKey = `recentViewedItems_${(user && user.email) ? user.email : 'guest'}`;

  // compute new count based on per-user storage like RightSidebar
  const computeNewCount = (combined) => {
    try {
      const raw = localStorage.getItem(storageKey);
      const viewed = raw ? JSON.parse(raw) : [];
      let c = 0;
      for (const it of combined || []) {
        const key = `${it.type}-${it.id}`;
        if (!viewed.includes(key)) c++;
      }
      return c;
    } catch (e) { return 0; }
  };

  const fetchRecent = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const [annRes, modRes, quizResStudent, quizResTeacher, teacherRes] = await Promise.all([
      fetch('/api/announcements', { headers }).then(r=> r.ok ? r.json() : []).catch(()=>[]),
        fetch('/api/modules/student', { headers }).then(r=> r.ok ? r.json() : []).catch(()=>[]),
        fetch('/api/quizzes/student', { headers }).then(r=> r.ok ? r.json() : []).catch(()=>[]),
        fetch('/api/quizzes/teacher', { headers }).then(r=> r.ok ? r.json() : []).catch(()=>[]),
        fetch('/api/auth/teachers', { headers }).then(r=> r.ok ? r.json() : []).catch(()=>[])
      ]);

      const anns = Array.isArray(annRes) ? annRes.map(a => ({ id: a.id, title: a.title || (a.description||'Announcement').slice(0,80), created: a.createdAt ? new Date(a.createdAt).getTime() : (a.updatedAt? new Date(a.updatedAt).getTime(): Date.now()), type: 'Announcement' })) : [];
      const mds = Array.isArray(modRes) ? modRes.map(m => ({ id: m.id, title: m.title || 'Module', created: m.createdAt ? new Date(m.createdAt).getTime() : (m.updatedAt? new Date(m.updatedAt).getTime(): Date.now()), type: 'Module' })) : [];
      const qzs = [];
      const pushQuiz = (q) => { if (!q||!q.id) return; qzs.push({ id: q.id, title: q.title||'Quiz', created: q.createdAt ? new Date(q.createdAt).getTime() : (q.updatedAt? new Date(q.updatedAt).getTime(): Date.now()), type: 'Quiz' }); };
      if (Array.isArray(quizResStudent)) quizResStudent.forEach(pushQuiz);
      if (Array.isArray(modRes)) modRes.forEach(m => { if (Array.isArray(m.quizzes)) m.quizzes.forEach(pushQuiz); });
      if (Array.isArray(quizResTeacher)) { if (quizResTeacher.length && Array.isArray(quizResTeacher[0].quizzes)) { quizResTeacher.forEach(m => { if (Array.isArray(m.quizzes)) m.quizzes.forEach(pushQuiz); }); } else quizResTeacher.forEach(pushQuiz); }
      const merged = [...anns, ...mds, ...qzs];
      // sort by created desc
      merged.sort((a,b)=> (b.created||0)-(a.created||0));
      // dedupe by type-id (keep first/latest)
      const unique = [];
      const seen = new Set();
      for (const it of merged) {
        const key = `${it.type}-${it.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(it);
        }
      }
      setItems(unique.slice(0,10));
      setNewCount(computeNewCount(unique));
    } catch (e) {
      console.error('Failed to fetch recent for notifications', e);
    }
  };

  useEffect(() => { fetchRecent(); const onRecent = () => fetchRecent(); window.addEventListener('recentUpdated', onRecent); window.addEventListener('storage', (e)=>{ if (e && e.key && e.key.startsWith('recentViewedItems_')) fetchRecent(); }); return ()=>{ window.removeEventListener('recentUpdated', onRecent); }; }, []);

  // mark a single item as viewed (do not mark all at once)
  const markViewedSingle = (it) => {
    try {
      const key = `${it.type}-${it.id}`;
      const raw = localStorage.getItem(storageKey);
      const viewed = raw ? JSON.parse(raw) : [];
      const cur = new Set(viewed || []);
      cur.add(key);
      const arr = Array.from(cur);
      localStorage.setItem(storageKey, JSON.stringify(arr));
      try { window.dispatchEvent(new Event('recentViewedItemsUpdated')); } catch(e){}
      // decrement local newCount if present
      setNewCount((n) => Math.max(0, n - 1));
    } catch (e) {
      console.error('markViewedSingle error', e);
    }
  };

  const handleItemClick = (it) => {
    try {
      // mark viewed and navigate similar to RightSidebar
      markViewedSingle(it);
      const isTeacher = (user && (user.role || '').toString().toLowerCase() === 'teacher') || (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.startsWith('/teacher'));
      if (it.type === 'Announcement') { navigate((isTeacher ? '/teacher/announcements' : '/student/announcements') + (it.id ? `?id=${it.id}` : '')); setOpen(false); return; }
      if (it.type === 'Module') { navigate(`${isTeacher ? '/teacher/module' : '/student/module'}/${it.id}`); setOpen(false); return; }
      if (it.type === 'Quiz') { navigate(isTeacher ? `/teacher/quiz/${it.id}/view` : `/student/quiz/${it.id}`); setOpen(false); return; }
      // fallback: just close
      setOpen(false);
    } catch (e) {
      console.error('handleItemClick error', e);
    }
  };


  return /*#__PURE__*/_jsxs("header", {
    className: "header",
    children: [/*#__PURE__*/_jsx("div", {
      style: {
        fontWeight: "600"
      },
      children: " "
    }), /*#__PURE__*/_jsxs("div", {
      style: {
        display: "flex",
        gap: "1rem",
        alignItems: "center"
      },
        children: [/*#__PURE__*/_jsxs("div", {
        style: { position: 'relative' },
        children: [/*#__PURE__*/_jsx("button", {
          className: "icon-btn",
          onClick: () => { setOpen(o=>!o); },
          children: /*#__PURE__*/_jsx(Bell, { size: 20 })
        }), newCount > 0 && /*#__PURE__*/_jsx("span", { className: "notif-badge", children: newCount }), open && /*#__PURE__*/_jsx(NotificationDropdown, { items: items, onClose: () => setOpen(false), onItemClick: handleItemClick })]
      }), /*#__PURE__*/_jsx("button", {
        className: "icon-btn profile-btn",
        title: roleLabel,
        "aria-label": `Profile (${roleLabel})`,
        onClick: () => navigate('/profile'),
        children: /*#__PURE__*/_jsx(Avatar, {
          name: user ? user.name : undefined,
          email: user ? user.email : undefined,
          className: "header-avatar",
          alt: "Profile"
        })
      })]
    })]
  });
}