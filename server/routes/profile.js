import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Uploads directory (server/uploads/avatars)
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const id = (req.user && req.user.id) ? req.user.id : Date.now();
    cb(null, `avatar_${id}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (e) {
  console.log('Prisma client not available in profile routes, will use JSON fallback');
}

// POST /profile/avatar - accepts multipart/form-data 'avatar' file and returns URL
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    return res.json({ url });
  } catch (e) {
    console.error('avatar upload error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Helper JSON fallback store
const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const usersFile = path.join(dataDir, 'users.json');
function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) return {};
    return JSON.parse(fs.readFileSync(usersFile, 'utf8') || '{}');
  } catch (e) {
    console.error('readUsers error', e);
    return {};
  }
}
function writeUsers(obj) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeUsers error', e);
    return false;
  }
}

// PUT /profile - update profile for authenticated user
router.put('/', authMiddleware, async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Unauthorized' });

  const { name, picture, bio, studentId } = req.body || {};

  if (prisma) {
    try {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          name: name !== undefined ? name : undefined,
          picture: picture !== undefined ? picture : undefined,
          bio: bio !== undefined ? bio : undefined,
          studentId: studentId !== undefined ? studentId : undefined,
        }
      });
      return res.json({ user: updated });
    } catch (e) {
      console.error('Prisma update failed in profile PUT, falling back to JSON store', e);
      // fall through to JSON fallback
    }
  }

  // JSON fallback
  const users = readUsers();
  const existing = users[email] || {};
  const updated = Object.assign({}, existing, {
    email,
    name: name !== undefined ? name : existing.name,
    picture: picture !== undefined ? picture : existing.picture,
    bio: bio !== undefined ? bio : existing.bio,
    studentId: studentId !== undefined ? studentId : existing.studentId,
    updatedAt: new Date().toISOString()
  });
  users[email] = updated;
  const ok = writeUsers(users);
  if (!ok) return res.status(500).json({ error: 'Failed to persist profile' });
  return res.json({ user: updated });
});

// GET /profile/:email - anyone can read a profile
router.get('/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  if (prisma) {
    try {
      const u = await prisma.user.findUnique({ where: { email } });
      return res.json({ user: u || null });
    } catch (e) {
      console.error('Prisma findUnique failed in profile GET, falling back to JSON', e);
      // fall through
    }
  }

  const users = readUsers();
  const u = users[email] || null;
  return res.json({ user: u });
});

export default router;
