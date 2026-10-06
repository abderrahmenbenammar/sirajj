# SIRAJ

SIRAJ is a bilingual Arabic/English learning platform for structured Islamic studies. It includes courses and lessons, student progress and certificates, matn memorization and quizzes, and an admin area for managing learning content.

## Requirements

- Node.js 20 or newer
- npm
- A PostgreSQL database (the production setup uses Supabase)

## Local setup

1. Install dependencies and create your local environment file:

   ```bash
   npm ci
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

2. Set `DATABASE_URL` to the pooled PostgreSQL connection string and `DIRECT_URL` to the direct connection string. Set `AUTH_SECRET` to a unique secret and `APP_URL` to `http://localhost:3000`.

3. Apply the checked-in migrations and load the starter data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the complete list. The core variables are:

- `DATABASE_URL`, `DIRECT_URL`: PostgreSQL pooled and direct database connections.
- `AUTH_SECRET`: secret used by Auth.js.
- `APP_URL`: canonical application URL, including the production URL after deployment.
- `GOOGLE_GENERATIVE_AI_API_KEY`: enables AI matn grading and assisted quiz generation.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase Storage access.
- `YOUTUBE_API_KEY`: optional; used to retrieve YouTube lesson durations.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: optional email delivery for account verification and password reset.

Keep secrets in the local `.env` file or your hosting provider's environment settings. Never commit secret values.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npx tsc --noEmit` | Check TypeScript types. |
| `npm run build` | Generate Prisma Client and build the app. |
| `npm run db:migrate` | Apply checked-in Prisma migrations. |
| `npm run db:seed` | Load starter categories and FAQ data. |
| `npm run db:studio` | Open Prisma Studio. |

For a schema change during development, create a migration with `npx prisma migrate dev --name describe_change`, then commit the migration directory. Use `npm run db:migrate` to apply committed migrations in staging and production.

## Deployment

The Vercel build command in `vercel.json` applies committed database migrations before building the Next.js app. Configure all required environment variables in the Vercel project settings for each environment, and ensure the database credentials can apply migrations. Vercel deployments use the same PostgreSQL database configuration described above.
