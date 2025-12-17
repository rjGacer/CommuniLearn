Server setup (inside /server)

1. Install dependencies:
   npm install

2. Initialize Prisma and create SQLite DB:
   npx prisma generate
   npx prisma migrate dev --name init

   (If you want to skip migrations you can run `npx prisma db push` then `npx prisma generate`)

3. Start server:
   npm run dev

API endpoints:
- POST /modules
  body: { title, description, teacherEmail }
- GET /modules/:teacherEmail
