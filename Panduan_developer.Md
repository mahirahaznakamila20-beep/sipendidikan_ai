# Panduan Developer siPENDIdikan_AI

## Status Saat Ini
### Fitur AI Generator & Bank Soal (Latest - Phase 2)
- ✅ **AI Generator Page** (`/guru/aigenerator`)
  - Form input: subject, class, topics (chip-based), question type counts
  - Groq API integration dengan retry logic (3x exponential backoff)
  - Generated questions preview dengan edit/delete
  - Batch save to question bank
  - Modern exam features: randomization, timer, auto-submit, realtime scoring

- ✅ **Bank Soal Enhancement** (`/guru/banksoal`)
  - Subject & Class filters
  - Manual question creation untuk 4 tipe:
    - Pilihan Ganda (1 jawaban benar)
    - Pilihan Ganda Kompleks (2 jawaban benar)
    - Isian Singkat
    - Uraian
  - Editable inline modal per soal
  - Image upload per question type
  - Tabel dengan auto-numbering grouped by type
  - CSV template download & import
  - Print functionality
### Sudah Dikerjakan
- Struktur proyek sudah ada dengan folder utama:
  - `/client`
  - `/server`
  - `/database`
- Backend Express modular
  - `server/index.js`
  - `server/app.js`
  - `server/routes/`
  - `server/controllers/`
  - `server/middlewares/`
  - `server/services/`
  - `server/utils/`
  - `server/validators/`
- Autentikasi JWT dan middleware role protection ada.
- Supabase client service tersedia di `server/services/supabaseClient.js`.
- Groq AI service tersedia dan `server/routes/ai.js` sudah terpasang.
- Kontroler untuk:
  - Auth (`authController.js`)
  - Admin (`adminController.js`)
  - Guru (`teacherController.js`)
  - Siswa (`studentController.js`)
- Routing tersedia untuk:
  - `/api/auth`
  - `/api/admin`
  - `/api/teacher`
  - `/api/student`
  - `/api/ai`
- Front-end statis sederhana dengan:
  - `client/index.html`
  - `client/css/style.css`
  - `client/js/app.js`
- Database schema Supabase di `database/schema.sql`
  - Semua tabel yang dibutuhkan sudah dibuat
  - Relasi foreign key sudah ditentukan
  - Seed default admin sudah disiapkan
- Dokumen `README.md` dibuat
- `.env.example` dibuat
- `npm install` berhasil di folder `server`
- Server mampu startup jika environment variable disediakan
- `server/app.js` sudah memakai `helmet`, `cors`, rate limiter, `morgan`, dan central error handler

### Perubahan Yang Telah Saya Kerjakan (Ringkasan Prioritas 1)
- Audit dan perbaikan schema: `database/schema.sql` — menambahkan kolom `updated_at` untuk tabel penting dan memperbaiki trigger `update_modified_at`.
- Centralized error handler ditambahkan: `server/middlewares/errorHandler.js` untuk response standar JSON.
- Validation middleware Zod ditambahkan: `server/middlewares/validate.js`.
- Validation middleware Zod sudah di-wiring pada banyak route admin/teacher/student.
- Logging terintegrasi: `server/utils/logger.js` (winston) dan `morgan` di-attach pada `server/app.js`.
- Authentication improvements: `server/utils/jwt.js` sekarang menyediakan `signAccessToken`, `signRefreshToken`, dan `verifyToken`.
- `server/middlewares/auth.js` sudah men-sanitize `req.user` dan meneruskan error ke handler terpadu.
- Refresh token persisten di tabel `refresh_tokens` dan `authController.js` sudah mendukung `refresh` + `logout` dengan revocation.
- Role guard `server/middlewares/role.js` sudah dipakai di admin, teacher, student, dan AI routes.

### Backend CRUD status
- Controller dan route implementasi sudah tersedia untuk:
  - schools
  - users
  - subjects
  - classes
  - api_keys
  - teachers
  - students
  - question_banks
  - exams
  - exam_questions
  - learning_modules
  - assignments
  - assignment_submissions
  - exam_results
- Validasi Zod diterapkan pada banyak endpoint di `server/routes/admin.js`, `server/routes/teacher.js`, dan pada `student` exam submit.
- School-based filtering sudah dipakai pada banyak query di teacher/student controllers.
- AI route tersedia dan dilindungi oleh auth guard untuk `guru` dan `admin`.

### Belum Selesai / Perlu Penguatan
- Front-end belum lengkap untuk semua halaman role spesifik
  - UI dashboard belum penuh untuk CRUD lengkap
  - Form upload tugas, preview soal, export PDF, dan ujian token belum optimal
- `student/exams/token/:token` masih belum sepenuhnya membatasi akses menurut sekolah
- Beberapa admin query masih terlalu umum dan perlu penguatan `school_id`/role checks
- Upload ke Supabase Storage belum diimplementasikan; saat ini upload hanya lokal ke `/uploads`
- AI request logging/quota guard belum tersedia
- Validasi route belum konsisten untuk auth, AI, dan upload endpoints
- Belum ada test suite atau pipeline build
- RLS di `schema.sql` sudah ada tetapi perlu pemeriksaan dan penguatan per-role untuk `admin`, `guru`, dan `siswa`

### Pekerjaan Yang Masih Perlu Dilanjutkan (Prioritas Berikutnya)
- Lengkapi RLS Supabase dan verifikasi kebijakan role-specific untuk `admin`, `guru`, dan `siswa`.
- Perkuat `school_id` enforcement di backend, terutama pada admin dan `student/exams/token/:token`.
- Tambahkan route-level validation Zod pada auth, AI, assignment upload, dan ujian token access.
- Implementasi Supabase Storage untuk materi/tugas/avatar.
- Tambahkan AI quota guard dan pisahkan logging request AI.
- Buat test suite minimal: Postman/Insomnia + API tests untuk auth, CRUD, upload, exam.

## Langkah Selanjutnya

1. **Finalisasi RLS Supabase**
   - Verifikasi policy role-specific dan `school_id` isolation.
2. **Perkuat backend validation**
   - Tambahkan Zod validation di auth, AI, upload, dan endpoint yang belum lengkap.
3. **Perkuat school-scoped access**
   - Pastikan admin/teacher/student queries tidak membocorkan data antar sekolah.
4. **Implementasi storage dan upload**
   - Tambahkan Supabase Storage atau upload server-side yang benar.
5. **Lengkapi frontend role-specific dashboard**
   - Buat halaman dan form CRUD untuk masing-masing role.
6. **Tambahkan test suite**
   - Prioritaskan validasi auth + CRUD + exam flows.

## Bank Soal - Panduan Penggunaan & Implementasi

### Akses Halaman
- URL: `/guru/banksoal` di dashboard guru
- Requires: Authenticated user dengan role `guru`

### Fitur Utama

#### 1. Filter & Navigasi
- **Dropdown Kelas**: Filter soal berdasarkan kelas
- **Dropdown Mata Pelajaran**: Filter soal berdasarkan mata pelajaran
- Filter real-time dengan load ulang data

#### 2. Buat Soal Manual
Form dengan 4 pilihan tipe soal:

**a) Pilihan Ganda (1 Jawaban Benar)**
```
Teks Soal: [textarea]
Jawaban A: [text input]
Jawaban B: [text input]
Jawaban C: [text input]
Jawaban D: [text input]
Jawaban Benar: [dropdown A/B/C/D]
Gambar: [file input]
Poin: [number input, default 1]
```

**b) Pilihan Ganda Kompleks (2 Jawaban Benar)**
```
Teks Soal: [textarea]
[checkbox] Jawaban A: [text input]
[checkbox] Jawaban B: [text input]
[checkbox] Jawaban C: [text input]
[checkbox] Jawaban D: [text input]
Validasi: minimal 2 checkbox dipilih
Gambar: [file input]
Poin: [number input, default 1]
```

**c) Isian Singkat**
```
Teks Soal: [textarea]
Jawaban Benar: [text input]
Gambar: [file input]
Poin: [number input, default 1]
```

**d) Uraian**
```
Teks Soal: [textarea]
Jawaban Kunci / Rubrik: [textarea]
Gambar: [file input]
Poin: [number input, default 1]
```

#### 3. Aksi Soal
- **Simpan Soal**: Simpan soal baru ke database
- **Download Template**: Download CSV template untuk import
- **Import Soal**: Upload file CSV untuk bulk import
- **Cetak Soal**: Print semua soal yang ditampilkan

#### 4. Tabel Soal
- Menampilkan semua soal dalam 4 section (grouped by type)
- Setiap section:
  - Header: Nama jenis soal
  - Kolom: No, Soal (preview 80 char), Poin, Aksi
  - Auto-numbering per section (reset di setiap group)
  
- Action per baris:
  - **Lihat**: Preview soal lengkap dalam modal
  - **Edit**: Edit semua field soal dalam modal
  - **Hapus**: Delete soal dengan konfirmasi

#### 5. Modal Edit
- Edit semua field soal
- Support semua tipe soal
- Save changes langsung ke database
- Cancel untuk kembali tanpa simpan

### Backend API

#### POST /api/teacher/bank
Membuat soal baru
```json
{
  "question_type": "pilihan_ganda|pilihan_ganda_kompleks|isian_singkat|uraian",
  "question_text": "Teks soal...",
  "subject_id": "uuid (optional)",
  "class_id": "uuid (optional)",
  "options_json": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "answer_key": "A" or "A,B",
  "explanation": "...",
  "bloom_level": "C1-C6",
  "image_url": "url (optional)"
}
```

#### GET /api/teacher/bank?subject_id=uuid&class_id=uuid
List semua soal dengan filter opsional

#### PUT /api/teacher/bank/:id
Update soal existing

#### DELETE /api/teacher/bank/:id
Hapus soal

#### POST /api/teacher/bank/:id
Preview soal detail

#### POST /api/teacher/bank/upload-image
Upload gambar soal
```
Form: multipart/form-data
Field: image (file)
Response: { image_url: "http://..." }
```

#### POST /api/teacher/bank/import
Bulk import soal dari CSV
```
Form: multipart/form-data
Field: file (csv)
Response: Berhasil mengimpor N soal
```

### CSV Import Format

**Headers (required):**
```
question_type,question_text,subject_id,class_id,options_json,answer_key,bloom_level,image_url
```

**Contoh Data:**
```csv
"pilihan_ganda","Berapa 2+2?","","","{"A":"3","B":"4","C":"5","D":"6"}","B","C1",""
"pilihan_ganda_kompleks","Manakah yang benar?","","","{"A":"Opt A","B":"Opt B","C":"Opt C","D":"Opt D"}","A,B","C2",""
"isian_singkat","Ibu kota Indonesia?","","","{}","Jakarta","C1",""
"uraian","Jelaskan fotosintesis","","","{}","Rubrik penilaian...","C3",""
```

### Download Template
Tombol "Download Template" generate CSV dengan contoh format yang bisa langsung diisi.

### Testing Checklist

- [ ] Buka halaman /guru/banksoal
- [ ] Filter by kelas - soal ter-filter dengan benar
- [ ] Filter by mata pelajaran - soal ter-filter dengan benar
- [ ] Buat soal tipe Pilihan Ganda lengkap
- [ ] Buat soal tipe Pilihan Ganda Kompleks dengan 2 jawaban
- [ ] Buat soal tipe Isian Singkat
- [ ] Buat soal tipe Uraian
- [ ] Upload gambar soal - gambar tersimpan
- [ ] Edit soal - modal buka dan save bekerja
- [ ] Delete soal - konfirmasi muncul dan soal terhapus
- [ ] Preview soal - modal menampilkan detail lengkap
- [ ] Download template - file CSV download
- [ ] Import CSV - soal dari file tersimpan ke database
- [ ] Cetak soal - print dialog muncul
- [ ] Tabel grouped by type - section grouping bekerja
- [ ] Auto-numbering - nomor reset per section

### Database Schema

Kolom `question_banks` yang digunakan:
- `id` (uuid, primary key)
- `school_id` (uuid, foreign key)
- `teacher_id` (uuid, foreign key)
- `subject_id` (uuid, optional)
- `class_id` (uuid, optional)
- `question_type` (text)
- `question_text` (text)
- `options_json` (jsonb)
- `answer_key` (text)
- `explanation` (text)
- `bloom_level` (text)
- `image_url` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Frontend Code Structure

**Main Function**: `loadQuestionBank()` - Load seluruh halaman
- Fetch data dari 3 endpoint parallel
- Render filter form
- Render question creation form
- Render grouped question table

**Helper Functions**:
- `editQuestionModal(id)` - Open edit modal
- `previewQuestion(id)` - Open preview modal
- `deleteQuestion(id)` - Delete dengan konfirmasi
- `downloadQuestionTemplate()` - Generate & download CSV
- `printQuestions()` - Open print dialog
- `renderQuestionsTable(questions, type)` - Render section tabel

### Style Classes

`.form-grid` - Responsive grid form dengan gap 16px
`.question-group` - Section grouping di tabel
`.question-text-cell` - Styled text cell (clickable, underline)
`.pgk-checkbox` - Checkbox styling untuk PGK
`.poin-cell` - Centered poin display
`.modal-overlay` - Fullscreen modal background
`.modal-card` - Modal card content

## Catatan Khusus
- Error `relation "classes" does not exist` sudah diperbaiki di `database/schema.sql`.
- `server` sudah diinstal dan `node --check index.js` lulus.
- Supabase harus diinisialisasi dengan `schema.sql`.
- Pastikan `SUPABASE_URL`, `SUPABASE_KEY`, dan `JWT_SECRET` terisi sebelum menjalankan server.

## File yang Perlu Diperiksa Terlebih Dahulu
- `database/schema.sql`
- `server/routes/*.js`
- `server/controllers/*.js`
- `server/middlewares/*.js`
- `server/validators/*.js`
- `client/js/app.js`
- `README.md`
- `.env.example`
