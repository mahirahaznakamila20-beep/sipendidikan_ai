const supabase = require('../services/supabaseClient');
const { hashPassword } = require('../utils/hash');
const { sanitizeObject } = require('../utils/sanitize');
const { error, success } = require('../utils/response');
const { v4: uuidv4 } = require('uuid');

const listSchools = async (req, res) => {
  const { school_id: adminSchoolId } = req.user;
  let query = supabase.from('schools').select('*').order('created_at', { ascending: false });
  if (adminSchoolId) query = query.eq('id', adminSchoolId);
  const { data, error: err } = await query;
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const createSchool = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);

    const {
      school_name,
      npsn,
      principal_name,
      principal_nip,
      address,
      phone
    } = payload;

    if (!school_name || !npsn) {
      return error(res, 'Nama sekolah dan NPSN wajib diisi', 400);
    }

    // cek NPSN sudah ada
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('npsn', npsn)
      .maybeSingle();

    if (existingSchool) {
      return error(res, 'NPSN sudah terdaftar', 400);
    }

    // insert + ambil data kembali
    const { data, error: err } = await supabase
      .from('schools')
      .insert([
        {
          school_name,
          npsn,
          principal_name,
          principal_nip,
          address,
          phone
        }
      ])
      .select()
      .single();

    if (err) {
      console.log('CREATE SCHOOL ERROR:', err);
      return error(res, err.message, 400);
    }

    return success(
      res,
      data,
      'Sekolah berhasil dibuat'
    );

  } catch (err) {
    console.log('CREATE SCHOOL ERROR:', err);

    return error(
      res,
      err.message || 'Gagal membuat sekolah',
      500
    );
  }
};


const updateSchool = async (req, res) => {
  try {
    const { school_id: adminSchoolId } = req.user;
    const { id } = req.params;
    if (adminSchoolId && adminSchoolId !== id) {
      return error(res, 'Tidak dapat memperbarui sekolah lain', 403);
    }
    const payload = sanitizeObject(req.body);
    if (payload.npsn) {
      const { data: existingSchool } = await supabase.from('schools').select('id').eq('npsn', payload.npsn).neq('id', id).maybeSingle();
      if (existingSchool) {
        return error(res, 'NPSN sudah terdaftar pada sekolah lain', 400);
      }
    }
    const { error: err } = await supabase.from('schools').update(payload).eq('id', id);
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('schools').select('*').eq('id', id).single();
    return success(res, data, 'Sekolah berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteSchool = async (req, res) => {
  const { id } = req.params;
  const { school_id: adminSchoolId } = req.user;
  if (adminSchoolId && adminSchoolId !== id) {
    return error(res, 'Tidak dapat menghapus sekolah lain', 403);
  }
  const { error: err } = await supabase.from('schools').delete().eq('id', id);
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Sekolah berhasil dihapus');
};

const listUsers = async (req, res) => {
  const { school_id: adminSchoolId } = req.user;
  let usersQuery = supabase.from('users').select('id, username, email, role, school_id, created_at').order('created_at', { ascending: false });
  let studentsQuery = supabase.from('students').select('id, nisn, class_id').order('created_at', { ascending: false });

  if (adminSchoolId) {
    usersQuery = usersQuery.eq('school_id', adminSchoolId);
    studentsQuery = studentsQuery.eq('school_id', adminSchoolId);
  }

  const [usersResult, studentsResult] = await Promise.all([usersQuery, studentsQuery]);

  if (usersResult.error) return error(res, usersResult.error.message, 500);
  if (studentsResult.error) return error(res, studentsResult.error.message, 500);

  const studentMap = new Map((studentsResult.data || []).map((student) => [student.id, student]));
  const merged = (usersResult.data || []).map((user) => ({
    ...user,
    nisn: studentMap.get(user.id)?.nisn || null,
    class_id: studentMap.get(user.id)?.class_id || null,
  }));

  return success(res, merged);
};

const createUser = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);
    const { username, email, password, role, school_id: requestedSchoolId, school_npsn: requestedSchoolNpsn, nisn, class_id } = payload;
    const { school_id: adminSchoolId, npsn: adminSchoolNpsn } = req.user;
    let school_id = adminSchoolId || requestedSchoolId || null;

    if (requestedSchoolNpsn) {
      const { data: schoolByNpsn, error: schoolNpsnErr } = await supabase.from('schools').select('id, npsn').eq('npsn', requestedSchoolNpsn).maybeSingle();
      if (schoolNpsnErr || !schoolByNpsn) {
        return error(res, 'Sekolah tidak ditemukan untuk NPSN yang diberikan', 400);
      }
      if (adminSchoolId && schoolByNpsn.id !== adminSchoolId) {
        return error(res, 'Tidak dapat membuat akun untuk sekolah lain', 403);
      }
      school_id = schoolByNpsn.id;
    }

    if (adminSchoolId && requestedSchoolId && requestedSchoolId !== adminSchoolId) {
      return error(res, 'Tidak dapat membuat akun untuk sekolah lain', 403);
    }

    if (!username || !email || !password || !role) {
      return error(res, 'Lengkapi username, email, password, dan role', 400);
    }

    if (role === 'guru' && !school_id) {
      return error(res, 'school_id wajib diisi untuk guru', 400);
    }

    if (role === 'siswa') {
      if (!school_id || !nisn) {
        return error(res, 'school_id dan NISN wajib diisi untuk siswa', 400);
      }
    }

    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existingEmail) {
      return error(res, 'Email sudah digunakan', 400);
    }

    if (school_id) {
      const { data: school, error: errSchool } = await supabase.from('schools').select('id').eq('id', school_id).single();
      if (errSchool || !school) {
        return error(res, 'Sekolah tidak ditemukan untuk school_id yang diberikan', 400);
      }
    }

    if (role === 'siswa') {
      const { data: existingNisn } = await supabase.from('students').select('id').eq('nisn', nisn).maybeSingle();
      if (existingNisn) {
        return error(res, 'NISN sudah terdaftar', 400);
      }
    }

    if (payload.class_id) {
      const { data: classData, error: errClass } = await supabase.from('classes').select('id').eq('id', payload.class_id).single();
      if (errClass || !classData) {
        return error(res, 'Kelas tidak ditemukan untuk class_id yang diberikan', 400);
      }
    }

    const password_hash = await hashPassword(password);
    const userId = uuidv4();
    const userPayload = { id: userId, username, email, password_hash, role, school_id: school_id || null };
    const { error: err } = await supabase.from('users').insert([userPayload]);
    if (err) return error(res, err.message, 400);

    if (role === 'guru') {
      await supabase.from('teachers').insert([{ user_id: userId, school_id, teacher_name: username }]);
    }

    if (role === 'siswa') {
      await supabase.from('students').insert([
        {
          id: userId,
          school_id,
          student_name: username,
          nisn,
          class_id: class_id || null,
        }
      ]);
    }

    return success(res, {
      id: userId,
      username,
      email,
      role,
      school_id: school_id || null,
      nisn: role === 'siswa' ? nisn : null,
      class_id: role === 'siswa' ? class_id || null : null,
    }, 'Akun berhasil dibuat');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_id: adminSchoolId, npsn: adminSchoolNpsn } = req.user;
    const payload = sanitizeObject(req.body);
    // allow resolving school by NPSN in payload
    if (payload.school_npsn) {
      const { data: schoolByNpsn, error: schoolNpsnErr } = await supabase.from('schools').select('id, npsn').eq('npsn', payload.school_npsn).maybeSingle();
      if (schoolNpsnErr || !schoolByNpsn) {
        return error(res, 'Sekolah tidak ditemukan untuk NPSN yang diberikan', 400);
      }
      payload.school_id = schoolByNpsn.id;
    }

    const { data: existingUser, error: userErr } = await supabase.from('users').select('*').eq('id', id).single();
    if (userErr || !existingUser) return error(res, 'Akun tidak ditemukan', 404);
    if (adminSchoolId && existingUser.school_id !== adminSchoolId) {
      return error(res, 'Tidak dapat memperbarui akun di luar sekolah Anda', 403);
    }

    if (payload.email) {
      const { data: existingEmail } = await supabase.from('users').select('id').eq('email', payload.email).neq('id', id).maybeSingle();
      if (existingEmail) {
        return error(res, 'Email sudah digunakan', 400);
      }
    }

    const newRole = payload.role || existingUser.role;
    const targetSchoolId = payload.school_id || existingUser.school_id;
    if (adminSchoolId && payload.school_id && payload.school_id !== adminSchoolId) {
      return error(res, 'Tidak dapat mengubah sekolah akun ke luar sekolah Anda', 403);
    }
    if (newRole === 'guru' && !targetSchoolId) {
      return error(res, 'school_id wajib diisi untuk akun guru', 400);
    }
    if (newRole === 'siswa' && !targetSchoolId) {
      return error(res, 'school_id wajib diisi untuk akun siswa', 400);
    }

    if (payload.school_id) {
      const { data: school, error: errSchool } = await supabase.from('schools').select('id').eq('id', payload.school_id).single();
      if (errSchool || !school) {
        return error(res, 'Sekolah tidak ditemukan untuk school_id yang diberikan', 400);
      }
    }

    if (payload.class_id) {
      const { data: classData, error: errClass } = await supabase.from('classes').select('id').eq('id', payload.class_id).single();
      if (errClass || !classData) {
        return error(res, 'Kelas tidak ditemukan untuk class_id yang diberikan', 400);
      }
    }

    const [existingStudentResult, existingTeacherResult] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).maybeSingle(),
      supabase.from('teachers').select('*').eq('user_id', id).maybeSingle(),
    ]);
    if (existingStudentResult.error) return error(res, existingStudentResult.error.message, 500);
    if (existingTeacherResult.error) return error(res, existingTeacherResult.error.message, 500);

    const existingStudent = existingStudentResult.data;
    const existingTeacher = existingTeacherResult.data;

    if (payload.nisn) {
      const { data: existingNisn } = await supabase.from('students').select('id').eq('nisn', payload.nisn).neq('id', id).maybeSingle();
      if (existingNisn) {
        return error(res, 'NISN sudah terdaftar', 400);
      }
    }

    const userUpdate = {};
    if (payload.username) userUpdate.username = payload.username;
    if (payload.email) userUpdate.email = payload.email;
    if (payload.password) {
      userUpdate.password_hash = await hashPassword(payload.password);
    }
    if (payload.role) userUpdate.role = payload.role;
    if (payload.school_id !== undefined) userUpdate.school_id = payload.school_id;

    if (Object.keys(userUpdate).length > 0) {
      const { error: err } = await supabase.from('users').update(userUpdate).eq('id', id);
      if (err) return error(res, err.message, 400);
    }

    if (newRole === 'guru') {
      const teacherPayload = {};
      if (payload.school_id !== undefined) teacherPayload.school_id = payload.school_id;
      if (payload.username) teacherPayload.teacher_name = payload.username;
      if (!existingTeacher) {
        teacherPayload.user_id = id;
        teacherPayload.school_id = teacherPayload.school_id || targetSchoolId;
        teacherPayload.teacher_name = teacherPayload.teacher_name || existingUser.username;
        const { error: err } = await supabase.from('teachers').insert([teacherPayload]);
        if (err) return error(res, err.message, 400);
      } else if (Object.keys(teacherPayload).length > 0) {
        const teacherQuery = supabase.from('teachers').update(teacherPayload).eq('user_id', id);
        if (adminSchoolId) teacherQuery.eq('school_id', adminSchoolId);
        const { error: err } = await teacherQuery;
        if (err) return error(res, err.message, 400);
      }
    } else if (existingTeacher) {
      const teacherQuery = supabase.from('teachers').delete().eq('user_id', id);
      if (adminSchoolId) teacherQuery.eq('school_id', adminSchoolId);
      const { error: err } = await teacherQuery;
      if (err) return error(res, err.message, 500);
    }

    if (newRole === 'siswa') {
      const studentPayload = {};
      if (payload.school_id !== undefined) studentPayload.school_id = payload.school_id;
      if (payload.username) studentPayload.student_name = payload.username;
      if (payload.class_id !== undefined) studentPayload.class_id = payload.class_id;
      if (payload.nisn !== undefined) studentPayload.nisn = payload.nisn;

      if (!existingStudent) {
        if (!studentPayload.nisn) {
          return error(res, 'NISN wajib diisi untuk siswa', 400);
        }
        studentPayload.id = id;
        studentPayload.school_id = studentPayload.school_id || targetSchoolId;
        const { error: err } = await supabase.from('students').insert([studentPayload]);
        if (err) return error(res, err.message, 400);
      } else if (Object.keys(studentPayload).length > 0) {
        const studentQuery = supabase.from('students').update(studentPayload).eq('id', id);
        if (adminSchoolId) studentQuery.eq('school_id', adminSchoolId);
        const { error: err } = await studentQuery;
        if (err) return error(res, err.message, 400);
      }
    } else if (existingStudent) {
      const studentQuery = supabase.from('students').delete().eq('id', id);
      if (adminSchoolId) studentQuery.eq('school_id', adminSchoolId);
      const { error: err } = await studentQuery;
      if (err) return error(res, err.message, 500);
    }

    const { data } = await supabase.from('users').select('id, username, email, role, school_id').eq('id', id).single();
    return success(res, data, 'Akun berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const { school_id: adminSchoolId } = req.user;
  const userQuery = supabase.from('users').delete().eq('id', id);
  if (adminSchoolId) userQuery.eq('school_id', adminSchoolId);
  const { error: err } = await userQuery;
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Akun berhasil dihapus');
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const { school_id: adminSchoolId } = req.user;
    if (!['admin', 'guru', 'siswa'].includes(role)) {
      return error(res, 'Role tidak valid', 400);
    }
    if (adminSchoolId) {
      const { data: existingUser, error: userErr } = await supabase.from('users').select('school_id').eq('id', id).single();
      if (userErr || !existingUser) return error(res, 'Akun tidak ditemukan', 404);
      if (existingUser.school_id !== adminSchoolId) {
        return error(res, 'Tidak dapat mengubah role akun di luar sekolah Anda', 403);
      }
    }
    const { error: err } = await supabase.from('users').update({ role }).eq('id', id);
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('users').select('id, username, email, role, school_id').eq('id', id).single();
    return success(res, data, 'Role pengguna berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const listSubjects = async (req, res) => {
  const { data, error: err } = await supabase.from('subjects').select('*').order('subject_name', { ascending: true });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const createSubject = async (req, res) => {
  const payload = sanitizeObject(req.body);
  const { subject_name } = payload;
  if (!subject_name) return error(res, 'Nama mata pelajaran wajib diisi', 400);

  const { data: existingSubject } = await supabase.from('subjects').select('id').eq('subject_name', subject_name).maybeSingle();
  if (existingSubject) return error(res, 'Nama mata pelajaran sudah terdaftar', 400);

  const { data, error: err } = await supabase.from('subjects').insert([{ subject_name }]).select().single();
  if (err) return error(res, err.message, 400);
  return success(res, data, 'Mata pelajaran berhasil dibuat');
};

const updateSubject = async (req, res) => {
  const { id } = req.params;
  const payload = sanitizeObject(req.body);
  if (payload.subject_name) {
    const { data: existingSubject } = await supabase.from('subjects').select('id').eq('subject_name', payload.subject_name).neq('id', id).maybeSingle();
    if (existingSubject) return error(res, 'Nama mata pelajaran sudah terdaftar', 400);
  }
  const { error: err } = await supabase.from('subjects').update(payload).eq('id', id);
  if (err) return error(res, err.message, 400);
  const { data } = await supabase.from('subjects').select('*').eq('id', id).single();
  return success(res, data, 'Mata pelajaran berhasil diperbarui');
};

const deleteSubject = async (req, res) => {
  const { id } = req.params;
  const { error: err } = await supabase.from('subjects').delete().eq('id', id);
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Mata pelajaran berhasil dihapus');
};

const listClasses = async (req, res) => {
  const { data, error: err } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const createClass = async (req, res) => {
  const payload = sanitizeObject(req.body);
  const { class_name } = payload;
  if (!class_name) return error(res, 'Nama kelas wajib diisi', 400);

  const { data: existingClass } = await supabase.from('classes').select('id').eq('class_name', class_name).maybeSingle();
  if (existingClass) return error(res, 'Nama kelas sudah terdaftar', 400);

  const { data, error: err } = await supabase.from('classes').insert([{ class_name }]).select().single();
  if (err) return error(res, err.message, 400);
  return success(res, data, 'Kelas berhasil dibuat');
};

const updateClass = async (req, res) => {
  const { id } = req.params;
  const payload = sanitizeObject(req.body);
  if (payload.class_name) {
    const { data: existingClass } = await supabase.from('classes').select('id').eq('class_name', payload.class_name).neq('id', id).maybeSingle();
    if (existingClass) return error(res, 'Nama kelas sudah terdaftar', 400);
  }
  const { error: err } = await supabase.from('classes').update(payload).eq('id', id);
  if (err) return error(res, err.message, 400);
  const { data } = await supabase.from('classes').select('*').eq('id', id).single();
  return success(res, data, 'Kelas berhasil diperbarui');
};

const deleteClass = async (req, res) => {
  const { id } = req.params;
  const { error: err } = await supabase.from('classes').delete().eq('id', id);
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Kelas berhasil dihapus');
};

const listApiKeys = async (req, res) => {
  const { data, error: err } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const createApiKey = async (req, res) => {
  const payload = sanitizeObject(req.body);
  const { name, api_key, active } = payload;
  if (!name || !api_key) return error(res, 'Nama API dan kunci wajib diisi', 400);
  const { data, error: err } = await supabase.from('api_keys').insert([{ name, api_key, active: active !== false }]).select().single();
  if (err) return error(res, err.message, 400);
  return success(res, data, 'API key berhasil disimpan');
};

const updateApiKey = async (req, res) => {
  const { id } = req.params;
  const payload = sanitizeObject(req.body);
  const { error: err } = await supabase.from('api_keys').update(payload).eq('id', id);
  if (err) return error(res, err.message, 400);
  const { data } = await supabase.from('api_keys').select('*').eq('id', id).single();
  return success(res, data, 'API key berhasil diperbarui');
};

const toggleApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: existing, error: errFetch } = await supabase.from('api_keys').select('*').eq('id', id).single();
    if (errFetch) return error(res, errFetch.message, 404);
    const { error: err } = await supabase.from('api_keys').update({ active: !existing.active }).eq('id', id);
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('api_keys').select('*').eq('id', id).single();
    return success(res, data, 'Status API key berhasil diubah');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listApiKeys,
  createApiKey,
  updateApiKey,
  toggleApiKey,
};
