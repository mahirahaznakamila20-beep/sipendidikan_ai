# siPENDIdikan AI - Platform Pembelajaran Adaptif

Platform pembelajaran online dengan fitur AI untuk membuat konten pembelajaran yang dipersonalisasi dan evaluasi yang adaptif.

## 🚀 Fitur Utama

- **AI-Powered Question Generation**: Membuat soal ujian otomatis menggunakan Groq AI
- **Multi-tenant Support**: Mendukung multiple sekolah dalam satu platform
- **Adaptive Learning**: Personalisasi pembelajaran berdasarkan performa siswa
- **Secure Authentication**: JWT-based authentication dengan role-based access control
- **Real-time Assessment**: Penilaian ujian secara realtime
- **Teacher Dashboard**: Interface untuk guru mengelola kelas dan soal
- **Student Portal**: Portal untuk siswa mengikuti pembelajaran dan ujian

## 📁 Struktur Project

```
sipendikan-ai/
├── backend/                  # Express.js Backend
│   ├── controllers/         # Business logic
│   ├── routes/              # API routes
│   ├── middlewares/         # Express middlewares
│   ├── services/            # External services (Supabase, Groq)
│   ├── utils/               # Utility functions
│   ├── validators/          # Input validation (Zod schemas)
│   ├── database/            # Database migrations & schema
│   ├── uploads/             # User uploaded files
│   ├── logs/                # Application logs
│   ├── app.js               # Express app setup
│   ├── index.js             # Server entry point
│   └── package.json
│
├── frontend/                # HTML/CSS/JS Frontend
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── index.html           # Main HTML file
│
├── .env.example             # Example environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Root package configuration
├── vercel.json              # Vercel deployment config
└── README.md                # This file
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js >= 16.0.0
- npm atau yarn
- Supabase account
- Groq API key

### Instalasi Lokal

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd sipendikan-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env dengan nilai sebenarnya
   ```

4. **Jalankan development server**
   ```bash
   npm run dev
   ```

   Backend akan berjalan di `http://localhost:5000`

### Development

```bash
# Backend development
cd backend
npm run dev

# Build untuk production
npm run build
```

## 🌐 Deployment ke Vercel

### Persiapan

1. **Pastikan environment variables sudah di Vercel**
   - Buka Vercel dashboard
   - Settings → Environment Variables
   - Tambahkan semua variabel dari `.env.example`

2. **Connect repository ke Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

### Verifikasi Deployment

- Buka URL Vercel yang diberikan
- Test API endpoints
- Check Vercel logs untuk errors

## 📚 API Documentation

### Main Endpoints

#### Authentication
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

#### Teacher
- `GET /api/teacher/profile` - Get teacher profile
- `GET /api/teacher/students` - List students
- `POST /api/teacher/students` - Create student
- `POST /api/teacher/bank` - Create question bank
- `POST /api/teacher/exams` - Create exam

#### Admin
- `GET /api/admin/schools` - List schools
- `POST /api/admin/schools` - Create school

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation dengan Zod
- Rate limiting untuk API endpoints
- CORS configuration
- Helmet.js untuk security headers

## 📝 Environment Variables

Copy `.env.example` ke `.env` dan isi dengan nilai sebenarnya:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
GROQ_API_KEY=your-groq-api-key
GROQ_API_URL=https://api.groq.com/openai/v1
JWT_SECRET=your-secret-key
REFRESH_EXPIRE_DAYS=7
NODE_ENV=development
PORT=5000
```

## 🐛 Troubleshooting

### Port 5000 already in use
Ubah PORT di `.env`

### Database connection error
- Verifikasi SUPABASE_URL dan SUPABASE_KEY
- Pastikan database sudah exist

### Groq API errors
- Verifikasi GROQ_API_KEY valid
- Check quota Groq API

## 📄 License

MIT License

---

**Version**: 1.0.0 | **Last Updated**: May 22, 2026

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
