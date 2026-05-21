const supabase = require('../services/supabaseClient');
const { sanitizeObject } = require('../utils/sanitize');
const { error, success } = require('../utils/response');
const { hashPassword } = require('../utils/hash');
const { v4: uuidv4 } = require('uuid');

const listModules = async (req, res) => {
  const { school_id } = req.user;
  const { data, error: err } = await supabase.from('learning_modules').select('*').eq('school_id', school_id).order('created_at', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const listAssignments = async (req, res) => {
  const { school_id } = req.user;
  const { data, error: err } = await supabase.from('assignments').select('*, classes(class_name)').eq('school_id', school_id).order('created_at', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const submitAssignment = async (req, res) => {
  try {
    const { id: student_id } = req.user;
    const { file } = req;
    const { assignment_id } = req.params;
    if (!file) return error(res, 'File tugas wajib diunggah', 400);

    const payload = {
      id: uuidv4(),
      assignment_id,
      student_id,
      file_path: `/uploads/${file.filename}`,
      status: 'submitted',
    };
    const { data, error: err } = await supabase.from('assignment_submissions').insert([payload]);
    if (err) return error(res, err.message, 400);
    return success(res, data[0], 'Tugas berhasil dikumpulkan');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const listExamPackages = async (req, res) => {
  const { school_id } = req.user;
  const { data, error: err } = await supabase.from('exams').select('*').eq('school_id', school_id).order('start_time', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const getExamByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { data: exam, error: err } = await supabase.from('exams').select('*').eq('token', token).single();
    if (err || !exam) return error(res, 'Ujian tidak ditemukan', 404);
    // prevent cross-school access: exam token must belong to the same school as the user
    const { school_id: userSchoolId } = req.user;
    if (userSchoolId && exam.school_id !== userSchoolId) return error(res, 'Ujian tidak ditemukan', 404);
    const now = new Date();
    if (new Date(exam.start_time) > now || new Date(exam.end_time) < now) {
      return error(res, 'Ujian belum aktif atau sudah berakhir', 400);
    }
    const { data: questions } = await supabase.from('exam_questions').select('sequence, question_bank_id, question_banks(question_type, question_text, options_json, answer_key, explanation, bloom_level)').eq('exam_id', exam.id);
    return success(res, { exam, questions });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const submitExam = async (req, res) => {
  try {
    const { id: student_id } = req.user;
    const { answers, score } = req.body;
    const { examId } = req.params;
    if (!answers) return error(res, 'Jawaban ujian wajib diserahkan', 400);

    let answersValue = answers;
    if (typeof answers === 'string') {
      try {
        answersValue = JSON.parse(answers);
      } catch (parseError) {
        return error(res, 'Jawaban ujian tidak valid', 400);
      }
    }

    const payload = {
      id: uuidv4(),
      exam_id: examId,
      student_id,
      score: Number(score) || 0,
      answers: answersValue,
    };
    const { data, error: err } = await supabase.from('exam_results').insert([payload]);
    if (err) return error(res, err.message, 400);
    return success(res, data[0], 'Ujian berhasil disubmit');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getExamResults = async (req, res) => {
  const { id: student_id } = req.user;
  const { data, error: err } = await supabase.from('exam_results').select('*, exams(title, start_time, end_time)').eq('student_id', student_id).order('submitted_at', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [{ data: student, error: studentErr }, { data: user, error: userErr }] = await Promise.all([
      supabase.from('students').select('id, nisn, student_name, school_id, class_id').eq('id', studentId).maybeSingle(),
      supabase.from('users').select('id, username, email, school_id').eq('id', studentId).maybeSingle(),
    ]);

    if (studentErr || userErr) {
      const err = studentErr || userErr;
      return error(res, err.message || 'Gagal memuat profil', 500);
    }

    if (!student && !user) {
      return error(res, 'Profil siswa tidak ditemukan', 404);
    }

    return success(res, {
      id: student?.id || user?.id,
      student_name: student?.student_name || user?.username || '',
      nisn: student?.nisn || null,
      email: user?.email || '',
      school_id: student?.school_id || user?.school_id || null,
      class_id: student?.class_id || null,
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const payload = sanitizeObject(req.body);
    const { password } = payload;
    if (!password || password.length < 6) {
      return error(res, 'Password minimal 6 karakter', 400);
    }

    const password_hash = await hashPassword(password);
    const { error: authErr } = await supabase.auth.admin.updateUserById(studentId, { password });
    if (authErr) {
      return error(res, authErr.message || 'Gagal memperbarui password Auth', 500);
    }

    const { data: existingStudent, error: studentErr } = await supabase.from('students').select('id').eq('id', studentId).maybeSingle();
    if (studentErr) return error(res, studentErr.message, 500);
    if (existingStudent) {
      const { error: updateErr } = await supabase.from('students').update({ password_hash }).eq('id', studentId);
      if (updateErr) return error(res, updateErr.message, 500);
    }

    const { data: existingUser, error: userErr } = await supabase.from('users').select('id').eq('id', studentId).maybeSingle();
    if (userErr) return error(res, userErr.message, 500);
    if (existingUser) {
      const { error: updateErr } = await supabase.from('users').update({ password_hash }).eq('id', studentId);
      if (updateErr) return error(res, updateErr.message, 500);
    }

    if (!existingStudent && !existingUser) {
      return error(res, 'Profil siswa tidak ditemukan', 404);
    }

    return success(res, {}, 'Password berhasil disimpan');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

module.exports = {
  listModules,
  listAssignments,
  submitAssignment,
  listExamPackages,
  getExamByToken,
  submitExam,
  getExamResults,
  getStudentProfile,
  updateStudentProfile,
};
