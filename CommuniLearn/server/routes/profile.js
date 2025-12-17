const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
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

// POST /api/profile/avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
  // NOTE: upload endpoint only returns the URL. Persistence to a user record
  // is done by the client calling PUT /api/profile with the user's email
  // and the returned `url` as the `picture` field.
  res.json({ url });
});

// Try to use Prisma if available; otherwise fall back to the JSON store.
let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('Prisma client initialized for profile persistence');
} catch (e) {
  console.log('Prisma client not available, falling back to JSON store');
}

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const usersFile = path.join(dataDir, 'users.json');

function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) return {};
    const txt = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(txt || '{}');
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
    console.error('Failed to write users file', e);
    return false;
  }
}

// PUT /api/profile - persist profile fields (expects JSON { email, name, picture, bio, studentId })
router.put('/', async (req, res) => {
  const { email, name, picture, bio, studentId, role } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required to update profile' });

  if (prisma) {
    try {
      // upsert by email
      const u = await prisma.user.upsert({
        where: { email },
        update: {
          name: name !== undefined ? name : undefined,
          picture: picture !== undefined ? picture : undefined,
          bio: bio !== undefined ? bio : undefined,
          studentId: studentId !== undefined ? studentId : undefined,
          role: role !== undefined ? role : undefined
        },
        create: {
          email,
          name: name || null,
          picture: picture || null,
          bio: bio || null,
          studentId: studentId || null,
          role: role || null
        }
      });
      return res.json({ user: u });
    } catch (e) {
      console.error('Prisma upsert error', e);
      return res.status(500).json({ error: 'Failed to persist profile (db)' });
    }
  }

  // fallback to JSON store
  const users = readUsers();
  const existing = users[email] || {};
  const updated = Object.assign({}, existing, {
    email,
    name: name !== undefined ? name : existing.name,
    picture: picture !== undefined ? picture : existing.picture,
    bio: bio !== undefined ? bio : existing.bio,
    studentId: studentId !== undefined ? studentId : existing.studentId,
    role: role !== undefined ? role : existing.role,
    updatedAt: new Date().toISOString()
  });
  users[email] = updated;
  const ok = writeUsers(users);
  if (!ok) return res.status(500).json({ error: 'Failed to persist profile' });
  return res.json({ user: updated });
});

// GET /api/profile - retrieve current authenticated user's profile
const authMiddleware = require('../middleware/authMiddleware');
router.get('/', authMiddleware, async (req, res) => {
  try {
    const email = req.user && req.user.email;
    if (!email) return res.status(404).json({ user: null });
    if (prisma) {
      try {
        const u = await prisma.user.findUnique({ where: { email } });
        return res.json({ user: u || req.user });
      } catch (e) {
        console.error('Prisma findUnique error (profile /):', e);
        return res.json({ user: req.user });
      }
    }
    // fallback: return user from JSON store if available
    const users = readUsers();
    const u = users[email] || req.user;
    return res.json({ user: u });
  } catch (e) {
    console.error('GET /profile error', e);
    return res.status(500).json({ error: 'Failed to read profile' });
  }
});

// GET /api/profile/:email - retrieve profile by email
router.get('/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) return res.status(400).json({ error: 'email required' });
  if (prisma) {
    try {
      const u = await prisma.user.findUnique({ where: { email } });
      return res.json({ user: u || null });
    } catch (e) {
      console.error('Prisma findUnique error', e);
      return res.status(500).json({ error: 'Failed to read profile (db)' });
    }
  }
  const users = readUsers();
  const u = users[email] || null;
  return res.json({ user: u });
});

module.exports = router;
