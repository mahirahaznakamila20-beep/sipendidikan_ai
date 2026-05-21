# siPENDIdikan_AI

Smart Islamic Platform for Educators and Digital Learning with AI.

## Struktur Proyek

- `/client` - front-end HTML/CSS/JavaScript
- `/server` - Node.js + Express backend
- `/database` - SQL schema dan seed data

## Persiapan

1. Salin `.env.example` ke `.env`
2. Isi variabel:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (atau `SUPABASE_SERVICE_ROLE_KEY` untuk operasi admin Supabase)
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `GROQ_API_URL`
   - `PORT` (opsional, default `5000`)
   - `BASE_URL` (opsional untuk skrip pengujian, default `http://localhost:5000`)
3. Pastikan Supabase sudah dibuat dari `database/schema.sql`.

## Instalasi

```bash
cd d:\newsipendi\server
npm install
```

## Menjalankan Server

```bash
npm start
```

## API Endpoints Utama

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/password-reset`
- `GET /api/auth/me`
- `GET /api/admin/schools`
- `POST /api/admin/schools`
- `GET /api/admin/users`
- `POST /api/admin/subjects`
- `POST /api/admin/classes`
- `GET /api/teacher/school`
- `POST /api/teacher/bank/generate`
- `GET /api/student/exams`

## Deploy Ready

- Siapkan Supabase PostgreSQL dan masukkan `schema.sql`
- Pasang environment variables di hosting
- Deploy server Node.js ke platform apa pun yang mendukung Express
- Gunakan `client/index.html` sebagai front-end statis

## Deploy ke Vercel

1. Pastikan root repo memiliki `package.json`, `vercel.json`, dan `.vercelignore`.
2. Pastikan `server/package.json` berisi semua dependencies runtime.
3. Di Vercel, atur project root ke folder repo ini.
4. Gunakan `vercel` atau UI Vercel untuk deploy.
5. Jika perlu, set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `GROQ_API_URL`
   - `PORT` (opsional)

## Koneksi Supabase

Gunakan `SUPABASE_URL` dan `SUPABASE_KEY` pada `.env`.

## Koneksi GROQ API

Gunakan `GROQ_API_KEY` dan `GROQ_API_URL` pada `.env`.
