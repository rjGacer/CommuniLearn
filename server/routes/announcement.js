import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// File upload - preserve original filename (keep extension) so browsers can render inline
const uploadsDir = "uploads/announcements";
// ensure directory exists
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // keep original filename but prefix with timestamp to avoid collisions
    const original = file.originalname || file.fieldname;
    // sanitize
    const safe = original.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({ storage });

/**
 * CREATE ANNOUNCEMENT
 */
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { description } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        teacherEmail: req.user.email,
        description,
        filePath: req.file ? req.file.path : null,
        fileName: req.file ? req.file.originalname : null,
      },
    });

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET ALL ANNOUNCEMENTS (with comments)
 * Everyone can view all announcements and their comments.
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        comments: {
          orderBy: { createdAt: "asc" }, // earliest -> latest
        },
      },
    });

    // Attach username (before @) for display convenience
    const formatted = announcements.map((a) => ({
      ...a,
      username: a.teacherEmail ? a.teacherEmail.split("@")[0] : a.teacherEmail,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * EDIT ANNOUNCEMENT (teacher only)
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    const { description } = req.body;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) return res.status(404).json({ error: "Not found" });

    // allow the creator, any teacher role, or superteacher to edit
    if (announcement.teacherEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { description },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE ANNOUNCEMENT (teacher only)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const announcementId = Number(req.params.id);

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) return res.status(404).json({ error: "Not found" });

    // allow the creator, any teacher role, or superteacher to delete
    if (announcement.teacherEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    // delete comments first (optional, but safe)
    await prisma.announcementComment.deleteMany({
      where: { announcementId },
    });

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST COMMENT (any logged-in user)
 */
router.post("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Empty" });

    const comment = await prisma.announcementComment.create({
      data: {
        announcementId,
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

/**
 * EDIT COMMENT (only the comment author)
 */
router.put("/:id/comments/:cid", authMiddleware, async (req, res) => {
  try {
    const commentId = Number(req.params.cid);
    const { text } = req.body;

    const comment = await prisma.announcementComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return res.status(404).json({ error: "Not found" });

    // allow the comment author, any teacher role, or superteacher to edit
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.announcementComment.update({
      where: { id: commentId },
      data: { text },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE COMMENT (only the comment author)
 */
router.delete("/:id/comments/:cid", authMiddleware, async (req, res) => {
  try {
    const commentId = Number(req.params.cid);

    const comment = await prisma.announcementComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return res.status(404).json({ error: "Not found" });

    // allow the comment author, any teacher role, or superteacher to delete
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.announcementComment.delete({
      where: { id: commentId },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
