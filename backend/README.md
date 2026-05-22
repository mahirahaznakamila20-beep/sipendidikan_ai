# siPENDIdikan AI Backend

Node.js + Express backend server untuk siPENDIdikan AI platform.

## 📁 Struktur Backend

```
backend/
├── config/              # Konfigurasi aplikasi
│   ├── server.js       # Server configuration
│   ├── database.js     # Database configuration
│   ├── jwt.js          # JWT configuration
│   └── supabase.js     # Supabase client
│
├── controllers/        # Business logic
│   ├── authController.js
│   ├── adminController.js
│   ├── teacherController.js
│   └── studentController.js
│
├── routes/            # API routes
│   ├── auth.js
│   ├── admin.js
│   ├── teacher.js
│   ├── student.js
│   └── ai.js
│
├── middlewares/       # Express middlewares
│   ├── auth.js       # JWT authentication
│   ├── role.js       # Role-based access control
│   ├── tenant.js     # Tenant isolation
│   ├── validate.js   # Input validation
│   ├── errorHandler.js
│   └── rateLimiter.js
│
├── services/         # External service integration
│   ├── supabaseClient.js
│   ├── groqService.js
│   ├── devSeedService.js
│   └── activityService.js
│
├── utils/            # Utility functions
│   ├── logger.js
│   ├── jwt.js
│   ├── hash.js
│   ├── response.js
│   └── sanitize.js
│
├── validators/       # Zod input validation schemas
│   ├── authValidators.js
│   ├── adminValidators.js
│   ├── teacherValidators.js
│   └── studentValidators.js
│
├── database/         # Database files
│   ├── schema.sql    # Database schema
│   └── migrations/   # Migration files
│
├── uploads/          # User uploaded files
├── logs/             # Application logs
├── scripts/          # Utility scripts
│   ├── create_test_accounts.js
│   └── test_logins.js
│
├── app.js            # Express app setup
├── index.js          # Server entry point
├── package.json
└── README.md         # This file
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
# Start with nodemon for hot reload
npm run dev

# Or start normally
npm start
```

Server akan berjalan di `http://localhost:5000` (atau port yang ditentukan di `.env`).

### Environment Variables

Buat file `.env` di folder backend dengan variabel yang diperlukan:

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Groq AI
GROQ_API_KEY=your-groq-key
GROQ_API_URL=https://api.groq.com/openai/v1

# JWT
JWT_SECRET=your-secret-key
REFRESH_EXPIRE_DAYS=7

# Server
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
BASE_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
MAX_UPLOAD_FILES=5

# Logging
LOG_LEVEL=debug
```

## 📚 API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register user baru
- `POST /login` - Login with email/identifier dan password
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout

### Admin (`/api/admin`)

- `GET /schools` - List semua sekolah
- `POST /schools` - Create sekolah baru
- `PUT /schools/:id` - Update sekolah
- `DELETE /schools/:id` - Delete sekolah
- `GET /users` - List users
- `POST /users` - Create user baru

### Teacher (`/api/teacher`)

- `GET /profile` - Get teacher profile
- `PUT /profile` - Update teacher profile
- `GET /students` - List siswa guru
- `POST /students` - Add siswa baru
- `PUT /students/:id` - Update siswa
- `DELETE /students/:id` - Delete siswa
- `GET /bank` - Get question bank
- `POST /bank` - Create soal baru
- `GET /exams` - List ujian
- `POST /exams` - Create ujian baru
- `GET /exams/:id/results` - Get hasil ujian

### Student (`/api/student`)

- `GET /profile` - Get student profile
- `GET /exams` - Get available exams
- `POST /exams/:id/start` - Start exam
- `POST /exams/:id/submit` - Submit exam answers
- `GET /results` - Get exam results

### AI (`/api/ai`)

- `POST /generate-questions` - Generate soal menggunakan AI

## 🔐 Security Features

- **Authentication**: JWT-based token authentication
- **Authorization**: Role-based access control (RBAC)
- **Validation**: Input validation dengan Zod
- **Rate Limiting**: API rate limiting untuk mencegah abuse
- **CORS**: Cross-Origin Resource Sharing configuration
- **Helmet**: Security headers dengan helmet.js
- **Password Hashing**: Bcryptjs untuk password hashing
- **Tenant Isolation**: Multi-tenant data isolation

## 🧪 Testing

```bash
# Run tests (jika ada)
npm test

# Create test accounts
node scripts/create_test_accounts.js

# Test logins
node scripts/test_logins.js

# Tenant isolation test
node test_tenant.js
```

## 📝 Logging

Aplikasi menggunakan Winston untuk logging:

- Log disimpan di folder `logs/`
- Format: combined (untuk development) dan JSON (untuk production)
- Level: debug, info, warn, error

## 🚀 Deployment ke Vercel

### Persiapan

1. Set environment variables di Vercel dashboard
2. Connect GitHub repository
3. Vercel akan automatically deploy

### Verifikasi

```bash
# Check Vercel logs
vercel logs

# Test production API
curl https://your-vercel-domain.com/api/health
```

## 🐛 Troubleshooting

### "Cannot find module" errors

```bash
# Clear node_modules dan reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port already in use

```bash
# Ubah PORT di .env
PORT=5001
```

### Database connection error

- Check SUPABASE_URL dan SUPABASE_KEY
- Verify Supabase project sudah aktif
- Check network connectivity

### Rate limiting

```bash
# Disable rate limiter untuk development
# Edit backend/middlewares/rateLimiter.js
```

## 📚 Dependencies

- **Express**: Web framework
- **Supabase**: Database & Auth
- **JWT**: Token authentication
- **Zod**: Input validation
- **Multer**: File upload handling
- **Morgan**: HTTP logging
- **Helmet**: Security headers
- **CORS**: Cross-origin requests
- **Bcryptjs**: Password hashing
- **Winston**: Application logging

## 📄 License

MIT License

---

**Version**: 1.0.0 | **Last Updated**: May 22, 2026
