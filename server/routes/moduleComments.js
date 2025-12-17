import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// GET comments for a module
router.get("/:moduleId", authMiddleware, async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);

    const comments = await prisma.moduleComment.findMany({
      where: { moduleId },
      orderBy: { createdAt: "asc" },
    });

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

// POST comment
router.post("/:moduleId", authMiddleware, async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    // Fetch user to get their name
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
      select: { name: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const comment = await prisma.moduleComment.create({
      data: {
        moduleId,
        text,
        authorName: user.name,         // From database
        authorEmail: req.user.email    // From JWT token
      },
    });

    res.json(comment);

  } catch (err) {
    console.error("Error posting comment:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});



router.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const comment = await prisma.moduleComment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // allow the comment author, any teacher role, or superteacher to delete
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.moduleComment.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// PUT edit comment
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const comment = await prisma.moduleComment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // allow the comment author, any teacher role, or superteacher to edit
    if (comment.authorEmail !== req.user.email && req.user.role !== 'teacher' && req.user.role !== 'superteacher') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.moduleComment.update({
      where: { id },
      data: { text }
    });

    res.json(updated);
  } catch (err) {
    console.error("Error editing comment:", err);
    res.status(500).json({ error: "Failed to edit comment" });
  }
});


export default router;
