require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const base = process.env.BASE_URL || 'http://localhost:5000';
const accounts = [
  { email: 'admin+test@example.com', password: 'AdminPass123!' },
  { email: 'guru+test@example.com', password: 'GuruPass123!' },
  { email: 'siswa+test@example.com', password: 'SiswaPass123!', role: 'siswa', nisn: '9999999999' },
];

async function test() {
  for (const a of accounts) {
    try {
      const identifier = a.role === 'siswa' ? (a.nisn || a.email) : a.email;
      const body = { identifier, password: a.password };
      if (a.role) body.role = a.role;
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      console.log('Login for', a.email, '->', json.success, json.message || '');
      if (json.data && json.data.user) console.log(' user:', json.data.user.id, json.data.user.role);
    } catch (err) {
      console.error('Error login', a.email, err.message || err);
    }
  }
}

test();