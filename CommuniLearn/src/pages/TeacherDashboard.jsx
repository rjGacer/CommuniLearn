import { useEffect, useState } from "react";
import "../css/teacher.css";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Megaphone, Plus, Users, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import RightSidebar from "../components/RightSidebar";
import { apiUrl } from "../config";
import api from "../services/api";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function TeacherDashboard() {
  const {
    user
  } = useAuth();
  const [modules, setModules] = useState([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedModule, setSelectedModule] = useState("");
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [newAttendanceDesc, setNewAttendanceDesc] = useState("");
  const [newAttendanceDueDate, setNewAttendanceDueDate] = useState("");
  const [newAttendanceDueTime, setNewAttendanceDueTime] = useState("");
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementFile, setAnnouncementFile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();

  // QUIZ STATES
  const [quizTitle, setQuizTitle] = useState("");

  // MODULE STATES
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const toggleMenu = id => {
    setOpenMenuId(prev => prev === id ? null : id);
  };

  // Close any open module dropdown when clicking outside
  useEffect(() => {
    const handleDocClick = e => {
      const target = e.target;
      if (!target) return;

      // If the click happened inside a module menu wrapper or the dropdown itself, do nothing
      if (target.closest('.module-menu-wrapper') || target.closest('.module-dropdown')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // FETCH MODULES
  // FETCH MODULES + COUNT ASSESSMENTS
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const teacherEmail = user?.email;
        if (!teacherEmail) return;
        const { data } = await api.get('/modules/teacher', {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        setModules(Array.isArray(data) ? data : []);

        // Count assessments (Identification + MCQ + Activity)
        const totalAssessments = data.flatMap(mod => mod.quizzes || []).length;
        setAssessmentCount(totalAssessments);
      } catch (e) {
        console.error("Error fetching modules:", e);
      }
    };
    const loadAnnouncements = async () => {
      try {
        const { data } = await api.get('/announcements', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        setAnnouncements(data);
      } catch (err) {
        console.error("Failed to load announcements:", err);
      }
    };
    loadAnnouncements();
    const loadApprovedStudents = async () => {
      try {
        const { data: approved } = await api.get('/students/approved/count');
        setEnrolledCount(approved.count || 0);
      } catch (err) {
        console.error("Failed to load approved students count:", err);
      }
    };

    const loadPendingStudents = async () => {
      try {
        const { data: pending } = await api.get('/students/pending/count');
        setPendingCount(pending.count || 0);
      } catch (err) {
        console.error("Failed to load pending students count:", err);
      }
    };

    // Run initial loads
    fetchModules();
    loadApprovedStudents();
    loadPendingStudents();
  }, [user]);

  // CREATE MODULE
  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) return alert("Please enter a module title");
    try {
      const formData = new FormData();
      formData.append("title", moduleTitle);
      formData.append("description", moduleDescription);
      formData.append("teacherEmail", user?.email || "");
      if (documentFile) formData.append("document", documentFile);
      if (mediaFile) formData.append("mediaFile", mediaFile);
      if (mediaUrl) formData.append("mediaUrl", mediaUrl);
      const resp = await fetch(apiUrl('/modules'), {
        method: "POST",
        body: formData
      });
      if (!resp.ok) throw new Error("Failed to create module");
      const newModule = await resp.json();
      setModules(prev => [...prev, newModule]);
      // notify sidebar in other tabs/components to refresh recent items
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
      setModuleTitle("");
      setModuleDescription("");
      setDocumentFile(null);
      setMediaFile(null);
      setMediaUrl("");
      setShowModuleModal(false);
    } catch (error) {
      console.error(error);
      alert("Error creating module");
    }
  };

  // 🎯 FIXED — CREATE QUIZ + NAVIGATE
  const createQuizAndGoToBuilder = async () => {
    if (!quizTitle.trim()) return alert("Quiz needs a title");
    if (!selectedModule) return alert("Select a module");
    try {
      const response = await fetch(apiUrl('/quizzes/create'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          title: quizTitle,
          moduleId: Number(selectedModule)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.quizId) {
        alert(data.error || "Failed to create quiz.");
        return;
      }
      // notify recent feed that a quiz was created
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
      navigate("/teacher/quiz-builder", {
        state: {
          quizId: data.quizId,
          moduleId: Number(selectedModule),
          title: quizTitle,
          createdNow: true
        }
      });
      setTimeout(() => setShowQuizModal(false), 100);
    } catch (error) {
      console.error("Create quiz error:", error);
      alert("Error creating quiz.");
    }
  };

  // DELETE MODULE
  const handleDeleteModule = async id => {
    if (!(await window.customConfirm("Delete this module?"))) return;
    try {
      const resp = await fetch(apiUrl(`/modules/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        console.error("Delete module failed", payload);
        alert(payload?.error || "Failed to delete module");
        return;
      }
      setModules(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting module");
    }
  };
  const handleCreateAnnouncement = async () => {
    if (!announcementDescription.trim()) return alert("Description is required.");
    try {
      const formData = new FormData();
      formData.append("description", announcementDescription);
      if (announcementFile) formData.append("file", announcementFile);
      const res = await fetch(apiUrl('/announcements'), {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: formData
      });
      const data = await res.json();
      // preserve the locally selected filename for immediate display (server stores hashed path)
      const displayName = announcementFile?.name || (data.filePath ? String(data.filePath).split(/[/\\]/).pop() : null);
      setAnnouncements(prev => [{ ...data, displayFileName: displayName }, ...prev]);
      // notify recent feed that an announcement was created
      try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
      setShowAnnounceModal(false);
      setAnnouncementDescription("");
      setAnnouncementFile(null);
    } catch (err) {
      console.log(err);
      alert("Failed to create announcement");
    }
  };

  // create attendance (posts to /attendance)
  const createAttendance = async () => {
    const description = (newAttendanceDesc || "").trim();
    if (!description) return alert("Description is required");
    // combine date + time if provided
    let dueDate = null;
    if (newAttendanceDueDate) {
      if (newAttendanceDueTime) dueDate = `${newAttendanceDueDate}T${newAttendanceDueTime}`;
      else dueDate = newAttendanceDueDate;
    } else if (newAttendanceDueTime) {
      // time-only: store a sentinel date (1970-01-01) so UI can detect time-only values
      dueDate = `1970-01-01T${newAttendanceDueTime}`;
    }
    try {
      const res = await fetch(apiUrl('/attendance'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ description, dueDate })
      });
      const payload = await res.json();
      if (!res.ok) {
        alert(payload.error || "Failed to create attendance");
        return;
      }
      setShowAttendanceModal(false);
      setNewAttendanceDesc("");
      setNewAttendanceDueDate("");
      setNewAttendanceDueTime("");
      // Also create an announcement so the attendance appears in the announcements feed
      try {
        const annForm = new FormData();
        // embed attendance id into the announcement description so the announcements UI can
        // render a Present button that calls the attendance mark endpoint.
        const annDesc = `Attendance: ${description}` + (dueDate ? ` — Due: ${new Date(dueDate).toLocaleString()}` : "") + (payload && payload.id ? ` [ATTENDANCE_ID:${payload.id}]` : "");
        annForm.append("description", annDesc);
        const annRes = await fetch(apiUrl('/announcements'), {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
          },
          body: annForm
        });
        const annData = await annRes.json();
        if (annRes.ok) {
          const displayName2 = payload && announcementFile ? announcementFile.name : (annData.filePath ? String(annData.filePath).split(/[/\\]/).pop() : null);
          setAnnouncements(prev => [{ ...annData, displayFileName: displayName2 }, ...prev]);
          try{ localStorage.setItem('recentUpdated', String(Date.now())); window.dispatchEvent(new Event('recentUpdated')); }catch(e){}
        } else {
          console.warn("Attendance created but linked announcement failed:", annData);
        }
      } catch (err) {
        console.error("Failed to create linked announcement:", err);
      }

      alert("Attendance created successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to create attendance (network error)");
    }
  };

  // SAVE EDITED MODULE (from dashboard)
  const handleSaveEdit = async () => {
    if (!editId) return;
    try {
      const resp = await fetch(apiUrl(`/modules/${editId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc
        })
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        console.error("Update failed", payload);
        alert(payload?.error || "Failed to update module");
        return;
      }
      const updated = await resp.json();
      setModules(prev => prev.map(mm => mm.id === editId ? updated : mm));
      setEditId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    }
  };
  return /*#__PURE__*/_jsxs("div", {
    className: "main-layout",
    children: [/*#__PURE__*/_jsxs("div", {
      className: "dashboard-container",
      children: [/*#__PURE__*/_jsxs("div", {
        className: "stats-grid",
        children: [/*#__PURE__*/_jsxs("div", {
          className: "stats-card",
          children: [/*#__PURE__*/_jsx("div", {
            className: "card-header",
            children: /*#__PURE__*/_jsx("div", {
              className: "icon-wrapper",
              children: /*#__PURE__*/_jsx(FileText, {
                className: "icon-blue"
              })
            })
          }), /*#__PURE__*/_jsx("h3", {
            className: "card-number",
            children: modules.length
          }), /*#__PURE__*/_jsx("p", {
            className: "card-subtitle",
            children: "Modules Created"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "stats-card stats-clickable",
          onClick: () => navigate("/teacher/quizzes"),
          children: [/*#__PURE__*/_jsx("div", {
            className: "card-header",
            children: /*#__PURE__*/_jsx("div", {
              className: "icon-wrapper",
              children: /*#__PURE__*/_jsx(Calendar, {
                className: "icon-blue"
              })
            })
          }), /*#__PURE__*/_jsx("h3", {
            className: "card-number",
            children: assessmentCount
          }), /*#__PURE__*/_jsx("p", {
            className: "card-subtitle",
            children: "Assessments Created"
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "stats-card stats-clickable",
          onClick: () => navigate("/teacher/students"),
          children: [/*#__PURE__*/_jsx("div", {
            className: "card-header",
            children: /*#__PURE__*/_jsx("div", {
              className: "icon-wrapper",
              children: /*#__PURE__*/_jsx(Users, {
                className: "icon-blue"
              })
            })
          }), /*#__PURE__*/_jsx("h3", {
              className: "card-number",
              children: enrolledCount
            }), /*#__PURE__*/_jsx("p", {
              className: "card-subtitle",
              children: "Enrolled Students"
            })]
          }), /*#__PURE__*/_jsxs("div", {
            className: "stats-card stats-clickable",
            onClick: () => navigate('/teacher/approvals'),
            children: [/*#__PURE__*/_jsx("div", {
              className: "card-header",
              children: /*#__PURE__*/_jsx("div", {
                className: "icon-wrapper",
                children: /*#__PURE__*/_jsx(UserPlus, {
                  className: "icon-blue"
                })
              })
            }), /*#__PURE__*/_jsx("h3", {
              className: "card-number",
              children: pendingCount
            }), /*#__PURE__*/_jsx("p", {
              className: "card-subtitle",
              children: "Registrants"
            })]
          })]
      }), /*#__PURE__*/_jsxs("div", {
        className: "action-buttons-container",
        children: [/*#__PURE__*/_jsxs("button", {
          type: "button",
          className: "action-btn primary",
          onClick: () => setShowModuleModal(true),
          children: [/*#__PURE__*/_jsx(Plus, {
            size: 18
          }), "New Module"]
        }), /*#__PURE__*/_jsxs("button", {
          type: "button",
          className: "action-btn primary",
          onClick: () => setShowAttendanceModal(true),
          children: [/*#__PURE__*/_jsx(Calendar, {
            size: 18
          }), "New Attendance"]
        }), /*#__PURE__*/_jsxs("button", {
          type: "button",
          className: "action-btn primary",
          onClick: () => setShowQuizModal(true),
          children: [/*#__PURE__*/_jsx(Calendar, {
            size: 18
          }), "New Activity"]
        }), /*#__PURE__*/_jsxs("button", {
          type: "button",
          className: "action-btn primary",
          onClick: () => setShowAnnounceModal(true),
          children: [/*#__PURE__*/_jsx(Megaphone, {
            size: 18
          }), "Create Announcement"]
        })]
      }), /*#__PURE__*/_jsxs("div", {
        style: { display: 'flex', gap: 24, alignItems: 'flex-start' },
        children: [/*#__PURE__*/_jsxs("div", {
          style: { flex: 1 },
          children: [/*#__PURE__*/_jsxs("div", {
            className: "module-list",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "module-list-header",
              children: [/*#__PURE__*/_jsxs("div", {
                children: [/*#__PURE__*/_jsx("h3", {
                  className: "module-list-title",
                  children: "List of Modules"
                }), /*#__PURE__*/_jsx("p", {
                  className: "module-list-subtitle",
                  children: "Your recently created modules"
                })]
              }), /*#__PURE__*/_jsx("button", {
                type: "button",
                className: "view-all-btn",
                onClick: () => navigate("/teacher/module"),
                children: "View All"
              })]
            }), /*#__PURE__*/_jsx("div", {
              style: { display: 'flex', gap: 22, marginTop: 20, flexWrap: 'wrap' },
              children: modules.map(m => /*#__PURE__*/_jsxs("div", {
                className: "module-card",
                children: [/*#__PURE__*/_jsxs("div", {
                  className: "module-menu-wrapper",
                  children: [/*#__PURE__*/_jsx("button", {
                    type: "button",
                    className: "module-more-btn",
                    onClick: () => toggleMenu(m.id),
                    children: "\u22EE"
                  }), openMenuId === m.id && /*#__PURE__*/_jsxs("div", {
                    className: "module-dropdown",
                    children: [/*#__PURE__*/_jsx("div", {
                      className: "module-dropdown-item",
                      onClick: () => {
                        setEditId(m.id);
                        setEditTitle(m.title);
                        setEditDesc(m.description || "");
                        setOpenMenuId(null);
                      },
                      children: "Edit"
                    }), /*#__PURE__*/_jsx("div", {
                      className: "module-dropdown-item module-dropdown-delete",
                      onClick: () => handleDeleteModule(m.id),
                      children: "Delete"
                    })]
                  })]
                }), /*#__PURE__*/_jsx("h4", {
                  className: "module-code",
                  children: m.title
                }), /*#__PURE__*/_jsx("p", {
                  className: "module-desc",
                  children: m.description
                }), /*#__PURE__*/_jsx("button", {
                  type: "button",
                  className: "module-view-btn",
                  onClick: () => navigate(`/teacher/module/${m.id}`),
                  children: "View"
                })]
              }, m.id))
            })]
          }), /*#__PURE__*/_jsx("div", {
            style: { height: 24 }
          })]
        }), /*#__PURE__*/_jsx("div", {
          style: { width: 340, flex: '0 0 340px' },
          children: /*#__PURE__*/_jsx(RightSidebar, {})
        })]
      })]
    }), showModuleModal && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setShowModuleModal(false),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "Create a Module"
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-form",
          children: [/*#__PURE__*/_jsx("label", {
            children: "Module Name:"
          }), /*#__PURE__*/_jsx("input", {
            type: "text",
            placeholder: "Module title",
            value: moduleTitle,
            onChange: e => setModuleTitle(e.target.value)
          }), /*#__PURE__*/_jsx("label", {
            children: "Description:"
          }), /*#__PURE__*/_jsx("textarea", {
            placeholder: "Describe the module",
            value: moduleDescription,
            onChange: e => setModuleDescription(e.target.value)
          }), /*#__PURE__*/_jsx("label", {
            children: "Document File:"
          }), /*#__PURE__*/_jsx("input", {
            type: "file",
            accept: ".pdf,.doc,.docx",
            onChange: e => setDocumentFile(e.target.files?.[0] || null)
          }), /*#__PURE__*/_jsx("label", {
            children: "Video/Audio:"
          }), /*#__PURE__*/_jsx("input", {
            type: "file",
            accept: ".mp4,.mkv,.mp3",
            onChange: e => setMediaFile(e.target.files?.[0] || null)
          }), /*#__PURE__*/_jsx("label", {
            children: "Video/Audio URL:"
          }), /*#__PURE__*/_jsx("input", {
            type: "text",
            placeholder: "YouTube / Vimeo / MP3 URL",
            value: mediaUrl,
            onChange: e => setMediaUrl(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn cancel",
            onClick: () => setShowModuleModal(false),
            children: "Cancel"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn create",
            onClick: handleCreateModule,
            children: "Create"
          })]
        })]
      })
    }), showAnnounceModal && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setShowAnnounceModal(false),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "Create Announcement"
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-form",
          children: [/*#__PURE__*/_jsx("label", {
            children: "Description:"
          }), /*#__PURE__*/_jsx("textarea", {
            placeholder: "Enter announcement description",
            value: announcementDescription,
            onChange: e => setAnnouncementDescription(e.target.value)
          }), /*#__PURE__*/_jsx("label", {
            children: "Attach File (Optional):"
          }), /*#__PURE__*/_jsx("input", {
            type: "file",
            onChange: e => setAnnouncementFile(e.target.files?.[0] || null)
          }), announcementFile && (() => {
            const fileName = announcementFile.name;
            const ext = fileName.split('.').pop().toLowerCase();
            const blobUrl = URL.createObjectURL(announcementFile);
            if (ext === 'pdf') {
              return /*#__PURE__*/_jsxs("div", {
                className: "gc-pdf-card",
                style: {
                  marginTop: 8
                },
                children: [/*#__PURE__*/_jsx("iframe", {
                  src: blobUrl,
                  className: "gc-pdf-preview",
                  title: fileName
                }), /*#__PURE__*/_jsxs("div", {
                  className: "gc-pdf-info",
                  children: [/*#__PURE__*/_jsx("p", {
                    className: "gc-pdf-name",
                    children: fileName
                  }), /*#__PURE__*/_jsx("a", {
                    href: blobUrl,
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
              style: {
                marginTop: 8
              },
              children: [/*#__PURE__*/_jsxs("div", {
                className: "gc-pdf-preview",
                children: [/*#__PURE__*/_jsx("div", {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    fontSize: 36
                  },
                  children: "📄"
                })]
              }), /*#__PURE__*/_jsxs("div", {
                className: "gc-pdf-info",
                children: [/*#__PURE__*/_jsx("p", {
                  className: "gc-pdf-name",
                  children: fileName
                }), /*#__PURE__*/_jsx("a", {
                  href: blobUrl,
                  target: "_blank",
                  rel: "noreferrer",
                  className: "gc-open-btn",
                  children: "Open"
                })]
              })]
            });
          })()]
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn cancel",
            onClick: () => setShowAnnounceModal(false),
            children: "Cancel"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn create",
            onClick: handleCreateAnnouncement,
            children: "Create"
          })]
        })]
      })
    }), showAttendanceModal && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setShowAttendanceModal(false),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "New Attendance"
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-form",
          children: [/*#__PURE__*/_jsx("label", {
            children: "Description:"
          }), /*#__PURE__*/_jsx("textarea", {
            placeholder: "Enter attendance description",
            value: newAttendanceDesc,
            onChange: e => setNewAttendanceDesc(e.target.value),
            className: "announcement-edit-box"
          }), /*#__PURE__*/_jsxs("div", {
            className: "datetime-row",
            children: [/*#__PURE__*/_jsxs("div", {
              className: "datetime-col",
              children: [/*#__PURE__*/_jsx("label", {
                style: {
                  marginTop: 12
                },
                children: "Due Date"
              }), /*#__PURE__*/_jsx("input", {
                type: "date",
                value: newAttendanceDueDate,
                onChange: e => setNewAttendanceDueDate(e.target.value),
                className: "announcement-input"
              })]
            }), /*#__PURE__*/_jsx("div", {
              className: "datetime-divider"
            }), /*#__PURE__*/_jsxs("div", {
              className: "datetime-col",
              children: [/*#__PURE__*/_jsx("label", {
                style: { marginTop: 12 },
                children: "Time"
              }), /*#__PURE__*/_jsx("input", {
                type: "time",
                value: newAttendanceDueTime,
                onChange: e => setNewAttendanceDueTime(e.target.value),
                className: "announcement-input",
                style: { maxWidth: 200 }
              })]
            })]
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn cancel",
            onClick: () => setShowAttendanceModal(false),
            children: "Cancel"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn create",
            onClick: createAttendance,
            children: "Create"
          })]
        })]
      })
    }), editId && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setEditId(null),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "Edit Module"
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-form",
          children: [/*#__PURE__*/_jsx("label", {
            children: "Module Title:"
          }), /*#__PURE__*/_jsx("input", {
            type: "text",
            value: editTitle,
            onChange: e => setEditTitle(e.target.value)
          }), /*#__PURE__*/_jsx("label", {
            children: "Description:"
          }), /*#__PURE__*/_jsx("textarea", {
            value: editDesc,
            onChange: e => setEditDesc(e.target.value)
          })]
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn cancel",
            onClick: () => setEditId(null),
            children: "Cancel"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn create",
            onClick: handleSaveEdit,
            children: "Save Changes"
          })]
        })]
      })
    }), showQuizModal && /*#__PURE__*/_jsx("div", {
      className: "modal-overlay",
      onClick: () => setShowQuizModal(false),
      children: /*#__PURE__*/_jsxs("div", {
        className: "modal-content",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsx("h2", {
          className: "modal-title",
          children: "Create a New Quiz"
        }), /*#__PURE__*/_jsxs("div", {
          className: "modal-form",
          children: [/*#__PURE__*/_jsx("label", {
            children: "Quiz Title:"
          }), /*#__PURE__*/_jsx("input", {
            type: "text",
            value: quizTitle,
            onChange: e => setQuizTitle(e.target.value)
          }), /*#__PURE__*/_jsx("label", {
            children: "Select Module:"
          }), /*#__PURE__*/_jsxs("select", {
            value: selectedModule,
            onChange: e => setSelectedModule(e.target.value),
            children: [/*#__PURE__*/_jsx("option", {
              value: "",
              children: "-- Choose Module --"
            }), modules.map(m => /*#__PURE__*/_jsx("option", {
              value: String(m.id),
              children: m.title
            }, m.id))]
          })]
        }), /*#__PURE__*/_jsx("div", {
          className: "modal-actions",
          children: [/*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn cancel",
            onClick: () => setShowQuizModal(false),
            children: "Cancel"
          }), /*#__PURE__*/_jsx("button", {
            type: "button",
            className: "modal-btn create",
            onClick: createQuizAndGoToBuilder,
            children: "Continue"
          })]
        })]
      })
    })]
  });
}