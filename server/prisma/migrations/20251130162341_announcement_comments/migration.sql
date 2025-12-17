-- CreateTable
CREATE TABLE "AnnouncementComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "announcementId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementComment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
