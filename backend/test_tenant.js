require('dotenv').config();
const base = process.env.BASE_URL || 'http://localhost:5000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = (token) => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
const randomDigits = () => Math.floor(10000000 + Math.random() * 90000000).toString();
const randomNisn = () => `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
const randomEmail = (name) => `${name}.${Date.now()}.${Math.floor(Math.random()*1000)}@example.com`;

async function req(path, method='GET', body=null, token=null) {
  const res = await fetch(base+path, { method, headers: headers(token), body: body ? JSON.stringify(body) : undefined });
  let text = await res.text();
  try { text = JSON.parse(text); } catch (e) {}
  return { status: res.status, body: text };
}

(async () => {
  console.log('Starting tenant isolation test...');
  // ensure dev seed
  console.log('Seeding dev accounts...');
  const seed = await req('/api/auth/dev/seed', 'POST');
  console.log('Dev seed:', seed.status, typeof seed.body === 'object' ? Object.keys(seed.body) : seed.body);

  // login admin
  const adminLogin = await req('/api/auth/login', 'POST', { identifier: 'admin+test@example.com', password: 'AdminPass123!' });
  if (adminLogin.status !== 200) { console.error('Admin login failed', adminLogin); process.exit(1); }
  const adminToken = adminLogin.body?.data?.accessToken || adminLogin.body?.accessToken;
  console.log('Admin login OK');

  // create two schools
  const school1Npsn = randomDigits();
  const school2Npsn = randomDigits();
  const s1 = await req('/api/admin/schools', 'POST', { school_name: `MI 1 Rajadesa ${school1Npsn}`, npsn: school1Npsn }, adminToken);
  console.log('Create school 1:', s1.status, s1.body && s1.body.id ? 'id='+s1.body.id : s1.body);
  const s2 = await req('/api/admin/schools', 'POST', { school_name: `SD Negeri 1 Jakarta ${school2Npsn}`, npsn: school2Npsn }, adminToken);
  console.log('Create school 2:', s2.status, s2.body && s2.body.id ? 'id='+s2.body.id : s2.body);

  // register Agus (school npsn school1)
  const agusEmail = randomEmail('agus');
  const asepEmail = randomEmail('asep');
  const regAgus = await req('/api/auth/register', 'POST', { username: 'agus', email: agusEmail, password: 'Pass1234!', school_npsn: school1Npsn });
  console.log('Register Agus:', regAgus.status);
  // register Asep
  const regAsep = await req('/api/auth/register', 'POST', { username: 'asep', email: asepEmail, password: 'Pass1234!', school_npsn: school2Npsn });
  console.log('Register Asep:', regAsep.status);

  // login Agus and Asep
  const loginAgus = await req('/api/auth/login', 'POST', { identifier: agusEmail, password: 'Pass1234!' });
  const tokenAgus = loginAgus.body?.data?.accessToken || loginAgus.body?.accessToken; console.log('Login Agus:', loginAgus.status);
  const loginAsep = await req('/api/auth/login', 'POST', { identifier: asepEmail, password: 'Pass1234!' });
  const tokenAsep = loginAsep.body?.data?.accessToken || loginAsep.body?.accessToken; console.log('Login Asep:', loginAsep.status);

  if (!tokenAgus || !tokenAsep) { console.error('Login failed for one of users'); process.exit(1); }

  // Agus creates a student
  const studentNisn = randomNisn();
  const createStudent = await req('/api/teacher/students', 'POST', { student_name: 'siswa_agus', nisn: studentNisn, password: 'siswaPW' }, tokenAgus);
  console.log('Agus created student:', createStudent.status, createStudent.body && createStudent.body.id ? 'id='+createStudent.body.id : createStudent.body);
  const studentId = createStudent.body?.id || (Array.isArray(createStudent.body) && createStudent.body[0] && createStudent.body[0].id) || null;

  // Asep attempts to update Agus's student
  const attemptUpdate = await req('/api/teacher/students/'+studentId, 'PUT', { student_name: 'hacked_by_asep' }, tokenAsep);
  console.log('Asep update student status:', attemptUpdate.status, attemptUpdate.body || 'no body');

  // Asep lists students (should not see Agus's student)
  const listAsep = await req('/api/teacher/students', 'GET', null, tokenAsep);
  console.log('Asep students count:', Array.isArray(listAsep.body?.data) ? listAsep.body.data.length : listAsep.body);

  // Agus lists students
  const listAgus = await req('/api/teacher/students', 'GET', null, tokenAgus);
  console.log('Agus students count:', Array.isArray(listAgus.body?.data) ? listAgus.body.data.length : listAgus.body);

  // Result summary
  const aseps = listAsep.body?.data || [];
  const isolated = (attemptUpdate.status === 404 || attemptUpdate.status === 403) && aseps.every(s => s.nisn !== studentNisn);
  console.log('Isolation test result:', isolated ? 'PASS' : 'FAIL');
  process.exit(0);
})();
