import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import ImageCropper from "../components/ImageCropper";
import "../css/teacher.css";
import { API_BASE } from "../api.js";

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || ""); 
  const [email, setEmail] = useState(user?.email || "");
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [picture, setPicture] = useState(user?.picture || null);

  const isGmail = (email || "").toString().toLowerCase().includes("@gmail.com");

  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [saving, setSaving] = useState(false);

  const onFile = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setCropSrc(url);
    setShowCropper(true);
  };

  const handleCrop = (dataUrl) => {
    if (cropSrc && cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setPicture(dataUrl);
    setCropSrc(null);
    setShowCropper(false);
  };

  const handleCancelCrop = () => {
    if (cropSrc && cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setShowCropper(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      let pictureUrl = picture;

      try {
        if (picture && picture.startsWith("data:") && API_BASE) {
          const res = await fetch(picture);
          const blob = await res.blob();
          const fd = new FormData();
          fd.append("avatar", blob, "avatar.png");

          // server exposes POST /api/profile/avatar in the local express server
          const uploadUrl = `${API_BASE.replace(/\/$/, "")}/profile/avatar`;
          const token = localStorage.getItem('token');
          const r = await fetch(uploadUrl, {
            method: "POST",
            body: fd,
            headers: token ? { Authorization: 'Bearer ' + token } : undefined
          });

          if (r.ok) {
            const json = await r.json();
            if (json?.url) pictureUrl = json.url;
          }
        }
      } catch (e) {
        console.error('Avatar upload failed', e);
      }

      // await updateProfile so user state is synced with server
      try {
        const updated = await updateProfile({ name, email, bio, studentId, picture: pictureUrl });
        // ensure local component state reflects server values (use server URL for picture)
        if (updated) {
          if (updated.picture) setPicture(updated.picture);
          if (updated.name) setName(updated.name);
          if (updated.email) setEmail(updated.email);
          if (updated.bio !== undefined) setBio(updated.bio || "");
          if (updated.studentId !== undefined) setStudentId(updated.studentId || "");
          try { window.alert('Saved Successfully'); } catch(e){}
        }
      } catch (e) {
        console.error('Profile save failed', e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-container">
      {/* LEFT — Avatar & Button */}
      <div className="profile-left">
        <div className="profile-avatar-wrapper">
          <Avatar
            name={name}
            email={email}
            src={picture}
            className="profile-avatar"
          />
        </div>

        <label className="edit-profile-pic">
          Edit Profile Picture
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            style={{ display: "none" }}
          />
        </label>

        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "SAVE"}
        </button>
      </div>

      {/* RIGHT — Form */}
      <div className="profile-right">
        <div className="profile-form-card">

          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher"
          />

          <label className="form-label">Email</label>
          <input
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gmail.com"
            readOnly={isGmail}
            style={isGmail ? { backgroundColor: '#f3f4f6' } : undefined}
          />
          {isGmail && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
              Gmail addresses cannot be edited here. Contact Teacher to change it.
            </div>
          )}

          <label className="form-label"> ID</label>
          <input
            className="form-input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="add if you want"
          />

          <label className="form-label">Biography</label>
          <textarea
            className="form-textarea"
            rows={6}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </div>

      {showCropper && cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={handleCancelCrop}
          onCrop={handleCrop}
          exportSize={320}
        />
      )}
    </div>
  );
}
