import { useEffect, useState, useMemo } from "react";
import { apiUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import RightSidebar from "../components/RightSidebar";
import Avatar from "../components/Avatar";
export default function StudentDashboard() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [calDate, setCalDate] = useState(new Date());
  const [hovered, setHovered] = useState(null); // { day: Date, pos: {x,y}, loading: bool, events: [] }
  const navigate = useNavigate();
  const [recentModules, setRecentModules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]); // quizzes
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentTeachers, setRecentTeachers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    // Fetch student modules from backend; fall back to empty array on error
    let mounted = true;
    fetch(apiUrl('/api/modules/student'), {
      headers: {
        Authorization: localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : undefined
      }
    })
      .then(r => {
        if (!r.ok) throw new Error('network')
        return r.json();
      })
      .then(data => {
        if (mounted && Array.isArray(data)) setModules(data);
      })
      .catch(() => {
        if (mounted) setModules([]);
      });
    return () => { mounted = false };
  }, []);

  const toggleMenu = id => setOpenMenuId(prev => prev === id ? null : id);

  // Close module dropdown when clicking outside
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

  const combinedRecent = useMemo(() => {
    const merged = [
      ...recentAnnouncements.map(a => ({ ...a })),
      ...recentModules.map(m => ({ ...m })),
      ...recentActivities.map(q => ({ ...q })),
      ...recentTeachers.map(t => ({ ...t })),
    ];
    merged.sort((a, b) => {
      if (!a.created && !b.created) return 0;
      if (!a.created) return 1;
      if (!b.created) return -1;
      return b.created - a.created;
    });
    return merged;
  }, [recentAnnouncements, recentModules, recentActivities]);

  // Fetch recent items separately: announcements, modules, quizzes
  useEffect(() => {
    let mounted = true;
    setLoadingRecent(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: 'Bearer ' + token } : {};

    const pAnn = fetch(apiUrl('/api/announcements'), { headers }).then(r => r.ok ? r.json() : [] ).catch(() => []);
    const pMods = fetch(apiUrl('/api/modules/student'), { headers }).then(r => r.ok ? r.json() : [] ).catch(() => []);
    const pQuizzes = fetch(apiUrl('/api/quizzes/student'), { headers }).then(r => r.ok ? r.json() : [] ).catch(() => []);
    const pTeachers = fetch(apiUrl('/api/auth/teachers'), { headers }).then(r => r.ok ? r.json() : []).catch(() => []);

    Promise.all([pAnn, pMods, pQuizzes, pTeachers]).then(([ann, mods, quizzes, teachers]) => {
      if (!mounted) return;

      // Announcements: teacher-created only
      const anns = Array.isArray(ann) ? ann.filter(a => a.teacherEmail).map(a => ({
        id: a.id,
        title: a.title || (a.description ? String(a.description).slice(0, 60) : 'Announcement'),
        created: a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null),
        raw: a,
        type: 'Announcement'
      })) : [];

      // Modules: teacher-created only
      const mds = Array.isArray(mods) ? mods.filter(m => m.teacherEmail).map(m => ({
        id: m.id,
        title: m.title || 'Module',
        created: m.createdAt ? new Date(m.createdAt) : (m.updatedAt ? new Date(m.updatedAt) : null),
        raw: m,
        type: 'Module'
      })) : [];

      // Quizzes (activity): teacher-created only; include dueDate if present
      const qzs = Array.isArray(quizzes) ? quizzes.filter(q => q.teacherEmail).map(q => ({
        id: q.id,
        title: q.title || 'Quiz',
        created: q.createdAt ? new Date(q.createdAt) : (q.updatedAt ? new Date(q.updatedAt) : null),
        dueDate: q.dueDate ? new Date(q.dueDate) : null,
        raw: q,
        type: 'Quiz'
      })) : [];

      // Sort each by created desc (keep all items)
      const sortDesc = arr => arr.slice().sort((a,b) => {
        if (!a.created && !b.created) return 0;
        if (!a.created) return 1;
        if (!b.created) return -1;
        return b.created - a.created;
      });

      setRecentAnnouncements(sortDesc(anns));
      setRecentModules(sortDesc(mds));
      setRecentActivities(sortDesc(qzs));

      // Teachers: map to creation events
      const tchs = Array.isArray(teachers) ? teachers.map(t => ({
        id: t.id,
        title: t.name || t.email,
        created: t.createdAt ? new Date(t.createdAt) : null,
        raw: t,
        type: 'Teacher'
      })) : [];
      setRecentTeachers(tchs);
    }).catch(() => {
      if (mounted) {
        setRecentAnnouncements([]);
        setRecentModules([]);
        setRecentActivities([]);
        setRecentTeachers([]);
      }
    }).finally(() => { if (mounted) setLoadingRecent(false); });

    return () => { mounted = false };
  }, []);

  // Hover handlers: fetch events for hovered day and show tooltip
  function handleMouseEnter(e, day) {
    const iso = day.toISOString().slice(0, 10);
    setHovered({ day, pos: { x: e.clientX, y: e.clientY }, loading: true, events: [] });
    // Fetch all announcements and filter by date (backend doesn't support date query)
    fetch(apiUrl('/api/announcements'))
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data.filter(a => {
          const d = a.createdAt ? new Date(a.createdAt) : (a.updatedAt ? new Date(a.updatedAt) : null);
          return d ? d.toISOString().slice(0,10) === iso : false;
        }) : [];
        setHovered(prev => {
          if (!prev) return prev;
          if (prev.day.toDateString() !== day.toDateString()) return prev;
          return { ...prev, loading: false, events: list };
        });
      })
      .catch(() => {
        setHovered(prev => prev ? { ...prev, loading: false, events: [] } : prev);
      });
  }

  function handleMouseLeave() {
    setHovered(null);
  }

  const monthLabel = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  function startOfWeek(d) {
    const day = d.getDay();
    const diff = (day + 6) % 7; // make Monday=0
    const dt = new Date(d);
    dt.setDate(d.getDate() - diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function getCalendarWeeks(date) {
    const weeks = [];
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    let start = startOfWeek(firstOfMonth);
    // generate 6 weeks to cover month
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        week.push(day);
      }
      weeks.push(week);
    }
    return weeks;
  }

  const weeks = getCalendarWeeks(calDate);

  function prevMonth() {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  }

  function isToday(d) {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  return (
    <div className="gc-module-page" style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, maxWidth: '72%', paddingRight: 20 }}>
        <div className="gc-header">
          <div className="gc-header-left">
            <h1 className="gc-title">Dashboard</h1>
            <p className="gc-subtitle">Welcome back — here's what's happening</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <div className="icon-btn" title="role-pill">STUDENT</div>
            <div className="icon-btn" title="notifications">🔔</div>
            <Avatar name={user?.name || null} email={user?.email || null} src={user?.picture} className="gc-profile-circle" />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
          <div className="stats-card card-container">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>All Modules</div>
                <div style={{ color: '#6b7280', marginTop: 6 }}>Total modules enrolled</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{modules.length}</div>
              </div>
            </div>
          </div>
          <div className="stats-card card-container">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>In Progress</div>
                <div style={{ color: '#6b7280', marginTop: 6 }}>Course completion</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>0%</div>
              </div>
            </div>
          </div>
          <div className="stats-card card-container">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>Completed</div>
                <div style={{ color: '#6b7280', marginTop: 6 }}>Finished modules</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>0</div>
              </div>
            </div>
          </div>
          <div className="stats-card card-container">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>Quiz Attempts</div>
                <div style={{ color: '#6b7280', marginTop: 6 }}>Total taken</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>0</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div className="card-container" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 8 }}>Check Attendance</h3>
            <button className="view-all-btn">View Attendance</button>
          </div>
          <div className="card-container" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 8 }}>Take Quizzes/Test</h3>
            <button className="view-all-btn">Available Quiz</button>
          </div>
        </div>

        <div className="module-list" style={{ marginTop: 8 }}>
          <div className="module-list-header">
            <div>
              <h3 className="module-list-title">Continue Learning</h3>
              <div className="module-list-subtitle">Jump back into your current modules</div>
            </div>
            <button className="view-all-btn">View All</button>
          </div>

          <div style={{ display: 'flex', gap: 22, marginTop: 20, flexWrap: 'wrap' }}>
            {modules.length ? modules.map((m) => (
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
            )) : (
              <>
                <div className="module-card">
                  <div className="module-code">GEC-105 MOD1</div>
                  <div className="module-desc">A container for content related to persuasive, professional, and cross-cultural communication techniques</div>
                  <button className="module-view-btn">View</button>
                </div>
                <div className="module-card">
                  <div className="module-code">GEC-105 MOD2</div>
                  <div className="module-desc">Prepares you to navigate the complexities of communicating across diverse cultures and boundaries.</div>
                  <button className="module-view-btn">View</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <RightSidebar />
      
    </div>
  );
}
