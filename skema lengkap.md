# Skema Lengkap Aplikasi siPENDIdikan_AI

## 1. Tujuan Aplikasi
Aplikasi ini adalah backend + frontend sederhana untuk platform edukasi berbasis sekolah, khususnya untuk guru dan siswa. Fitur utama meliputi:
- Registrasi dan login guru, siswa, serta admin
- Manajemen sekolah dan akun pengguna
- Bank soal dan generator soal AI untuk guru
- Manajemen kelas, mapel, siswa, dan ujian
- Sistem ujian berbasis token
- Manajemen modul pembelajaran dan tugas

Aplikasi difokuskan pada isolasi data per sekolah: setiap pengguna hanya bisa melihat/mengelola data dari sekolahnya sendiri.

## 2. Teknologi yang Digunakan
- Node.js
- Express
- Supabase (PostgreSQL + Auth)
- Zod untuk validasi input
- bcryptjs untuk hash password
- JSON Web Token (JWT) untuk autentikasi
- Multer untuk upload file
- Helmet, cors, morgan, winston, rate-limit untuk keamanan dan logging
- Groq AI API untuk generator soal berbasis AI
- Frontend statis: HTML/CSS/JavaScript

## 3. Struktur Folder Utama
```
newsipendi/
  client/
    index.html
    css/style.css
    js/app.js
  database/
    schema.sql
    migration_*.sql
  server/
    app.js
    index.js
    package.json
    controllers/
    middlewares/
    routes/
    services/
    utils/
    validators/
    uploads/
```

## 4. Struktur Data Utama
Data dipecah ke dalam tabel utama berikut yang dibuat di `database/schema.sql`.

### 4.1 schools
- `id` uuid PK
- `school_name` text not null
- `npsn` text unique not null
- `principal_name` text
- `principal_nip` text
- `address` text
- `phone` text
- `created_at`, `updated_at`

### 4.2 users
- `id` uuid PK, FK ke `auth.users(id)`
- `username` text not null
- `email` text unique not null
- `password_hash` text not null
- `role` enum `admin|guru|siswa`
- `school_id` uuid, FK ke `schools(id)`
- `created_at`, `updated_at`

### 4.3 teachers
- `id` uuid PK
- `user_id` uuid unique, FK ke `users(id)`
- `school_id` uuid not null, FK ke `schools(id)`
- `teacher_name` text not null
- `teacher_nip` text
- `created_at`, `updated_at`

### 4.4 students
- `id` uuid PK, FK ke `auth.users(id)`
- `school_id` uuid not null, FK ke `schools(id)`
- `student_name` text not null
- `nisn` text unique not null
- `password_hash` text not null
- `class_id` uuid, FK ke `classes(id)`
- `created_at`, `updated_at`

### 4.5 subjects
- `id` uuid PK
- `subject_name` text unique not null
- `created_at`, `updated_at`

### 4.6 classes
- `id` uuid PK
- `class_name` text unique not null
- `created_at`, `updated_at`

### 4.7 teacher_subjects
- `id` uuid PK
- `teacher_id` uuid FK ke `teachers(id)`
- `subject_id` uuid FK ke `subjects(id)`
- Unique(`teacher_id`, `subject_id`)

### 4.8 teacher_classes
- `id` uuid PK
- `teacher_id` uuid FK ke `teachers(id)`
- `class_id` uuid FK ke `classes(id)`
- Unique(`teacher_id`, `class_id`)

### 4.9 question_banks
- `id` uuid PK
- `school_id` uuid not null, FK ke `schools(id)`
- `teacher_id` uuid not null, FK ke `teachers(id)`
- `subject_id` uuid FK ke `subjects(id)`
- `class_id` uuid FK ke `classes(id)`
- `question_type`, `question_text`, `options_json`, `answer_key`, `explanation`, `bloom_level`, `image_url`
- `created_at`, `updated_at`

### 4.10 ai_generation_logs
- `id` uuid PK
- `teacher_id` uuid not null, FK ke `teachers(id)`
- `school_id` uuid not null, FK ke `schools(id)`
- `subject_id` uuid not null, FK ke `subjects(id)`
- `class_id` uuid FK ke `classes(id)`
- `prompt`, `parameters`, `generated_count`
- `created_at`

### 4.11 exams
- `id` uuid PK
- `title` text not null
- `school_id` uuid not null, FK ke `schools(id)`
- `class_id` uuid not null, FK ke `classes(id)`
- `subject_id` uuid not null, FK ke `subjects(id)`
- `package_id` uuid FK ke `question_packages(id)`
- `token` text unique not null
- `start_time`, `end_time`
- `randomized`, `randomize_options`, `auto_submit`, `show_realtime_score`, `description`
- `created_at`, `updated_at`

### 4.12 exam_questions
- `id` uuid PK
- `exam_id` uuid not null, FK ke `exams(id)`
- `question_bank_id` uuid not null, FK ke `question_banks(id)`
- `sequence` integer not null
- Unique(`exam_id`, `sequence`)

### 4.13 exam_results
- `id` uuid PK
- `exam_id` uuid not null, FK ke `exams(id)`
- `student_id` uuid not null, FK ke `students(id)`
- `score` numeric, batas 0-100
- `answers` jsonb
- `submitted_at`

### 4.14 learning_modules
- `id` uuid PK
- `school_id` uuid not null, FK ke `schools(id)`
- `title`, `description`, `file_url`
- `created_at`, `updated_at`

### 4.15 assignments
- `id` uuid PK
- `school_id` uuid not null, FK ke `schools(id)`
- `class_id` uuid FK ke `classes(id)`
- `title`, `description`, `due_date`
- `created_at`, `updated_at`

### 4.16 assignment_submissions
- `id` uuid PK
- `assignment_id` uuid not null, FK ke `assignments(id)`
- `student_id` uuid not null, FK ke `students(id)`
- `file_path` text
- `status` check `pending|reviewed|graded`
- `grade`, `submitted_at`, `updated_at`

### 4.17 api_keys
- `id` uuid PK
- `name` text not null
- `api_key` text unique not null
- `active` boolean
- `created_at`, `updated_at`

### 4.18 activity_logs
- `id` uuid PK
- `user_id` uuid FK ke `users(id)`
- `action` text not null
- `metadata` jsonb
- `created_at`, `updated_at`

### 4.19 refresh_tokens
- `id` uuid PK
- `token_id` uuid not null
- `user_id` uuid FK ke `users(id)`
- `revoked` boolean
- `expires_at` timestamptz not null
- `created_at`

## 5. API dan Routing Utama

### 5.1 Auth
- `POST /api/auth/register` — registrasi guru dengan `school_id` atau `school_npsn`
- `POST /api/auth/login` — login guru, siswa, admin
- `POST /api/auth/refresh` — refresh token
- `POST /api/auth/logout` — logout
- `POST /api/auth/password-reset` dan `/confirm` — reset password
- `GET /api/auth/me` — profil pengguna saat ini
- `POST /api/auth/dev/seed` — create test accounts dev

### 5.2 Admin
- `GET /api/admin/schools`
- `POST /api/admin/schools`
- `PUT /api/admin/schools/:id`
- `DELETE /api/admin/schools/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `PATCH /api/admin/users/:id/role`
- `GET /api/admin/subjects`
- `POST /api/admin/subjects`
- `PUT /api/admin/subjects/:id`
- `DELETE /api/admin/subjects/:id`
- `GET /api/admin/classes`
- `POST /api/admin/classes`
- `PUT /api/admin/classes/:id`
- `DELETE /api/admin/classes/:id`
- `GET /api/admin/api-keys`
- `POST /api/admin/api-keys`
- `PUT /api/admin/api-keys/:id`
- `PATCH /api/admin/api-keys/:id/toggle`

### 5.3 Guru
- `GET /api/teacher/school`
- `PUT /api/teacher/school`
- `GET /api/teacher/profile`
- `PUT /api/teacher/profile`
- `GET /api/teacher/students`
- `POST /api/teacher/students`
- `PUT /api/teacher/students/:id`
- `DELETE /api/teacher/students/:id`
- `POST /api/teacher/students/import`
- `GET /api/teacher/subjects`
- `GET /api/teacher/classes`
- `GET /api/teacher/bank`
- `GET /api/teacher/bank/packages`
- `POST /api/teacher/bank`
- `PUT /api/teacher/bank/:id`
- `DELETE /api/teacher/bank/:id`
- `GET /api/teacher/bank/:id`
- `POST /api/teacher/bank/generate`
- `POST /api/teacher/bank/import`
- `POST /api/teacher/bank/import-ai`
- `POST /api/teacher/bank/upload-image`
- `POST /api/teacher/ai/generate`
- `GET /api/teacher/exams`
- `POST /api/teacher/exams`

### 5.4 Siswa
- `GET /api/student/profile`
- `PUT /api/student/profile`
- `GET /api/student/modules`
- `GET /api/student/assignments`
- `POST /api/student/assignments/:assignment_id/submit`
- `GET /api/student/exams`
- `GET /api/student/exams/token/:token`
- `POST /api/student/exams/:examId/submit`
- `GET /api/student/results`

### 5.5 AI
- `POST /api/ai/generate`

## 6. File Utama dan Fungsi

### 6.1 Frontend
- `client/index.html` — halaman statis entrypoint
- `client/css/style.css` — styling dasar
- `client/js/app.js` — skrip frontend (UI, fetch, interaksi sederhana)

### 6.2 Server
- `server/index.js` — entrypoint Node/Express
- `server/app.js` — konfigurasi Express, middleware, static route, dan router
- `server/package.json` — dependency dan script
- `server/.env` — konfigurasi environment (Supabase, JWT, GROQ)

### 6.3 Controllers
- `server/controllers/authController.js` — auth, register, login, refresh, reset password
- `server/controllers/adminController.js` — CRUD sekolah, pengguna, mata pelajaran, kelas, API key
- `server/controllers/teacherController.js` — guru, bank soal, siswa, impor, soal AI, paket soal
- `server/controllers/studentController.js` — profil siswa, modul, tugas, ujian

### 6.4 Middleware
- `server/middlewares/auth.js` — verifikasi JWT dan attach `req.user`
- `server/middlewares/role.js` — otorisasi role
- `server/middlewares/validate.js` — Zod object validation
- `server/middlewares/errorHandler.js` — response error terpusat
- `server/middlewares/rateLimiter.js` — pembatasan permintaan
- `server/middlewares/tenant.js` — tenant isolation check per resource

### 6.5 Routes
- `server/routes/auth.js`
- `server/routes/admin.js`
- `server/routes/teacher.js`
- `server/routes/student.js`
- `server/routes/ai.js`

### 6.6 Services
- `server/services/supabaseClient.js` — Supabase client helper
- `server/services/devSeedService.js` — create dev test accounts
- `server/services/groqService.js` — integrasi Groq AI request
- `server/services/activityService.js`, `server/services/groqService.js` — layanan internal lainnya

### 6.7 Utils
- `server/utils/hash.js` — bcrypt hash/compare
- `server/utils/jwt.js` — JWT signing/verifying
- `server/utils/logger.js` — winston logger
- `server/utils/response.js` — helper success/error JSON
- `server/utils/sanitize.js` — sanitize object input

### 6.8 Validators
- `server/validators/adminValidators.js`
- `server/validators/teacherValidators.js`
- `server/validators/studentValidators.js`

## 7. Environment Variables
Diletakkan di `server/.env`:
- `PORT`
- `NODE_ENV`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GROQ_API_KEY`
- `GROQ_API_URL`

## 8. Status Saat Ini
### Selesai / Terpasang
- Server Express berfungsi dan startup.
- Auth JWT lengkap untuk login, refresh, logout.
- Registrasi guru, login guru/siswa/admin.
- Bank soal CRUD dan generate AI.
- Import siswa dan upload gambar/soal lokal.
- Policy per-sekolah sebagian di backend.
- Middleware tenant isolation ditambahkan ke rute utama.
- Dokumentasi dasar `README.md` dan DB schema tersedia.

### Yang Sudah Diperbaiki Selama Pengembangan Terbaru
- Perbaikan data isolation antar-sekolah.
- `tenant` middleware ditambahkan.
- Controller fetch/update resource penting menggunakan `school_id`.
- Pengujian tenant isolation dengan `server/test_tenant.js`.
- Audit dan patch pada route `teacher`, `admin`, `student`.

### Belum Selesai / Perlu Perhatian
- Frontend belum lengkap untuk seluruh peran.
- Beberapa route admin/subject/class/api-keys bersifat global dan perlu validasi lebih eksplisit.
- RLS Supabase belum terverifikasi sepenuhnya.
- Upload file masih disimpan lokal, belum terintegrasi ke Supabase Storage.
- Testing suite belum ada.
- Validasi Zod belum seragam pada semua endpoint.
- AI quota dan pembatasan penggunaan belum lengkap.
- Ujian token dan akses ujian per sekolah perlu verifikasi tambahan.

## 9. Panduan Ringkas Penggunaan
1. `cd server`
2. `npm install`
3. Buat `server/.env` berdasarkan variabel yang ada.
4. Jalankan `npm start`
5. Akses frontend melalui `client/index.html` atau endpoint API di `http://localhost:5000`

## 10. Catatan Khusus
- `database/schema.sql` adalah sumber kebenaran tabel dan relasi utama.
- Semua pengguna terkait sekolah melalui `school_id` untuk isolasi data.
- `users.role` menentukan hak akses `admin`, `guru`, atau `siswa`.
- `teacher_subjects` dan `teacher_classes` menghubungkan guru ke mapel dan kelas.
- `question_banks` dan `exams` menggunakan `school_id` untuk memastikan soal dan ujian tetap di dalam tenant yang benar.

## 11. Rekomendasi Selanjutnya
- Evaluasi RLS di Supabase untuk `schools`, `users`, `students`, `question_banks`, `exams`, `assignments`.
- Tambahkan endpoint audit/log khusus untuk deteksi miss-scope.
- Tambahkan skenario uji untuk cross-school access.
- Buat dokumentasi endpoint API lengkap bagi frontend.

---

Dokumen ini harus menjadi panduan satu tempat untuk memahami aplikasi, struktur data, file, status, dan status pengembangan yang telah dilakukan.