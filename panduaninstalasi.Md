# Panduan Instalasi siPENDIdikan_AI

## 1. Prasyarat
- Node.js 18+ terpasang
- npm atau yarn terpasang
- Supabase project dan database PostgreSQL
- Akun Vercel untuk deployment

## 2. Struktur Proyek
- `/client` - front-end statis
- `/server` - backend Express
- `/database` - SQL schema
- `vercel.json` - konfigurasi deployment Vercel
- `.vercelignore` - file yang diabaikan saat deploy
- `package.json` (root) - workspace Vercel

## 3. Persiapan Environment
1. Salin file `.env.example` ke `.env` di root proyek.
2. Isi variabel berikut:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `GROQ_API_URL`
   - `PORT` (opsional, default `5000`)
   - `BASE_URL` (opsional, default `http://localhost:5000`)
3. Pastikan Supabase sudah dibuat schema-nya dari `database/schema.sql`.

## 4. Instalasi Lokal
1. Buka terminal di root folder `d:\newsipendi`
2. Jalankan:
   ```bash
   npm install
   ```
3. Masuk ke folder server untuk memastikan dependency terpasang:
   ```bash
   cd server
   npm install
   ```

## 5. Menjalankan Aplikasi Secara Lokal
1. Jalankan server di folder `server`:
   ```bash
   npm start
   ```
2. Buka browser di:
   ```text
   http://localhost:5000
   ```

## 6. Struktur Konfigurasi Vercel
File `vercel.json` sudah disiapkan untuk:
- build backend dari `server/index.js`
- route `/api/*` ke Express backend
- route asset statis `/css/*` dan `/js/*` ke folder `client`
- route fallback ke `client/index.html`

File `.vercelignore` sudah dibuat agar folder yang tidak diperlukan tidak terupload.

## 7. Deploy ke Vercel
1. Pastikan repository berada di root project `d:\newsipendi`.
2. Pastikan `package.json` root ada, `vercel.json`, dan `.vercelignore` ada.
3. Login ke Vercel (jika belum):
   ```bash
   npx vercel login
   ```
4. Deploy dari root:
   ```bash
   npx vercel
   ```
5. Di dashboard Vercel, atur environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `GROQ_API_URL`
   - `PORT` (opsional)
6. Deploy ulang setelah environment variables tersedia.

## 8. Catatan Penting
- Backend menggunakan Express dan menyediakan API di `/api/*`.
- Frontend statis dilayani oleh Express dari folder `client`.
- Pastikan file `.env` tidak diikutkan ke Vercel; file ini hanya untuk lokal.
- Jika menggunakan Vercel, backend akan berjalan sebagai serverless Node.js.

## 9. Verifikasi Setelah Deploy
- Akses URL Vercel hasil deploy.
- Pastikan halaman login muncul.
- Pastikan request ke API `/api/auth/login` berhasil.
- Jika terjadi error, cek log Vercel dan pastikan semua env vars sudah diset.

## 10. Troubleshooting
- Jika server tidak berjalan karena Supabase config:
  - pastikan `SUPABASE_URL` dan `SUPABASE_KEY` benar.
- Jika `npm start` gagal:
  - jalankan `cd server && node index.js` untuk melihat error runtime.
- Jika halaman tidak muncul di Vercel:
  - cek `vercel.json` dan pastikan route fallback ke `client/index.html`.
