PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1) Add nullable columns so ALTER TABLE succeeds
-- (ALTER + backfill removed because column already exists in DB history)

-- 3) Recreate ModuleComment with NOT NULL updatedAt
CREATE TABLE "new_ModuleComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moduleId" INTEGER NOT NULL,
    CONSTRAINT "ModuleComment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModuleComment" ("id","text","authorName","authorEmail","createdAt","updatedAt","moduleId")
SELECT "id","text","authorName","authorEmail","createdAt","updatedAt","moduleId" FROM "ModuleComment";
DROP TABLE "ModuleComment";
ALTER TABLE "new_ModuleComment" RENAME TO "ModuleComment";

-- 4) Recreate AnnouncementComment with NOT NULL updatedAt
CREATE TABLE "new_AnnouncementComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "announcementId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementComment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AnnouncementComment" ("id","announcementId","authorName","authorEmail","text","createdAt","updatedAt")
SELECT "id","announcementId","authorName","authorEmail","text","createdAt","updatedAt" FROM "AnnouncementComment";
DROP TABLE "AnnouncementComment";
ALTER TABLE "new_AnnouncementComment" RENAME TO "AnnouncementComment";

PRAGMA defer_foreign_keys=OFF;
PRAGMA foreign_keys=ON;
