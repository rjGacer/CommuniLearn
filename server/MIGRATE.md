Run these commands locally to apply the Prisma schema change and update the database:

1. Install Prisma CLI (if not already):

   npm install -D prisma

2. Generate a migration for the schema change you just pulled:

   npx prisma migrate dev --name add-announcement-filename

   This will:
   - create a SQL migration in `prisma/migrations`
   - apply it to your local dev database
   - regenerate the Prisma client

3. (Optional) If your setup requires it, re-generate the client explicitly:

   npx prisma generate

4. Restart your backend server so the updated route and Prisma client are used.

Notes:
- The schema change adds an optional `fileName` field to the `Announcement` model to persist the original filename uploaded by the user.
- After migration, newly created announcements will include `fileName` in the API responses.
