//old_index.js
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

app.use(cors());
app.use(express.json());

app.post("/modules", async (req, res) => {
  try {
    const { title, description, teacherEmail } = req.body;
    if (!title || !description || !teacherEmail) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const moduleData = await prisma.module.create({
      data: { title, description, teacherEmail }
    });
    res.json(moduleData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create module" });
  }
});

app.get("/modules/:teacherEmail", async (req, res) => {
  try {
    const { teacherEmail } = req.params;
    const modules = await prisma.module.findMany({
      where: { teacherEmail },
      orderBy: { createdAt: "desc" }
    });
    res.json(modules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
