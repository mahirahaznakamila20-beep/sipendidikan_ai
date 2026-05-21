const supabase = require('./supabaseClient');
const { hashPassword } = require('../utils/hash');

const DEFAULT_SCHOOL_ID = '11111111-1111-1111-1111-111111111111';

const getExistingUserId = async (email) => {
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existingUser && existingUser.id) return existingUser.id;

  try {
    const list = await supabase.auth.admin.listUsers();
    const found = list?.data?.users?.find((u) => u.email === email);
    if (found) return found.id;
  } catch (err) {
    console.warn('Could not list auth users:', err.message || err);
  }

  return null;
};

const createAuthUser = async (email, password, username) => {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
    });

    if (error) {
      const existingId = await getExistingUserId(email);
      if (existingId) return existingId;
      throw error;
    }

    return data?.user?.id || data?.id || data?.user_id;
  } catch (err) {
    const existingId = await getExistingUserId(email);
    if (existingId) return existingId;
    throw err;
  }
};

const seedAdmin = async () => {
  const email = 'admin+test@example.com';
  const password = 'AdminPass123!';
  const username = 'admin_test';
  const id = await createAuthUser(email, password, username);
  const password_hash = await hashPassword(password);
  const { error } = await supabase.from('users').upsert([
    { id, username, email, password_hash, role: 'admin', school_id: DEFAULT_SCHOOL_ID }
  ]);
  if (error) throw error;
  return { email, password, id, role: 'admin' };
};

const seedGuru = async () => {
  const email = 'guru+test@example.com';
  const password = 'GuruPass123!';
  const username = 'guru_test';
  const id = await createAuthUser(email, password, username);
  const password_hash = await hashPassword(password);

  const { error: userError } = await supabase.from('users').upsert([
    { id, username, email, password_hash, role: 'guru', school_id: DEFAULT_SCHOOL_ID }
  ]);
  if (userError) throw userError;

  const { error: teacherError } = await supabase.from('teachers').upsert([
    { user_id: id, school_id: DEFAULT_SCHOOL_ID, teacher_name: username }
  ], { onConflict: 'user_id' });
  if (teacherError) throw teacherError;

  return { email, password, id, role: 'guru' };
};

const seedSiswa = async () => {
  const email = 'siswa+test@example.com';
  const password = 'SiswaPass123!';
  const username = 'siswa_test';
  const nisn = '9999999999';
  const id = await createAuthUser(email, password, username);
  const password_hash = await hashPassword(password);

  const { error: userError } = await supabase.from('users').upsert([
    { id, username, email, password_hash, role: 'siswa', school_id: DEFAULT_SCHOOL_ID }
  ]);
  if (userError) throw userError;

  const { error: studentError } = await supabase.from('students').upsert([
    { id, school_id: DEFAULT_SCHOOL_ID, student_name: username, nisn, password_hash }
  ], { onConflict: 'id' });
  if (studentError) throw studentError;

  return { email, password, id, role: 'siswa', nisn };
};

const createTestAccounts = async () => {
  const admin = await seedAdmin();
  const guru = await seedGuru();
  const siswa = await seedSiswa();
  return { admin, guru, siswa };
};

module.exports = { createTestAccounts };
