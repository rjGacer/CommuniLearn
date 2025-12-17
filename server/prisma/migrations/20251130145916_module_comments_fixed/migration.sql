/*
  Warnings:

  - You are about to drop the column `author` on the `ModuleComment` table. All the data in the column will be lost.
  - Added the required column `authorEmail` to the `ModuleComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorName` to the `ModuleComment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModuleComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moduleId" INTEGER NOT NULL,
    CONSTRAINT "ModuleComment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModuleComment" ("createdAt", "id", "moduleId", "text") SELECT "createdAt", "id", "moduleId", "text" FROM "ModuleComment";
DROP TABLE "ModuleComment";
ALTER TABLE "new_ModuleComment" RENAME TO "ModuleComment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
