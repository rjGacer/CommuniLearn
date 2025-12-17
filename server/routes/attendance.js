import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// CREATE ATTENDANCE (teacher only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { description, dueDate } = req.body;
    // normalize date-only inputs to end-of-day local (23:59) before storing
    let due = dueDate ? dueDate : null;
    if (due) {
      // if client sent just a date string like 'YYYY-MM-DD'
      if (typeof due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due)) {
        const parts = due.split('-').map(Number);
        // create local end-of-day for that date
        const localEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 0, 0);
        due = localEnd.toISOString();
      } else if (typeof due === 'string') {
        // handle time-only strings like '21:00' or '9:00 PM'
        const timeOnly = due.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
        if (timeOnly) {
          let hh = parseInt(timeOnly[1], 10);
          const mm = parseInt(timeOnly[2], 10);
          const ampm = timeOnly[3];
          if (ampm) {
            const up = ampm.toUpperCase();
            if (up === 'PM' && hh !== 12) hh = (hh % 12) + 12;
            if (up === 'AM' && hh === 12) hh = 0;
          }
            const now = new Date();
            let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
            // if candidate is earlier than or equal to now, interpret as the next day's time
            if (candidate.getTime() <= now.getTime()) {
              candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
            }
            due = candidate.toISOString();
        } else {
          const parsed = new Date(due);
          // if parsed time is exactly 00:00:00 UTC, treat as date-only and convert to local end-of-day
          if (!isNaN(parsed.getTime()) && parsed.getUTCHours && parsed.getUTCHours() === 0 && parsed.getUTCMinutes && parsed.getUTCMinutes() === 0 && parsed.getUTCSeconds && parsed.getUTCSeconds() === 0) {
            const y = parsed.getUTCFullYear();
            const m = parsed.getUTCMonth();
            const dDay = parsed.getUTCDate();
            const localEnd = new Date(y, m, dDay, 23, 59, 0, 0);
            due = localEnd.toISOString();
          }
        }
      } else {
        // non-string values will be parsed below
        const parsed = new Date(due);
        if (!isNaN(parsed.getTime()) && parsed.getUTCHours && parsed.getUTCHours() === 0 && parsed.getUTCMinutes && parsed.getUTCMinutes() === 0 && parsed.getUTCSeconds && parsed.getUTCSeconds() === 0) {
          const y = parsed.getUTCFullYear();
          const m = parsed.getUTCMonth();
          const dDay = parsed.getUTCDate();
          const localEnd = new Date(y, m, dDay, 23, 59, 0, 0);
          due = localEnd.toISOString();
        }
      }
    }
    // if client sent a time-only sentinel (year 1970), convert it to the next occurrence
    // (today at that time, or tomorrow if that time is already past)
    if (due) {
      const parsed2 = new Date(due);
      if (!isNaN(parsed2.getTime()) && parsed2.getFullYear && parsed2.getFullYear() === 1970) {
        const now = new Date();
        let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parsed2.getHours(), parsed2.getMinutes(), parsed2.getSeconds(), parsed2.getMilliseconds());
        if (candidate.getTime() <= now.getTime()) {
          candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
        }
        due = candidate.toISOString();
      }
    }
    const attendance = await prisma.attendance.create({
      data: {
        teacherEmail: req.user.email,
        description,
        dueDate: due ? new Date(due) : null,
      },
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL ATTENDANCES (with marks + comments)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const items = await prisma.attendance.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        marks: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
    });
    const formatted = items.map((a) => ({
      ...a,
      username: a.teacherEmail ? a.teacherEmail.split("@")[0] : a.teacherEmail,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT ATTENDANCE (teacher only)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { description, dueDate } = req.body;
    const att = await prisma.attendance.findUnique({ where: { id } });
    if (!att) return res.status(404).json({ error: "Not found" });
    // allow creator, any teacher role, or superteacher to edit attendance
    if (att.teacherEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') return res.status(403).json({ error: "Forbidden" });
    // normalize date-only inputs to end-of-day local (23:59) before storing and validate time-only updates
    let due = dueDate ? dueDate : null;
    if (due) {
      if (typeof due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due)) {
        const parts = due.split('-').map(Number);
        const localEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 0, 0);
        due = localEnd.toISOString();
      } else if (typeof due === 'string') {
        const timeOnly = due.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
        if (timeOnly) {
          let hh = parseInt(timeOnly[1], 10);
          const mm = parseInt(timeOnly[2], 10);
          const ampm = timeOnly[3];
          if (ampm) {
            const up = ampm.toUpperCase();
            if (up === 'PM' && hh !== 12) hh = (hh % 12) + 12;
            if (up === 'AM' && hh === 12) hh = 0;
          }
          const now = new Date();
          let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
          if (candidate.getTime() <= now.getTime()) {
            candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
          }
          due = candidate.toISOString();
        } else {
          const parsed = new Date(due);
          if (!isNaN(parsed.getTime()) && parsed.getUTCHours && parsed.getUTCHours() === 0 && parsed.getUTCMinutes && parsed.getUTCMinutes() === 0 && parsed.getUTCSeconds && parsed.getUTCSeconds() === 0) {
            const y = parsed.getUTCFullYear();
            const m = parsed.getUTCMonth();
            const dDay = parsed.getUTCDate();
            const localEnd = new Date(y, m, dDay, 23, 59, 0, 0);
            due = localEnd.toISOString();
          }
        }
      } else {
        const parsed = new Date(due);
        if (!isNaN(parsed.getTime()) && parsed.getUTCHours && parsed.getUTCHours() === 0 && parsed.getUTCMinutes && parsed.getUTCMinutes() === 0 && parsed.getUTCSeconds && parsed.getUTCSeconds() === 0) {
          const y = parsed.getUTCFullYear();
          const m = parsed.getUTCMonth();
          const dDay = parsed.getUTCDate();
          const localEnd = new Date(y, m, dDay, 23, 59, 0, 0);
          due = localEnd.toISOString();
        }
      }
    }
    // if client sent a time-only sentinel (year 1970), convert it to the next occurrence
    if (due) {
      const parsed2 = new Date(due);
      if (!isNaN(parsed2.getTime()) && parsed2.getFullYear && parsed2.getFullYear() === 1970) {
        const now = new Date();
        let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parsed2.getHours(), parsed2.getMinutes(), parsed2.getSeconds(), parsed2.getMilliseconds());
        if (candidate.getTime() <= now.getTime()) {
          candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
        }
        due = candidate.toISOString();
      }
    }
    const updated = await prisma.attendance.update({ where: { id }, data: { description, dueDate: due ? new Date(due) : null } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE ATTENDANCE (teacher only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const att = await prisma.attendance.findUnique({ where: { id } });
    if (!att) return res.status(404).json({ error: "Not found" });
    // allow creator, any teacher role, or superteacher to delete attendance
    if (att.teacherEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') return res.status(403).json({ error: "Forbidden" });
    await prisma.attendanceComment.deleteMany({ where: { attendanceId: id } });
    await prisma.attendanceMark.deleteMany({ where: { attendanceId: id } });
    await prisma.attendance.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK ATTENDANCE (student clicks once)
router.post("/:id/mark", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const att = await prisma.attendance.findUnique({ where: { id } });
    if (!att) return res.status(404).json({ error: "Not found" });
    const existing = await prisma.attendanceMark.findFirst({ where: { attendanceId: id, studentEmail: req.user.email } });
    if (existing) return res.status(400).json({ error: "Already marked" });
    const mark = await prisma.attendanceMark.create({ data: { attendanceId: id, studentEmail: req.user.email } });
    res.json(mark);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single attendance with marks + comments
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const att = await prisma.attendance.findUnique({
      where: { id },
      include: { marks: true, comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!att) return res.status(404).json({ error: 'Not found' });
    res.json(att);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// COMMENTS
router.post("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Empty" });
    const comment = await prisma.attendanceComment.create({
      data: {
        attendanceId: id,
        text,
        authorName: req.user.email ? req.user.email.split("@")[0] : req.user.email,
        authorEmail: req.user.email,
      },
    });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/comments/:cid", authMiddleware, async (req, res) => {
  try {
    const cid = Number(req.params.cid);
    const { text } = req.body;
    const comment = await prisma.attendanceComment.findUnique({ where: { id: cid } });
    if (!comment) return res.status(404).json({ error: "Not found" });
    // allow the comment author, any teacher role, or superteacher to edit
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.attendanceComment.update({ where: { id: cid }, data: { text } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/comments/:cid", authMiddleware, async (req, res) => {
  try {
    const cid = Number(req.params.cid);
    const comment = await prisma.attendanceComment.findUnique({ where: { id: cid } });
    if (!comment) return res.status(404).json({ error: "Not found" });
    // allow the comment author, any teacher role, or superteacher to delete
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') return res.status(403).json({ error: "Forbidden" });
    await prisma.attendanceComment.delete({ where: { id: cid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
