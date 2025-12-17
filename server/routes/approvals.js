const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

// Middleware to protect routes
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* -----------------------------------------------------
    GET PENDING TEACHERS
----------------------------------------------------- */
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: { role: "teacher", isApproved: false },
      select: { id: true, name: true, email: true }
    });

    return res.json(pending);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------
    APPROVE TEACHER
----------------------------------------------------- */
router.post("/approve/:id", authMiddleware, async (req, res) => {
  const teacherId = parseInt(req.params.id);

  try {
    await prisma.user.update({
      where: { id: teacherId },
      data: { isApproved: true }
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
