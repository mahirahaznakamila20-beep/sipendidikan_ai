const supabase = require('../services/supabaseClient');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, signPasswordResetToken, verifyToken } = require('../utils/jwt');
const { sanitizeObject } = require('../utils/sanitize');
const { error, success } = require('../utils/response');
const { createTestAccounts } = require('../services/devSeedService');
const { v4: uuidv4 } = require('uuid');

const REFRESH_EXPIRE_DAYS = Number(process.env.REFRESH_EXPIRE_DAYS || 7);

const createRefreshRecord = async (user_id) => {
  const token_id = uuidv4();
  const expires_at = new Date(Date.now() + REFRESH_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  const payload = { token_id, user_id };
  // insert record
  const { error: err } = await supabase.from('refresh_tokens').insert([{ token_id, user_id, expires_at }]);
  if (err) throw new Error('Failed to persist refresh token');
  const refreshJwt = signRefreshToken(payload);
  return { refreshJwt, token_id };
};

const revokeRefreshByTokenId = async (token_id) => {
  const { error: err } = await supabase.from('refresh_tokens').update({ revoked: true }).eq('token_id', token_id);
  if (err) throw err;
};

const register = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);

    const {
      username,
      email,
      password,
      school_id: requestedSchoolId,
      school_npsn: requestedSchoolNpsn,
      npsn: alternateSchoolNpsn,
    } = payload;

    if (!username || !email || !password) {
      return error(res, 'Username, email, dan password wajib diisi', 400);
    }

    // resolve school by provided school_id or school_npsn. If school does not exist yet, create a placeholder school.
    let school_id = requestedSchoolId || null;
    const schoolNpsn = requestedSchoolNpsn || alternateSchoolNpsn || null;
    if (!school_id && schoolNpsn) {
      const { data: schoolByNpsn, error: schoolErr } = await supabase.from('schools').select('id').eq('npsn', schoolNpsn).maybeSingle();
      if (schoolErr) {
        return error(res, 'Terjadi kesalahan saat memproses NPSN sekolah', 500);
      }
      if (schoolByNpsn) {
        school_id = schoolByNpsn.id;
      } else {
        const placeholderSchool = {
          school_name: `Sekolah ${schoolNpsn}`,
          npsn: schoolNpsn,
        };
        const { data: newSchool, error: createSchoolErr } = await supabase.from('schools').insert([placeholderSchool]).select('id').maybeSingle();
        if (createSchoolErr || !newSchool) {
          return error(res, 'Gagal membuat data sekolah sementara', 500);
        }
        school_id = newSchool.id;
      }
    }

    if (!school_id) {
      return error(res, 'school_id atau school_npsn wajib diisi saat mendaftar', 400);
    }

    // cek email sudah ada
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return error(res, 'Email sudah digunakan', 400);
    }

    // create user in Supabase Auth first so auth.users(id) exists (prevents FK violation)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
    });

    if (authErr) {
      console.log('AUTH CREATE ERROR:', authErr);
      return error(res, authErr.message || 'Gagal membuat akun auth', 400);
    }

    const createdUserId = (authData && (authData.user?.id || authData.id || authData.user_id)) || uuidv4();

    const password_hash = await hashPassword(password);

    const userPayload = {
      id: createdUserId,
      username,
      email,
      password_hash,
      role: 'guru',
      school_id: school_id,
      school_npsn: schoolNpsn,
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert([userPayload]);
    if (insertError) {
      console.log('REGISTER ERROR:', insertError);
      // attempt to rollback auth user if possible
      try {
        await supabase.auth.admin.deleteUser(createdUserId);
      } catch (e) {
        console.log('Failed to rollback auth user', e.message || e);
      }

      return error(
        res,
        insertError.message || 'Gagal insert user',
        400
      );
    }

    // buat data teacher
    const { error: teacherError } = await supabase
      .from('teachers')
      .insert([
        {
          user_id: userPayload.id,
          school_id: userPayload.school_id,
          teacher_name: username
        }
      ]);

    if (teacherError) {
      console.log('TEACHER ERROR:', teacherError);

      return error(
        res,
        teacherError.message || 'Gagal membuat data guru',
        400
      );
    }

    // activity log
    await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userPayload.id,
          action: 'register',
          metadata: { role: 'guru' }
        }
      ]);

    return success(
      res,
      {
        email,
        role: 'guru'
      },
      'Registrasi berhasil'
    );

  } catch (err) {
    return error(
      res,
      err.message || 'Failed to register',
      500
    );
  }
};

const login = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);
    const { identifier, password, role } = payload;
    if (!identifier || !password) {
      return error(res, 'Identifier dan password wajib diisi', 400);
    }

    if (role === 'siswa') {
      let student = null;
      const { data: studentData } = await supabase.from('students').select('id, nisn, student_name, school_id, password_hash').eq('nisn', identifier).maybeSingle();
      if (studentData) {
        student = studentData;
      } else {
        const { data: userStudent } = await supabase.from('users').select('id, username, email, password_hash, role, school_id').eq('role', 'siswa').or(`email.eq.${identifier},username.eq.${identifier}`).maybeSingle();
        if (userStudent) {
          student = {
            id: userStudent.id,
            student_name: userStudent.username,
            password_hash: userStudent.password_hash,
            school_id: userStudent.school_id,
          };
        }
      }

      if (!student) {
        return error(res, 'Data siswa tidak ditemukan', 404);
      }

      const validPassword = await comparePassword(password, student.password_hash);
      if (!validPassword) {
        return error(res, 'Password salah', 401);
      }
      // include school's NPSN in token payload when available
      let studentNpsn = null;
      if (student.school_id) {
        const { data: school } = await supabase.from('schools').select('npsn').eq('id', student.school_id).maybeSingle();
        if (school) studentNpsn = school.npsn;
      }
      const accessToken = signAccessToken({ id: student.id, role: 'siswa', name: student.student_name, school_id: student.school_id, npsn: studentNpsn });
      const { refreshJwt } = await createRefreshRecord(student.id);
      const userResponse = { id: student.id, role: 'siswa', name: student.student_name };
      if (student.nisn) userResponse.nisn = student.nisn;
      return success(res, { accessToken, refreshToken: refreshJwt, user: userResponse }, 'Login siswa berhasil');
    }

    const { data: user } = await supabase.from('users').select('id, username, email, password_hash, role, school_id').or(`email.eq.${identifier},username.eq.${identifier}`).maybeSingle();
    if (!user) {
      return error(res, 'Akun tidak ditemukan', 404);
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return error(res, 'Password salah', 401);
    }

    let userNpsn = null;
    if (user.school_id) {
      const { data: school } = await supabase.from('schools').select('npsn').eq('id', user.school_id).maybeSingle();
      if (school) userNpsn = school.npsn;
    }
    const accessToken = signAccessToken({ id: user.id, role: user.role, name: user.username, school_id: user.school_id, npsn: userNpsn });
    const { refreshJwt } = await createRefreshRecord(user.id);
    await supabase.from('activity_logs').insert([{ user_id: user.id, action: 'login', metadata: { role: user.role } }]);
    return success(res, {
      accessToken,
      refreshToken: refreshJwt,
      user: { id: user.id, role: user.role, name: user.username, username: user.username, email: user.email, school_id: user.school_id },
    }, 'Login berhasil');
  } catch (err) {
    return error(res, err.message || 'Failed to login', 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token is required', 400);
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (e) {
      return error(res, 'Invalid refresh token', 401);
    }
    const { token_id, user_id } = payload;
    const { data: record, error: recErr } = await supabase.from('refresh_tokens').select('*').eq('token_id', token_id).maybeSingle();
    if (recErr || !record) return error(res, 'Refresh token not found', 401);
    if (record.revoked) return error(res, 'Refresh token revoked', 401);
    if (new Date(record.expires_at) < new Date()) return error(res, 'Refresh token expired', 401);

    // rotate
    await revokeRefreshByTokenId(token_id);
    const { refreshJwt: newRefreshJwt } = await createRefreshRecord(user_id);

    // issue new access
    const { data: user } = await supabase.from('users').select('id, role, school_id, username, email').eq('id', user_id).maybeSingle();
    if (user) {
      let userNpsn = null;
      if (user.school_id) {
        const { data: school } = await supabase.from('schools').select('npsn').eq('id', user.school_id).maybeSingle();
        if (school) userNpsn = school.npsn;
      }
      const accessToken = signAccessToken({ id: user.id, role: user.role, name: user.username, school_id: user.school_id, npsn: userNpsn });
      return success(res, { accessToken, refreshToken: newRefreshJwt }, 'Token refreshed');
    }

    const { data: student } = await supabase.from('students').select('id, student_name, school_id').eq('id', user_id).maybeSingle();
    if (!student) {
      return error(res, 'Pengguna terkait tidak ditemukan', 401);
    }
    const accessToken = signAccessToken({ id: student.id, role: 'siswa', name: student.student_name, school_id: student.school_id });
    return success(res, { accessToken, refreshToken: newRefreshJwt }, 'Token refreshed');
  } catch (err) {
    return error(res, err.message || 'Failed to refresh token', 500);
  }
};

const logout = async (req, res) => {
  try {
    const user = req.user;
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      try {
        const payload = verifyToken(refreshToken);
        if (payload && payload.token_id) {
          await revokeRefreshByTokenId(payload.token_id);
        }
      } catch (e) {
        // ignore invalid token
      }
    } else {
      // revoke all tokens for this user
      await supabase.from('refresh_tokens').update({ revoked: true }).eq('user_id', user.id);
    }
    await supabase.from('activity_logs').insert([{ user_id: user.id, action: 'logout' }]);
    return success(res, {}, 'Logout successful');
  } catch (err) {
    return error(res, err.message || 'Failed to logout', 500);
  }
};

const me = async (req, res) => {
  const user = req.user;
  return success(res, { user }, 'Token valid');
};

const devSeedAccounts = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return error(res, 'Dev-only endpoint disabled in production', 403);
  }

  try {
    const seeds = await createTestAccounts();
    return success(res, seeds, 'Dev test accounts created');
  } catch (err) {
    console.error('Dev seed error:', err.message || err);
    return error(res, err.message || 'Failed to create dev accounts', 500);
  }
};

const passwordReset = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);
    const { email } = payload;
    if (!email) {
      return error(res, 'Email wajib diisi', 400);
    }

    const { data: user } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
    if (!user) {
      return error(res, 'Email tidak ditemukan', 404);
    }

    const resetToken = signPasswordResetToken({ userId: user.id, email: user.email });
    return success(res, { resetToken }, 'Permintaan reset password diterima. Gunakan token untuk reset.');
  } catch (err) {
    return error(res, err.message || 'Failed to request password reset', 500);
  }
};

const confirmPasswordReset = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);
    const { resetToken, newPassword } = payload;
    if (!resetToken || !newPassword) {
      return error(res, 'Reset token dan password baru wajib diisi', 400);
    }

    let tokenPayload;
    try {
      tokenPayload = verifyToken(resetToken);
    } catch (err) {
      return error(res, 'Token reset tidak valid atau sudah kedaluwarsa', 400);
    }

    const { userId } = tokenPayload;
    if (!userId) {
      return error(res, 'Token reset tidak valid', 400);
    }

    const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
    if (!user) {
      return error(res, 'Pengguna tidak ditemukan', 404);
    }

    const { data, error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (authErr) {
      return error(res, authErr.message || 'Gagal mengubah password', 500);
    }

    await supabase.from('activity_logs').insert([{ user_id: userId, action: 'password_reset' }]);
    return success(res, {}, 'Password berhasil di-reset');
  } catch (err) {
    return error(res, err.message || 'Failed to confirm password reset', 500);
  }
};

module.exports = { register, login, me, passwordReset, confirmPasswordReset, refreshToken, logout, devSeedAccounts };
