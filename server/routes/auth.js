import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();
const prisma = new PrismaClient();

// JWT SECRET
const JWT_SECRET = "COMMUNILEARN_SECRET_KEY";

// --------------------------------------------------
// SIGNUP (student OR teacher)
// --------------------------------------------------
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (teachers require approval)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "student",
        approved: false // teacher must be approved
      },
    });

    res.json({ success: true, message: "Signup successful", user: newUser });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// LOGIN (fixed for student + teacher approval checks)
// --------------------------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid email or password" });

    // Block unapproved teacher
    if (user.role === "teacher" && !user.approved) {
      return res.status(403).json({ error: "Your teacher account is awaiting approval." });
    }

    // Block unapproved student
    if (user.role === "student" && !user.approved) {
      return res.status(403).json({ error: "Your student account is awaiting approval." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
        bio: user.bio || null,
        picture: user.picture || null,
        studentId: user.studentId || null
      },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET PENDING ACCOUNTS
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      // teacher approves students
      const pendingStudents = await prisma.user.findMany({
        where: { role: "student", approved: false },
        select: { id: true, name: true, email: true, role: true }
      });
      return res.json(pendingStudents);
    }

    if (req.user.role === "superteacher") {
      // superteacher approves teachers
      const pendingTeachers = await prisma.user.findMany({
        where: { role: "teacher", approved: false },
        select: { id: true, name: true, email: true, role: true }
      });
      return res.json(pendingTeachers);
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias route for frontend: GET /auth/pending-users
router.get("/pending-users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const pendingStudents = await prisma.user.findMany({
        where: { role: "student", approved: false },
        select: { id: true, name: true, email: true, role: true }
      });
      return res.json(pendingStudents);
    }

    if (req.user.role === "superteacher") {
      const pendingTeachers = await prisma.user.findMany({
        where: { role: "teacher", approved: false },
        select: { id: true, name: true, email: true, role: true }
      });
      return res.json(pendingTeachers);
    }

    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/approve/:id", authMiddleware, async (req, res) => {
  const teacherId = parseInt(req.params.id);

  try {
    const user = await prisma.user.update({
      where: { id: teacherId },
      data: { approved: true }
    });

    // ⭐ AUTO-ENROLL STUDENT INTO ALL MODULES
    if (user.role === "student") {
      const modules = await prisma.module.findMany();

      for (const m of modules) {
        await prisma.enrollment.create({
          data: {
            studentEmail: user.email,
            moduleId: m.id
          }
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

// DENY USER
router.post("/deny/:id", authMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });

    if (!target) return res.status(404).json({ error: "User not found" });

    // Teacher → can deny students
    if (req.user.role === "teacher" && target.role === "student") {
      await prisma.user.delete({ where: { id: userId } });
      return res.json({ success: true, message: "Student denied & removed." });
    }

    // SuperTeacher → can deny teachers
    if (req.user.role === "superteacher" && target.role === "teacher") {
      await prisma.user.delete({ where: { id: userId } });
      return res.json({ success: true, message: "Teacher denied & removed." });
    }

    return res.status(403).json({ error: "Access denied" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /auth/remove/:id - remove a student (teacher) or teacher (superteacher)
router.delete('/remove/:id', authMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Teachers may remove students; superteacher may remove teachers
    if (req.user.role === 'teacher' && target.role === 'student') {
      // delete enrollments and related submissions if any
      await prisma.enrollment.deleteMany({ where: { studentEmail: target.email } }).catch(()=>{});
      await prisma.submission.deleteMany({ where: { studentEmail: target.email } }).catch(()=>{});
      await prisma.user.delete({ where: { id: userId } });
      return res.json({ success: true, message: 'Student removed.' });
    }

    if (req.user.role === 'superteacher' && target.role === 'teacher') {
      await prisma.user.delete({ where: { id: userId } });
      return res.json({ success: true, message: 'Teacher removed.' });
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Error removing user', err);
    return res.status(500).json({ error: err.message });
  }
});
// GET approved students
router.get("/approved", authMiddleware, async (req, res) => {
  try {
    const approvedUsers = await prisma.user.findMany({
      where: { approved: true, role: "student" },
      select: { id: true, name: true, email: true }
    });

    return res.json(approvedUsers);
  } catch (error) {
    console.error("Error fetching approved students:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET TEACHERS (approved)
router.get('/teachers', authMiddleware, async (req, res) => {
  try {
    // return approved teachers with creation date for recent feed
    // NOTE: `createdAt` is not present on the `User` model in the Prisma schema.
    // Select only existing fields. If you need teacher creation timestamps,
    // add `createdAt DateTime @default(now())` to the `User` model in
    // `prisma/schema.prisma` and run `prisma migrate`.
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher', approved: true },
      select: { id: true, name: true, email: true, role: true, approved: true }
    });
    return res.json(teachers);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    return res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});




export default router;

// --------------------------------------------------
// PROFILE AVATAR UPLOAD
// --------------------------------------------------
const avatarDir = "uploads/avatars";
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const avatarUpload = multer({ storage: avatarStorage });

// POST /auth/profile/avatar - upload avatar (authenticated)
router.post('/profile/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = '/' + req.file.path.replace(/\\/g, '/');
    return res.json({ success: true, url });
  } catch (err) {
    console.error('Avatar upload error', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /auth/profile - update profile fields (name, email, bio, studentId, picture)
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email: newEmail, bio, studentId, picture } = req.body;
  try {
    const currentEmail = req.user.email;

    // If attempting to change email, ensure uniqueness
    if (newEmail && newEmail !== currentEmail) {
      const exists = await prisma.user.findUnique({ where: { email: newEmail } });
      if (exists) return res.status(400).json({ error: 'Email already in use' });
    }

    // Only persist fields that exist on the User model (name & email).
    const updatedUser = await prisma.user.update({
      where: { email: currentEmail },
      data: {
        name: name ?? undefined,
        email: newEmail ?? undefined,
        bio: bio ?? undefined,
        studentId: studentId ?? undefined,
        picture: picture ?? undefined
      }
    });

    // If email changed, propagate to related tables
    if (newEmail && newEmail !== currentEmail) {
      const old = currentEmail;
      const nw = newEmail;
      try { await prisma.enrollment.updateMany({ where: { studentEmail: old }, data: { studentEmail: nw } }); } catch(e){}
      try { await prisma.quizAttempt.updateMany({ where: { studentEmail: old }, data: { studentEmail: nw } }); } catch(e){}
      try { await prisma.submission.updateMany({ where: { studentEmail: old }, data: { studentEmail: nw } }); } catch(e){}
      try { await prisma.attendanceMark.updateMany({ where: { studentEmail: old }, data: { studentEmail: nw } }); } catch(e){}
      try { await prisma.moduleComment.updateMany({ where: { authorEmail: old }, data: { authorEmail: nw } }); } catch(e){}
      try { await prisma.announcementComment.updateMany({ where: { authorEmail: old }, data: { authorEmail: nw } }); } catch(e){}
      // if teacher, update teacherEmail fields
      if (updatedUser.role === 'teacher' || updatedUser.role === 'superteacher') {
        try { await prisma.module.updateMany({ where: { teacherEmail: old }, data: { teacherEmail: nw } }); } catch(e){}
        try { await prisma.quiz.updateMany({ where: { teacherEmail: old }, data: { teacherEmail: nw } }); } catch(e){}
        try { await prisma.attendance.updateMany({ where: { teacherEmail: old }, data: { teacherEmail: nw } }); } catch(e){}
        try { await prisma.announcement.updateMany({ where: { teacherEmail: old }, data: { teacherEmail: nw } }); } catch(e){}
      }
    }

    // If email changed, issue a new token so client can replace stored token
    if (newEmail && newEmail !== currentEmail) {
      const newToken = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token: newToken, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, approved: updatedUser.approved, bio: updatedUser.bio || null, picture: updatedUser.picture || null, studentId: updatedUser.studentId || null } });
    }

    return res.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, approved: updatedUser.approved, bio: updatedUser.bio || null, picture: updatedUser.picture || null, studentId: updatedUser.studentId || null } });
  } catch (err) {
    console.error('Profile update error', err);
    return res.status(500).json({ error: err.message });
  }
});
