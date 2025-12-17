import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Count approved students
router.get("/approved/count", async (req, res) => {
  try {
    const count = await prisma.user.count({
      where: {
        role: "student",
        approved: true
      }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to count students" });
  }
});

// Count pending (not yet approved) student registrants
router.get("/pending/count", async (req, res) => {
  try {
    const count = await prisma.user.count({
      where: {
        role: "student",
        approved: false
      }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to count pending students" });
  }
});

// List approved students (id, name, email)
router.get("/", async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student', approved: true },
      select: { id: true, name: true, email: true }
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list students' });
  }
});

export default router;
