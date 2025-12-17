-- CreateTable
CREATE TABLE "Enrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentEmail" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    CONSTRAINT "Enrollment_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "User" ("email") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuizAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quizId" INTEGER NOT NULL,
    "quizQuestionId" INTEGER,
    "studentEmail" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_quizQuestionId_fkey" FOREIGN KEY ("quizQuestionId") REFERENCES "QuizQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_studentEmail_fkey" FOREIGN KEY ("studentEmail") REFERENCES "User" ("email") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuizAttempt" ("answers", "createdAt", "id", "quizId", "quizQuestionId", "studentEmail") SELECT "answers", "createdAt", "id", "quizId", "quizQuestionId", "studentEmail" FROM "QuizAttempt";
DROP TABLE "QuizAttempt";
ALTER TABLE "new_QuizAttempt" RENAME TO "QuizAttempt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
