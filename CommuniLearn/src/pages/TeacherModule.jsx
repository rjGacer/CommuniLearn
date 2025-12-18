import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../css/teacher.css";
import RightSidebar from "../components/RightSidebar";
import { apiUrl } from "../config";
import api from "../services/api";
export default function TeacherModule() {
  const {
    user
  } = useAuth();
  const [modules, setModules] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const navigate = useNavigate();
  const toggleMenu = id => {
    setOpenMenuId(prev => prev === id ? null : id);
  };

  // Close any open module dropdown when clicking outside
  useEffect(() => {
    const handleDocClick = e => {
      const target = e.target;
      if (!target) return;
      if (target.closest('.module-menu-wrapper') || target.closest('.module-dropdown')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // ---------------------------------------
  // LOAD ALL MODULES CREATED BY TEACHER
  // ---------------------------------------
  useEffect(() => {
    const fetchModules = async () => {
      if (!user?.email) return;
      try {
        const token = localStorage.getItem('token');
        const { data } = await api.get('/modules/teacher', { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
        setModules(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading modules", err);
      }
    };
    fetchModules();
  }, [user]);

  // ---------------------------------------
  // DELETE MODULE
  // ---------------------------------------
  const handleDeleteModule = async id => {
    if (!(await window.customConfirm("Delete this module?"))) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/modules/${id}`, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      setModules(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------
  // OPEN EDIT MODAL
  // ---------------------------------------
  const openEdit = m => {
    setEditId(m.id);
    setEditTitle(m.title);
    setEditDesc(m.description);
  };

  // ---------------------------------------
  // SAVE EDITED MODULE
  // ---------------------------------------
  const handleSaveEdit = async () => {
    if (!editId) return;
    try {
      const token = localStorage.getItem('token');
      const { data: updated } = await api.put(`/modules/${editId}`, { title: editTitle, description: editDesc }, { headers: { Authorization: token ? 'Bearer ' + token : undefined } });
      setModules(prev => prev.map(m => m.id === editId ? updated : m));
      setEditId(null);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="main-layout">
      <div className="dashboard-container">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="module-list">
              <div className="module-list-header">
                <div>
                  <h3 className="module-list-title">List of Modules</h3>
                  <div className="module-list-subtitle">Your recently created modules</div>
                </div>
                <button className="view-all-btn" onClick={() => navigate('/teacher/module')}>View All</button>
              </div>

              <div style={{ display: 'flex', gap: 22, marginTop: 20, flexWrap: 'wrap' }}>
                {modules.map(m => (
                  <div className="module-card" key={m.id}>
                    <div className="module-menu-wrapper">
                      <button className="module-more-btn" onClick={() => toggleMenu(m.id)}>⋮</button>
                      {openMenuId === m.id && (
                        <div className="module-dropdown">
                          <div className="module-dropdown-item" onClick={() => openEdit(m)}>Edit</div>
                          <div className="module-dropdown-item module-dropdown-delete" onClick={() => handleDeleteModule(m.id)}>Delete</div>
                        </div>
                      )}
                    </div>
                    <div className="module-code">{m.title}</div>
                    <div className="module-desc">{m.description}</div>
                    <button className="module-view-btn" onClick={() => navigate(`/teacher/module/${m.id}`)}>View</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <RightSidebar />
        </div>

        {editId && (
          <div className="modal-overlay" onClick={() => setEditId(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">Edit Module</h2>
              <div className="modal-form">
                <label>Module Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                <label>Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setEditId(null)}>Cancel</button>
                <button className="modal-btn create" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}