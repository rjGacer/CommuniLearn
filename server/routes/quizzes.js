import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();
const prisma = new PrismaClient();

/* =====================================================
   FILE UPLOAD SETUP
===================================================== */
const uploadDir = "uploads/quiz";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* =====================================================
   CREATE QUIZ (NO QUESTIONS YET)
===================================================== */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { moduleId, title, attemptLimit } = req.body;
    const teacherEmail = req.user.email;

    if (!moduleId || !title)
      return res.status(400).json({ error: "Missing fields" });

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: "",
        teacherEmail,
        moduleId: Number(moduleId),
        totalPoints: 0,
        attemptLimit: attemptLimit ? Number(attemptLimit) : 1,
      },
    });

    return res.json({ success: true, quizId: quiz.id });
  } catch (error) {
    console.error("❌ Error creating quiz:", error);
    res.status(500).json({ error: "Server error creating quiz" });
  }
});

/* =====================================================
   SAVE QUESTIONS + FILES
===================================================== */
router.post("/save-questions", authMiddleware, upload.any(), async (req, res) => {
  try {
    const { quizId, description, timeLimit, dueDate, attemptLimit } = req.body;

    let questions = [];
    try {
      questions = JSON.parse(req.body.questions);
    } catch {
      return res.status(400).json({ error: "Invalid questions JSON" });
    }

    if (!quizId) return res.status(400).json({ error: "Missing quizId" });

    // compute totalPoints from per-question points (default 1), but exclude Activity questions
    const totalPoints = questions.reduce((sum, q) => sum + ((q.type !== 'Activity') ? (Number(q.points) || 1) : 0), 0);

    await prisma.quiz.update({
      where: { id: Number(quizId) },
      data: {
        description: description || "",
        timeLimit: timeLimit ? Number(timeLimit) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalPoints,
        attemptLimit: attemptLimit ? Number(attemptLimit) : 1,
      },
    });

    await prisma.quizQuestion.deleteMany({
      where: { quizId: Number(quizId) },
    });

    const fileGroups = {};
    if (req.files) {
      for (const file of req.files) {
        const key = file.fieldname;
        if (!fileGroups[key]) fileGroups[key] = [];
        fileGroups[key].push("/" + file.path.replace(/\\/g, "/"));
      }
    }

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      const fileKey = `files_q${index}`;

      await prisma.quizQuestion.create({
        data: {
          quizId: Number(quizId),
          type: q.type,
          question: q.question,
          options: JSON.stringify(q.options || []),
          answer: q.answer || "",
          files: fileGroups[fileKey]
            ? JSON.stringify(fileGroups[fileKey])
            : null,
          points: q.points ? Number(q.points) : 1,
        },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Error saving quiz questions:", error);
    res.status(500).json({ error: "Server error saving questions" });
  }
});

/* =====================================================
   TEACHER QUIZZES
===================================================== */
router.get("/teacher", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    // If user has role 'teacher', return all modules (global view). Otherwise restrict to the teacher's modules.
    const where = req.user.role === 'teacher' ? {} : { teacherEmail: email };

    const modules = await prisma.module.findMany({
      where,
      include: { quizzes: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(modules);
  } catch (err) {
    console.error("❌ Error loading teacher quizzes:", err);
    res.status(500).json({ error: "Server error loading quizzes" });
  }
});

/* =====================================================
   ⭐ STUDENT QUIZZES (MUST BE ABOVE /:id ROUTES)
===================================================== */
router.get("/student", authMiddleware, async (req, res) => {
  try {
    const studentEmail = req.user.email;

    const enrolled = await prisma.enrollment.findMany({
      where: { studentEmail },
      select: { moduleId: true }
    });

    const moduleIds = enrolled.map(e => e.moduleId);

    if (moduleIds.length === 0) {
      return res.json([]);
    }

    const quizzes = await prisma.quiz.findMany({
      where: { moduleId: { in: moduleIds } },
      orderBy: { createdAt: "desc" },
      include: { module: true }
    });

    res.json(quizzes);
  } catch (err) {
    console.error("🔥 Error fetching student quizzes:", err);
    res.status(500).json({ error: "Failed to load student quizzes" });
  }
});

/* =====================================================
   GET QUIZ BY ID (Teacher sees answers, students DO NOT)
===================================================== */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = req.user.role;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const filteredQuestions = quiz.questions.map((q) => ({
      ...q,
      options: q.options,
      files: q.files,
      answer: role === "teacher" ? q.answer : undefined,
    }));

    res.json({
      ...quiz,
      questions: filteredQuestions,
    });

  } catch (err) {
    console.error("Error loading quiz:", err);
    res.status(500).json({ error: "Server error loading quiz" });
  }
});

/* =====================================================
   STUDENT — CHECK REMAINING ATTEMPTS
===================================================== */
router.get("/:id/attempts", authMiddleware, async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const student = req.user.email;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { attemptLimit: true },
    });

    const used = await prisma.quizAttempt.count({
      where: { quizId, studentEmail: student },
    });

    res.json({
      limit: quiz.attemptLimit,
      used,
      remaining: quiz.attemptLimit - used,
    });
  } catch (err) {
    console.error("Error getting attempts:", err);
    res.status(500).json({ error: "Failed to load attempts" });
  }
});

/* =====================================================
   STUDENT — SUBMIT QUIZ
   Accepts multipart/form-data with files (from student Activity attachments).
   If files are uploaded, any answer value that uses the placeholder
   "__FILE__:filename" will be replaced with the stored file path so teachers
   can access submitted files.
===================================================== */
router.post('/:id/submit', authMiddleware, upload.any(), async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const studentEmail = req.user.email;

    // answers may be a JSON string when sent as multipart/form-data
    let answersRaw = req.body.answers;
    if (!answersRaw) return res.status(400).json({ error: 'Missing answers' });
    let answers = answersRaw;
    if (typeof answersRaw === 'string') {
      try {
        answers = JSON.parse(answersRaw);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid answers JSON' });
      }
    }

    // Build maps of uploaded files by original filename and by fieldname
    const fileMap = {};      // originalname -> [stored paths]
    const fieldMap = {};     // fieldname -> [stored paths]
    if (req.files && req.files.length) {
      for (const f of req.files) {
        const orig = f.originalname;
        const stored = '/' + f.path.replace(/\\/g, '/');
        if (!fileMap[orig]) fileMap[orig] = [];
        fileMap[orig].push(stored);
        const key = f.fieldname || 'files';
        if (!fieldMap[key]) fieldMap[key] = [];
        fieldMap[key].push(stored);
      }
    }

    // Replace any __FILE__ placeholders in answers with actual stored paths.
    // Placeholder formats supported:
    //  - __FILE__:filename            (legacy)
    //  - __FILE__:<questionId>:filename(s)
    for (const k of Object.keys(answers)) {
      const v = answers[k];
      if (typeof v === 'string' && v.startsWith('__FILE__:')) {
        const parts = v.split(':');
        // parts[0] === '__FILE__'
        if (parts.length >= 3) {
          // __FILE__:<qid>:<filename...>
          const qid = parts[1];
          const fname = parts.slice(2).join(':');
          const fieldKey = `files_q${qid}`;
          const byField = fieldMap[fieldKey];
          if (byField && byField.length === 1) answers[k] = byField[0];
          else if (byField && byField.length > 1) answers[k] = byField;
          else {
            // fallback to original-name matching
            const found = fileMap[fname];
            if (found && found.length === 1) answers[k] = found[0];
            else if (found && found.length > 1) answers[k] = found;
            else answers[k] = v; // leave placeholder
          }
        } else if (parts.length === 2) {
          // legacy __FILE__:filename
          const fname = parts[1];
          const found = fileMap[fname];
          if (found && found.length === 1) answers[k] = found[0];
          else if (found && found.length > 1) answers[k] = found;
          else answers[k] = v;
        } else {
          answers[k] = v;
        }
      }
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { attemptLimit: true },
    });

    const attempts = await prisma.quizAttempt.count({
      where: { quizId, studentEmail },
    });

    if (attempts >= quiz.attemptLimit) {
      return res.status(403).json({ error: 'Attempt limit reached' });
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentEmail,
        answers: JSON.stringify(answers),
      },
    });

    res.json({ success: true, attempt });
  } catch (err) {
    console.error('Quiz submit error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

/* =====================================================
   DELETE QUIZ + QUESTIONS + ATTEMPTS
===================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Delete in correct order: attempts → questions → quiz
    await prisma.quizAttempt.deleteMany({ where: { quizId: id } });
    await prisma.quizQuestion.deleteMany({ where: { quizId: id } });
    await prisma.quiz.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    res.status(500).json({ error: "Server error deleting quiz" });
  }
});
/* =====================================================
   STUDENT — VIEW SCORE + THEIR ANSWERS (FIXED VERSION)
   Now returns submittedFiles so student can view uploads
===================================================== */
router.get("/:id/score", authMiddleware, async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const studentEmail = req.user.email;

    // Get latest attempt
    const attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, studentEmail },
      orderBy: { createdAt: "desc" },
    });

    if (!attempt)
      return res.status(404).json({ error: "No attempt found" });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    const studentAnswers = JSON.parse(attempt.answers);

    // ===============================
    // Extract any uploaded file paths
    // ===============================
    const submittedFiles = [];

    for (const q of quiz.questions) {
      const ans = studentAnswers[q.id];

      // Activity-type questions contain file uploads
      if (q.type === "Activity" && ans) {
        if (Array.isArray(ans)) {
          ans.forEach(file => submittedFiles.push(file));
        } else {
          submittedFiles.push(ans);
        }
      }
    }

    // Calculate score using per-question points (default 1)
    let score = 0;
    let totalPoints = 0;

    const details = quiz.questions.map((q) => {
      const rawAnswer = studentAnswers[q.id];

      // Activity questions do not contribute to points
      const qPoints =
        q.type === "Activity"
          ? 0
          : (q.points !== undefined && q.points !== null
              ? Number(q.points)
              : 1);

      if (q.type !== "Activity") totalPoints += qPoints;

      const correct = (q.answer || "").toString().trim().toLowerCase();
      const userAns = (rawAnswer ?? "").toString().trim().toLowerCase();

      const isCorrect =
        q.type === "Activity" ? false : correct === userAns;

      const awarded = isCorrect ? qPoints : 0;
      if (q.type !== "Activity") score += awarded;

      return {
        id: q.id,
        question: q.question,
        correctAnswer: q.answer,
        userAnswer: rawAnswer || "",
        isCorrect,
        points: qPoints,
        awarded,
        type: q.type,
        submitted:
          rawAnswer !== undefined &&
          rawAnswer !== null &&
          String(rawAnswer).trim() !== "",
      };
    });

    // ===============================
    // Return submittedFiles to FE (include name + absolute URL)
    // ===============================
    const submittedFilesMeta = submittedFiles.map((p) => {
      // ensure path starts with '/'
      const rel = p.startsWith("/") ? p : `/${p}`;
      const url = rel.startsWith("http") ? rel : `${req.protocol}://${req.get("host")}${rel}`;
      return { path: rel, url, name: path.basename(rel) };
    });

    return res.json({
      quizTitle: quiz.title,
      score,
      total: totalPoints,
      details,
      submittedFiles: submittedFilesMeta, // students receive objects with name + url
    });

  } catch (err) {
    console.error("🔥 SCORE ERROR:", err);
    res.status(500).json({ error: "Failed to load score" });
  }
});


/* =====================================================
   TEACHER — LIST ALL STUDENTS + THEIR LATEST SCORE
===================================================== */
router.get('/:id/scores', authMiddleware, async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const role = req.user.role;
    const userEmail = req.user.email;

    if (role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: true, module: true } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.teacherEmail !== userEmail) return res.status(403).json({ error: 'Forbidden' });

    // get latest attempt per student (ordered newest-first so first seen is latest)
    const attempts = await prisma.quizAttempt.findMany({ where: { quizId }, orderBy: { createdAt: 'desc' } });

    const seen = new Set();
    const results = [];

    const totalPoints = quiz.questions.reduce((s, q) => s + ((q.type !== 'Activity') ? (Number(q.points) || 1) : 0), 0);

    for (const a of attempts) {
      if (seen.has(a.studentEmail)) continue;
      seen.add(a.studentEmail);

      const answers = JSON.parse(a.answers || '{}');
      let score = 0;
      for (const q of quiz.questions) {
        if (q.type === 'Activity') continue;
        const qPoints = q.points !== undefined && q.points !== null ? Number(q.points) : 1;
        const correct = (q.answer || '').toString().trim().toLowerCase();
        const userAns = (answers[q.id] ?? '').toString().trim().toLowerCase();
        if (correct === userAns) score += qPoints;
      }

      results.push({
        studentEmail: a.studentEmail,
        score,
        total: totalPoints,
        attemptId: a.id,
        attemptedAt: a.createdAt,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Error loading quiz scores:', err);
    res.status(500).json({ error: 'Failed to load scores' });
  }
});

/* =====================================================
   TEACHER — LIST ALL ATTEMPTS FOR A QUIZ (detailed)
   Returns attempt objects so teacher can inspect answers/uploads
===================================================== */
router.get('/:id/attempts/list', authMiddleware, async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const role = req.user.role;
    const userEmail = req.user.email;

    if (role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.teacherEmail !== userEmail) return res.status(403).json({ error: 'Forbidden' });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attempts);
  } catch (err) {
    console.error('Error listing attempts:', err);
    res.status(500).json({ error: 'Failed to list attempts' });
  }
});

/* =====================================================
   TEACHER — LIST SUBMISSIONS FOR THE QUIZ'S MODULE
   (students may upload files via the module submissions endpoint)
===================================================== */
router.get('/:id/submissions', authMiddleware, async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    const role = req.user.role;
    const userEmail = req.user.email;

    if (role !== 'teacher') return res.status(403).json({ error: 'Forbidden' });

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { module: true } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.teacherEmail !== userEmail) return res.status(403).json({ error: 'Forbidden' });

    const submissions = await prisma.submission.findMany({ where: { moduleId: quiz.moduleId }, orderBy: { createdAt: 'desc' } });

    res.json(submissions);
  } catch (err) {
    console.error('Error listing submissions:', err);
    res.status(500).json({ error: 'Failed to list submissions' });
  }
});

export default router;

