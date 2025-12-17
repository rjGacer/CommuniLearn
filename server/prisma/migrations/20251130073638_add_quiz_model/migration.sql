-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" INTEGER NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "teacherEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
