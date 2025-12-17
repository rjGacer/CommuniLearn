-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnnouncementComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "announcementId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnnouncementComment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnnouncementComment" ("announcementId", "authorEmail", "authorName", "createdAt", "id", "text", "updatedAt") SELECT "announcementId", "authorEmail", "authorName", "createdAt", "id", "text", "updatedAt" FROM "AnnouncementComment";
DROP TABLE "AnnouncementComment";
ALTER TABLE "new_AnnouncementComment" RENAME TO "AnnouncementComment";
CREATE TABLE "new_ModuleComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "moduleId" INTEGER NOT NULL,
    CONSTRAINT "ModuleComment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModuleComment" ("authorEmail", "authorName", "createdAt", "id", "moduleId", "text", "updatedAt") SELECT "authorEmail", "authorName", "createdAt", "id", "moduleId", "text", "updatedAt" FROM "ModuleComment";
DROP TABLE "ModuleComment";
ALTER TABLE "new_ModuleComment" RENAME TO "ModuleComment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
