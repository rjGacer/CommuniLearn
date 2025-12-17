Render deployment checklist

1) Frontend (Static Site)

- Repository: your repo
- Branch: main
- Root Directory: leave blank (we use root `package.json`), OR set to `CommuniLearn` and use commands below.
- Build Command (option A - root):
  npm run build

  (option B - if Root Directory = CommuniLearn):
  npm ci && npx vite build

- Publish Directory (option A - root build):
  CommuniLearn/dist
  (option B - root = CommuniLearn):
  dist

- Environment variables:
  VITE_API_URL = https://communilearn-backend.onrender.com
  (optional if permission errors) NPM_CONFIG_UNSAFE_PERM = true

- Add a Rewrite rule (VERY IMPORTANT):
  Source: /*
  Destination: /index.html
  Type: Rewrite

2) Backend (API) - Render service

- Start Command: node server.js (or npm start if defined)
- Ensure `server/server.js` is used as the entry and contains `app.use('/api/...')` mounts.
- Ensure CORS allows your frontend origin (example in repo already sets allowedOrigins).

3) Quick verification (after both redeploys)

- Backend test:
  curl -i https://communilearn-backend.onrender.com/api/auth/test
  Expected: HTTP 200 JSON { ok: true, now: "..." }

- Frontend test (after redeploy):
  Open: https://communilearn-58p8.onrender.com/teacher/module/3
  Expect: page loads (index.html served) and API calls go to https://communilearn-backend.onrender.com/api/...

- API JSON check:
  curl -i https://communilearn-backend.onrender.com/api/students/approved/count

4) If JS MIME or module errors persist

- If backend serves the frontend, ensure Express `express.static` is used and sets correct Content-Type for `.js` (server/server.js contains a snippet for this).
- If Render static site serves frontend, ensure Publish Directory points to the `dist` produced by Vite and not to the project root.

5) Helpful commands to run locally before deploying

```bash
cd CommuniLearn
npm ci
npx vite build
# confirm /api usage in built assets
grep -n "/api/" -R dist || true
```

If you want, I can also add a short health-check script or a small CI job to validate both endpoints after each push.
