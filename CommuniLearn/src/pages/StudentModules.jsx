import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RightSidebar from "../components/RightSidebar";
import api from '../services/api';
export default function StudentModules() {
  const [modules, setModules] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();
  // calendar + recent state (same behavior as dashboard)
  const [calDate, setCalDate] = useState(new Date());
  const [hovered, setHovered] = useState(null); // { day, pos, loading, events }
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentModules, setRecentModules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const toggleMenu = id => setOpenMenuId(prev => prev === id ? null : id);

  useEffect(() => {
    const handleDocClick = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest('.module-menu-wrapper') || target.closest('.module-dropdown')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await api.get('/modules/student', { headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
        const data = resp && resp.data ? resp.data : [];
        setModules(Array.isArray(data) ? data : []);
      } catch (e) {
        setModules([]);
      }
    };
    load();
  }, []);

  // Fetch recent items (announcements, modules, quizzes, teachers)
  useEffect(() => {
    let mounted = true;
    setLoadingRecent(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const pAnn = api.get('/announcements', { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []);
    const pMods = api.get('/modules/student', { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []);
    const pQuizzes = api.get('/quizzes/student', { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []);
    const pTeachers = api.get('/auth/teachers', { headers }).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []);

    Promise.all([pAnn, pMods, pQuizzes, pTeachers]).then(([ann, mods, quizzes, teachers]) => {
      if (!mounted) return;
      const anns = Array.isArray(ann) ? ann.filter(a => a.teacherEmail).map(a => ({ id: a.id, title: a.title || (a.description ? String(a.description).slice(0,60) : 'Announcement'), created: a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null), raw: a, type: 'Announcement' })) : [];
      const mds = Array.isArray(mods) ? mods.filter(m => m.teacherEmail).map(m => ({ id: m.id, title: m.title || 'Module', created: m.createdAt ? new Date(m.createdAt) : (m.updatedAt ? new Date(m.updatedAt) : null), raw: m, type: 'Module' })) : [];
      const qzs = Array.isArray(quizzes) ? quizzes.filter(q => q.teacherEmail).map(q => ({ id: q.id, title: q.title || 'Quiz', created: q.createdAt ? new Date(q.createdAt) : (q.updatedAt ? new Date(q.updatedAt) : null), dueDate: q.dueDate ? new Date(q.dueDate) : null, raw: q, type: 'Quiz' })) : [];
      const tchs = Array.isArray(teachers) ? teachers.map(t => ({ id: t.id, title: t.name || t.email, created: t.createdAt ? new Date(t.createdAt) : null, raw: t, type: 'Teacher' })) : [];

      const sortDesc = arr => arr.slice().sort((a,b)=>{ if(!a.created && !b.created) return 0; if(!a.created) return 1; if(!b.created) return -1; return b.created - a.created; });

      setRecentAnnouncements(sortDesc(anns));
      setRecentModules(sortDesc(mds));
      setRecentActivities(sortDesc(qzs));
      setRecentTeachers(sortDesc(tchs));
    }).catch(()=>{
      if(mounted){ setRecentAnnouncements([]); setRecentModules([]); setRecentActivities([]); setRecentTeachers([]); }
    }).finally(()=>{ if(mounted) setLoadingRecent(false); });

    return ()=>{ mounted = false };
  }, []);

  // combined recent
  const combinedRecent = useMemo(()=>{
    const merged = [...recentAnnouncements, ...recentModules, ...recentActivities, ...recentTeachers];
    merged.sort((a,b)=>{ if(!a.created && !b.created) return 0; if(!a.created) return 1; if(!b.created) return -1; return b.created - a.created; });
    return merged;
  }, [recentAnnouncements, recentModules, recentActivities, recentTeachers]);

  // calendar helpers
  function startOfWeek(d){ const day = d.getDay(); const diff = (day+6)%7; const dt = new Date(d); dt.setDate(d.getDate()-diff); dt.setHours(0,0,0,0); return dt; }
  function getCalendarWeeks(date){ const weeks=[]; const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1); let start = startOfWeek(firstOfMonth); for(let w=0; w<6; w++){ const week=[]; for(let d=0; d<7; d++){ const day = new Date(start); day.setDate(start.getDate() + w*7 + d); week.push(day); } weeks.push(week); } return weeks; }
  const weeks = getCalendarWeeks(calDate);
  function prevMonth(){ setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()-1, 1)); }
  function nextMonth(){ setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()+1, 1)); }
  function isToday(d){ const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate(); }

  // hover handlers (fetch announcements and filter by date)
  function handleMouseEnter(e, day){ const iso = day.toISOString().slice(0,10); setHovered({ day, pos: { x: e.clientX, y: e.clientY }, loading: true, events: [] }); api.get('/announcements').then(res => { const data = Array.isArray(res.data) ? res.data : []; const list = Array.isArray(data) ? data.filter(a=>{ const d = a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null); return d ? d.toISOString().slice(0,10)===iso : false; }) : []; setHovered(prev=>{ if(!prev) return prev; if(prev.day.toDateString() !== day.toDateString()) return prev; return { ...prev, loading:false, events: list }; }); }).catch(()=> setHovered(prev=> prev ? { ...prev, loading:false, events: [] } : prev)); }
  function handleMouseLeave(){ setHovered(null); }
  return (
    <div className="main-layout">
      <div className="dashboard-container">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="module-list">
              <div className="module-list-header">
                <div>
                  <h3 className="module-list-title">List of Modules</h3>
                  <div className="module-list-subtitle">Available course modules</div>
                </div>
                <button className="view-all-btn" onClick={() => navigate('/student/modules')}>View All</button>
              </div>

              <div style={{ display: 'flex', gap: 22, marginTop: 20, flexWrap: 'wrap' }}>
                {modules.map(m => (
                  <div className="module-card" key={m.id}>
                    <div className="module-menu-wrapper">
                      <button className="module-more-btn white" onClick={() => toggleMenu(m.id)}>⋮</button>
                      {openMenuId === m.id && (
                        <div className="module-dropdown">
                          <div className="module-dropdown-item" onClick={() => navigate(`/student/module/${m.id}`)}>View</div>
                          <div className="module-dropdown-item" onClick={() => alert(m.description || 'No description')}>Details</div>
                        </div>
                      )}
                    </div>
                    <div className="module-code">{m.title}</div>
                    <div className="module-desc">{m.description}</div>
                    <button className="module-view-btn" onClick={() => navigate(`/student/module/${m.id}`)}>View</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <RightSidebar />
        </div>
      </div>
    </div>
  );
}