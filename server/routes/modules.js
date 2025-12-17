import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

/* ============================
      MULTER CONFIG
=============================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "document") cb(null, "uploads/documents");
    else cb(null, "uploads/media");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ============================================================
      STUDENT ROUTES (MUST BE FIRST!)
============================================================ */

/** GET ALL MODULES FOR STUDENTS */
router.get("/student", authMiddleware, async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { createdAt: "desc" },
      include: { quizzes: true },
    });

    res.json(modules);
  } catch (err) {
    console.error("Student modules error:", err);
    res.status(500).json({ error: "Failed to load modules" });
  }
});

/** GET MODULE + QUIZZES FOR STUDENTS */
router.get("/student/:id", authMiddleware, async (req, res) => {
  try {
    const mod = await prisma.module.findUnique({
      where: { id: Number(req.params.id) },
      include: { quizzes: true },
    });

    if (!mod) return res.status(404).json({ error: "Module not found" });

    res.json(mod);
  } catch (err) {
    console.error("Student module view error:", err);
    res.status(500).json({ error: "Failed to load module" });
  }
});

/* ============================================================
      TEACHER ROUTES (AFTER STUDENT ROUTES)
============================================================ */

/** CREATE MODULE */
router.post(
  "/",
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "mediaFile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { title, description, teacherEmail, mediaUrl } = req.body;

      const documentPath =
        req.files?.document?.length ? req.files.document[0].path : null;

      const mediaPath =
        req.files?.mediaFile?.length ? req.files.mediaFile[0].path : null;

      const mod = await prisma.module.create({
        data: {
          title,
          description,
          teacherEmail,
          mediaUrl,
          documentPath,
          mediaPath
        }
      });

      res.json(mod);
    } catch (err) {
      console.error("Create module error:", err);
      res.status(500).json({ error: "Failed to create module" });
    }
  }
);

/** GET TEACHER MODULES */
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    // If user has role 'teacher', allow viewing all modules; otherwise restrict to their email
    const where = req.user.role === 'teacher' ? {} : { teacherEmail: email };

    const modules = await prisma.module.findMany({
      where,
      include: { quizzes: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(modules);
  } catch (err) {
    console.error("Load teacher modules error:", err);
    res.status(500).json({ error: "Failed to load teacher modules" });
  }
});

/** GET MODULE BY ID (TEACHER VIEW) */
router.get("/:id", async (req, res) => {
  try {
    const mod = await prisma.module.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!mod) return res.status(404).json({ error: "Module not found" });

    res.json(mod);
  } catch (err) {
    console.error("Module fetch error:", err);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

/** UPDATE MODULE (title/description) */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) return res.status(404).json({ error: "Module not found" });

    // Only the module owner, a teacher role, or a superteacher can update
    if (mod.teacherEmail !== req.user.email && req.user.role !== "superteacher" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, description, mediaUrl } = req.body;

    const updated = await prisma.module.update({
      where: { id },
      data: {
        title: typeof title === "string" ? title : mod.title,
        description: typeof description === "string" ? description : mod.description,
        mediaUrl: typeof mediaUrl === "string" ? mediaUrl : mod.mediaUrl,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update module error:", err);
    res.status(500).json({ error: "Failed to update module" });
  }
});

/** DELETE MODULE (remove related records first) */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const mod = await prisma.module.findUnique({ where: { id } });
    if (!mod) return res.status(404).json({ error: "Module not found" });

    // Only the module owner, a teacher role, or a superteacher can delete
    if (mod.teacherEmail !== req.user.email && req.user.role !== "superteacher" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 1) Find quizzes in this module
    const quizzes = await prisma.quiz.findMany({ where: { moduleId: id }, select: { id: true } });
    const quizIds = quizzes.map((q) => q.id);

    if (quizIds.length > 0) {
      // delete quiz attempts, questions and quizzes
      await prisma.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
      await prisma.quizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
      await prisma.quiz.deleteMany({ where: { id: { in: quizIds } } });
    }

    // 2) Delete module comments
    await prisma.moduleComment.deleteMany({ where: { moduleId: id } });

    // 3) Delete announcements + their comments for this module
    const anns = await prisma.announcement.findMany({ where: { moduleId: id }, select: { id: true } });
    const annIds = anns.map((a) => a.id);
    if (annIds.length > 0) {
      await prisma.announcementComment.deleteMany({ where: { announcementId: { in: annIds } } });
      await prisma.announcement.deleteMany({ where: { id: { in: annIds } } });
    }

    // 4) Delete submissions and enrollments
    await prisma.submission.deleteMany({ where: { moduleId: id } });
    await prisma.enrollment.deleteMany({ where: { moduleId: id } });

    // 5) Finally delete the module
    await prisma.module.delete({ where: { id } });

    res.json({ message: "Module deleted" });
  } catch (err) {
    console.error("Delete module error:", err);
    res.status(500).json({ error: "Failed to delete module" });
  }
});
router.post("/auto-enroll", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;

    // Find all modules created by teachers
    const modules = await prisma.module.findMany();

    for (const mod of modules) {
      // upsert with a compound unique requires a schema-level unique; instead, use find/create fallback
      const existing = await prisma.enrollment.findFirst({ where: { studentEmail: email, moduleId: mod.id } });
      if (!existing) {
        await prisma.enrollment.create({ data: { studentEmail: email, moduleId: mod.id } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Auto-enroll error:", err);
    res.status(500).json({ error: "Failed auto-enroll" });
  }
});

export default router;
