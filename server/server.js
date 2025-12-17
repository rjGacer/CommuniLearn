import express from "express";
import cors from "cors";

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

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// mount all routes
app.use("/modules", moduleRoutes);
app.use("/auth", authRoutes);   // ✅ THIS FIXES YOUR 404 ERROR
app.use("/quizzes", quizRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/profile", profileRoutes);

app.get("/", (req, res) => {
  res.send("CommuniLearn API is running");
});

app.listen(5000, () => console.log("Server running on port 5000"));
app.use("/students", studentRoutes);
app.use("/module-comments", moduleComments);
app.use("/announcement", announcementRoutes);