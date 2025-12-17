import express from "express";
import cors from "cors";
import path from "path";

// import routes
import moduleRoutes from "./routes/modules.js";
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import studentRoutes from "./routes/students.js";
import moduleComments from "./routes/moduleComments.js";
import announcementRoutes from "./routes/announcement.js";
import attendanceRoutes from "./routes/attendance.js";
import profileRoutes from "./routes/profile.js";


const app = express();

// CORS: allow only known origins and enable credentials
const allowedOrigins = [
  "http://localhost:5173",
  "https://communilearn-58p8.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// mount all routes
app.use("/api/modules", moduleRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/profile", profileRoutes);

app.get("/", (req, res) => {
  res.send("CommuniLearn API is running");
});

// Temporary debug endpoint to verify routing after deploy
app.get("/api/auth/test", (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Serve frontend static files if present (helpful when hosting frontend from the same server)
const distPath = path.join(process.cwd(), "CommuniLearn", "dist");
try {
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    // If request looks like an API call, skip and let API routes handle it
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} catch (e) {
  // ignore if dist not present in this environment
}

app.use("/api/students", studentRoutes);
app.use("/api/module-comments", moduleComments);
app.use("/api/announcements", announcementRoutes);

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});
