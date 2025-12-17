import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ dest: "uploads/submissions" });

/**
 * STUDENT SUBMITS A FILE FOR A MODULE
 */
router.post("/:moduleId", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);

    const submission = await prisma.submission.create({
      data: {
        moduleId,
        studentEmail: req.user.email,
        filePath: req.file ? req.file.path : null,
      },
    });

    res.json(submission);
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Failed to submit" });
  }
});

export default router;
