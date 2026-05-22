# siPENDIdikan AI Frontend

HTML/CSS/JavaScript frontend untuk siPENDIdikan AI platform.

## 📁 Struktur Frontend

```
frontend/
├── css/              # Stylesheets
│   └── style.css    # Main stylesheet
│
├── js/               # JavaScript files
│   └── app.js       # Main application script
│
├── index.html        # Main HTML page
└── package.json      # Frontend metadata
```

## 🚀 Setup

Frontend adalah aplikasi HTML/CSS/JS statis. Buka `index.html` di browser atau akses via backend server.

### Local Development

```bash
# Via backend server
cd backend
npm run dev
# Buka http://localhost:5000
```

### Production

Frontend di-serve oleh backend Express server. Tidak perlu build step khusus.

## 📋 Features

- **Responsive Design**: Mobile-friendly interface
- **Teacher Dashboard**: Manage kelas, siswa, dan soal
- **Student Portal**: Mengikuti ujian dan lihat hasil
- **Admin Panel**: Manage sekolah dan users

## 🎨 Customization

### CSS

Edit `frontend/css/style.css` untuk customize styling.

### JavaScript

Main app logic ada di `frontend/js/app.js`.

## 🌐 API Integration

Frontend berkomunikasi dengan backend via REST API:

- Auth: `/api/auth/*`
- Teacher: `/api/teacher/*`
- Student: `/api/student/*`
- Admin: `/api/admin/*`

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

MIT License

---

**Version**: 1.0.0 | **Last Updated**: May 22, 2026
