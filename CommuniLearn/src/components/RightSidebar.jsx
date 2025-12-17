import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RightSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calDate, setCalDate] = useState(new Date());
  const [hovered, setHovered] = useState(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentModules, setRecentModules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  // store viewed keys per-user so badges are unique to each account
  const storageKey = `recentViewedItems_${(user && user.email) ? user.email : 'guest'}`;
  const [viewedKeys, setViewedKeys] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // when the authenticated user changes, reload the viewed keys for that user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setViewedKeys(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setViewedKeys([]);
    }
  }, [storageKey]);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    // determine role from authenticated user (fallback to URL if not available)
    const isTeacher = (user && (user.role || '').toString().toLowerCase() === 'teacher') || (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.startsWith('/teacher'));

    const sortDesc = arr => arr.slice().sort((a,b)=>{ if(!a.created && !b.created) return 0; if(!a.created) return 1; if(!b.created) return -1; return b.created - a.created; });

    async function loadRecent(){
      try{
        if(!mounted) return;
        setLoadingRecent(true);
        const annUrl = '/announcements';
        // Use student-facing endpoints for recent items so the sidebar shows content
        // created across the system (not limited to the current teacher view).
        const modUrl = '/api/modules/student';
        const quizUrl = '/api/quizzes/student';
        const teacherUrl = '/api/auth/teachers';

        const [annRes, modRes, quizResStudent, quizResTeacher, teacherRes] = await Promise.all([
          api.get(annUrl, { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(()=>[]),
          api.get(modUrl, { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(()=>[]),
          api.get(quizUrl, { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(()=>[]),
          api.get('/quizzes/teacher', { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(()=>[]),
          api.get(teacherUrl, { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(()=>[])
        ]);

        // include attendance-linked announcements but strip the attendance token from the displayed title
        const anns = Array.isArray(annRes) ? annRes.filter(a => a.teacherEmail).map(a => {
          const rawDesc = String(a.description || '');
          // extract any appended "— Due: ..." clause (stop before any attendance token)
          const dueMatch = rawDesc.match(/—\s*Due:\s*([^\[]*)/);
          const dueRaw = dueMatch ? dueMatch[1].trim() : null;
          // remove any appended "— Due: ..." text and trailing attendance token before showing title
          const withoutDue = rawDesc.replace(/\s*—\s*Due:\s*[^\[]*/,'');
          const cleaned = withoutDue.replace(/\s*\[ATTENDANCE_ID:\d+\]\s*$/,'').trim();
          const title = a.title || (cleaned ? cleaned.slice(0,60) : 'Announcement');

          // try to parse and normalize the due text; handle time-only (1970) by rolling to next occurrence
          let dueDate = null;
          if (dueRaw) {
            const parsed = new Date(dueRaw);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() !== 1970) {
              dueDate = parsed;
            } else {
              // attempt to parse time-only like "5:00:00 AM" or "9:00 PM"
              const timeMatch = dueRaw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
              if (timeMatch) {
                const now = new Date();
                let hour = parseInt(timeMatch[1], 10);
                const minute = parseInt(timeMatch[2], 10);
                const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                const ampm = timeMatch[4];
                if (ampm) {
                  const am = String(ampm).toLowerCase().startsWith('a');
                  if (am && hour === 12) hour = 0;
                  if (!am && hour !== 12) hour = hour + 12;
                }
                const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second, 0);
                if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
                dueDate = candidate;
              }
            }
          }

          return { id: a.id, title, created: a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null), raw: a, type: 'Announcement', dueDate };
        }) : [];
        const mds = Array.isArray(modRes) ? modRes.filter(m => m.teacherEmail).map(m => ({ id: m.id, title: m.title || 'Module', created: m.createdAt ? new Date(m.createdAt) : (m.updatedAt ? new Date(m.updatedAt) : null), raw: m, type: 'Module' })) : [];
        // Combine quizzes from both student and teacher endpoints and flatten module->quizzes if needed
        const qzs = [];
        const pushQuiz = (q) => {
          if (!q || !q.id) return;
          qzs.push({ id: q.id, title: q.title || 'Quiz', created: q.createdAt ? new Date(q.createdAt) : (q.updatedAt ? new Date(q.updatedAt) : null), dueDate: q.dueDate ? new Date(q.dueDate) : null, raw: q, type: 'Quiz' });
        };

        // student endpoint returns quizzes array
        if (Array.isArray(quizResStudent)) {
          for (const q of quizResStudent) {
            pushQuiz(q);
          }
        }

        // also extract any quizzes included inside modules returned by modules/student endpoint
        if (Array.isArray(modRes)) {
          for (const mod of modRes) {
            if (Array.isArray(mod.quizzes)) {
              for (const q of mod.quizzes) pushQuiz(q);
            }
          }
        }

        // teacher endpoint returns modules with included quizzes — flatten them
        if (Array.isArray(quizResTeacher)) {
          if (quizResTeacher.length && quizResTeacher[0] && Array.isArray(quizResTeacher[0].quizzes)) {
            for (const mod of quizResTeacher) {
              if (!Array.isArray(mod.quizzes)) continue;
              for (const q of mod.quizzes) pushQuiz(q);
            }
          } else {
            for (const q of quizResTeacher) pushQuiz(q);
          }
        }

        // dedupe quizzes by id (keep first occurrence)
        const seen = new Set();
        const uniqueQzs = [];
        for (const q of qzs) {
          if (seen.has(q.id)) continue;
          seen.add(q.id);
          uniqueQzs.push(q);
        }
        // Do not include teacher account creations in the recent feed; the sidebar shows modules/announcements/activities only.
        const tchs = [];

        if(!mounted) return;
        setRecentAnnouncements(sortDesc(anns));
        setRecentModules(sortDesc(mds));
        setRecentActivities(sortDesc(uniqueQzs));
        setRecentTeachers(sortDesc(tchs));
      }catch(err){
        if(mounted){ setRecentAnnouncements([]); setRecentModules([]); setRecentActivities([]); setRecentTeachers([]); }
      }finally{
        if(mounted) setLoadingRecent(false);
      }
    }

    // initial load
    loadRecent();

    // refresh when window gains focus (helps pick up creations made in other tabs)
    const onFocus = () => loadRecent();
    window.addEventListener('focus', onFocus);

    // listen for storage events from other tabs (key: recentUpdated)
    const onStorage = (e) => { if (e && e.key === 'recentUpdated') loadRecent(); };
    window.addEventListener('storage', onStorage);

    // listen for an in-tab custom event dispatched after creating content
    const onRecentUpdated = () => loadRecent();
    window.addEventListener('recentUpdated', onRecentUpdated);

    // periodic refresh (every 15s) to pick up newly created items as fallback
    const intId = setInterval(() => { loadRecent(); }, 15000);

    return () => { mounted = false; window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onStorage); window.removeEventListener('recentUpdated', onRecentUpdated); clearInterval(intId); };
  }, []);

  // persist viewed items in localStorage so badges remain until clicked
  const markViewed = (key) => {
    try {
      const cur = new Set(viewedKeys || []);
      if (cur.has(key)) return;
      cur.add(key);
      const arr = Array.from(cur);
      setViewedKeys(arr);
      // persist under the per-user storage key
      localStorage.setItem(storageKey, JSON.stringify(arr));
      // notify other tabs
      try { window.dispatchEvent(new Event('recentViewedItemsUpdated')); } catch (e) {}
    } catch (e) {
      console.error('markViewed error', e);
    }
  };

  useEffect(() => {
    // keep viewedKeys in sync when other tabs update localStorage
    const onStorage = (e) => {
      if (!e) return;
      // only respond to changes for the current user's storage key
      if (e.key === storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          setViewedKeys(raw ? JSON.parse(raw) : []);
        } catch (err) {}
      }
    };
    const onCustom = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        setViewedKeys(raw ? JSON.parse(raw) : []);
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('recentViewedItemsUpdated', onCustom);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('recentViewedItemsUpdated', onCustom); };
  }, []);
  const combinedRecent = useMemo(()=>{
    const merged = [...recentAnnouncements, ...recentModules, ...recentActivities, ...recentTeachers];
    merged.sort((a,b)=>{ if(!a.created && !b.created) return 0; if(!a.created) return 1; if(!b.created) return -1; return b.created - a.created; });
    return merged;
  }, [recentAnnouncements, recentModules, recentActivities, recentTeachers]);

  // number of unviewed (new) items for the current user
  const newCount = useMemo(() => {
    try {
      if (!combinedRecent || !combinedRecent.length) return 0;
      let c = 0;
      for (const it of combinedRecent) {
        const key = `${it.type}-${it.id}`;
        if (!viewedKeys.includes(key)) c++;
      }
      return c;
    } catch (e) { return 0; }
  }, [combinedRecent, viewedKeys]);

  

  function startOfWeek(d){ const day = d.getDay(); const diff = (day+6)%7; const dt = new Date(d); dt.setDate(d.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
  function getCalendarWeeks(date){ const weeks=[]; const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1); let start = startOfWeek(firstOfMonth); for(let w=0; w<6; w++){ const week=[]; for(let d=0; d<7; d++){ const day = new Date(start); day.setDate(start.getDate() + w*7 + d); week.push(day); } weeks.push(week); } return weeks; }
  const weeks = getCalendarWeeks(calDate);
  function prevMonth(){ setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()-1, 1)); }
  function nextMonth(){ setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()+1, 1)); }
  function isToday(d){ const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate(); }

  function handleMouseEnter(e, day){
    const iso = day.toISOString().slice(0,10);
    setHovered({ day, pos: { x: e.clientX, y: e.clientY }, loading: true, events: [] });
    try {
      const token = localStorage.getItem('token');
      // If there's no token and no authenticated user, skip the fetch to avoid 401 noise
      if (!token && !user) {
        setHovered(prev => prev ? { ...prev, loading: false, events: [] } : prev);
        return;
      }
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      api.get('/announcements', { headers })
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : [];
          const list = Array.isArray(data) ? data.filter(a => { const d = a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null); return d ? d.toISOString().slice(0,10)===iso : false; }) : [];
          setHovered(prev=>{ if(!prev) return prev; if(prev.day.toDateString() !== day.toDateString()) return prev; return { ...prev, loading:false, events: list }; });
        })
        .catch(()=> setHovered(prev=> prev ? { ...prev, loading:false, events: [] } : prev));
    } catch (err) {
      setHovered(prev=> prev ? { ...prev, loading:false, events: [] } : prev);
    }
  }
  function handleMouseLeave(){ setHovered(null); }

  return (
    <aside style={{ width: 320 }}>
      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>{calDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <div>
            <button className="view-all-btn" onClick={prevMonth} style={{ marginRight: 6 }}>‹</button>
            <button className="view-all-btn" onClick={nextMonth}>›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 12, color: '#666' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div style={{ marginTop: 8 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {week.map((day, di) => {
                const out = day.getMonth() !== calDate.getMonth();
                const today = isToday(day);
                return (
                  <div key={di}
                    onMouseEnter={(e)=>handleMouseEnter(e, day)}
                    onMouseLeave={handleMouseLeave}
                    style={{ padding: 6, borderRadius: 4, background: out ? '#fafafa' : '#fff', border: today ? '1px solid #0078d4' : '1px solid #eee', cursor: 'default' }}>
                    <div style={{ fontSize: 13, color: out ? '#999' : '#222' }}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {hovered && (
          <div style={{ marginTop: 8, borderTop: '1px dashed #eee', paddingTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{hovered.day.toDateString()}</div>
            {hovered.loading ? <div style={{ fontSize: 13 }}>Loading...</div> : (
              hovered.events.length ? hovered.events.map(ev => (
                <div key={ev.id} style={{ fontSize: 13, marginTop: 6 }}>{ev.title || ev.description}</div>
              )) : <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>No events</div>
            )}
          </div>
        )}
      </div>
      
      {/* Removed global "Your work" card — shown only on StudentQuizTake activity pages */}

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Recent</strong>
          <div style={{ color: '#666', fontSize: 13 }}>{newCount} new • {combinedRecent.length} total</div>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {loadingRecent ? (
            <div style={{ color: '#6b7280' }}>Loading…</div>
          ) : combinedRecent.length ? (
            combinedRecent.map((it, idx) => {
                const isTeacher = (user && (user.role || '').toString().toLowerCase() === 'teacher') || (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.startsWith('/teacher'));
                const displayType = (isTeacher && it.type === 'Quiz') ? 'Activity' : it.type;
                const key = `${it.type}-${it.id}`;
                const isNew = !viewedKeys.includes(key);
                return (
                  <div key={`${it.type}-${it.id}-${idx}`} className="recent-item" style={{ padding: '8px 0', borderBottom: '1px solid #f1f1f1', cursor: 'pointer' }} onClick={() => {
                    // mark viewed immediately so badge disappears on click
                    try { markViewed(key); } catch (e) {}
                    if (it.type === 'Announcement') { navigate((isTeacher ? '/teacher/announcements' : '/student/announcements') + (it.id ? `?id=${it.id}` : '')); return; }
                    if (it.type === 'Module') { navigate(`${isTeacher ? '/teacher/module' : '/student/module'}/${it.id}`); return; }
                    if (it.type === 'Quiz') { navigate(isTeacher ? `/teacher/quiz/${it.id}/view` : `/student/quiz/${it.id}`); return; }
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{it.title}</div>
                      {isNew && <div className="recent-new-badge">New</div>}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                      {displayType}{it.created ? ` • ${it.created.toLocaleString()}` : ''}
                    </div>
                    {it.dueDate && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        Due: {it.dueDate.toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                );
            })
          ) : (
            <div style={{ color: '#6b7280' }}>No recent items</div>
          )}
        </div>
      </div>
    </aside>
  );
}