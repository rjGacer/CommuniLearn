/*
  Warnings:

  - You are about to drop the column `videoPath` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Module` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "teacherEmail" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "documentPath" TEXT,
    "mediaPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Module" ("createdAt", "description", "documentPath", "id", "teacherEmail", "title") SELECT "createdAt", "description", "documentPath", "id", "teacherEmail", "title" FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Module" RENAME TO "Module";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
