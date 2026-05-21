const fs = require('fs');
const csv = require('csv-parser');
const supabase = require('../services/supabaseClient');
const { hashPassword } = require('../utils/hash');
const { sanitizeObject } = require('../utils/sanitize');
const { error, success } = require('../utils/response');
const { generateQuestionBank } = require('../services/groqService');
const { v4: uuidv4 } = require('uuid');
console.log('teacherController loaded');

const getSchoolProfile = async (req, res) => {
  const { school_id } = req.user;
  const { data, error: err } = await supabase.from('schools').select('*').eq('id', school_id).single();
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const updateSchoolProfile = async (req, res) => {
  try {
    const { school_id } = req.user;
    const payload = sanitizeObject(req.body);
    const { error: err } = await supabase.from('schools').update(payload).eq('id', school_id);
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('schools').select('*').eq('id', school_id).single();
    return success(res, data, 'Identitas sekolah berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const getTeacherProfile = async (req, res) => {
  const { id, school_id } = req.user;
  const { data, error: err } = await supabase.from('teachers').select('id, teacher_name, teacher_nip').eq('user_id', id).eq('school_id', school_id).single();
  if (err) return error(res, err.message, 500);
  const { data: user } = await supabase.from('users').select('username, email, role').eq('id', id).single();
  return success(res, { ...data, ...user });
};

const updateTeacherProfile = async (req, res) => {
  try {
    const { id, school_id } = req.user;
    const payload = sanitizeObject(req.body);
    const { teacher_name, teacher_nip, subject_ids, class_ids } = payload;
    const { data: teacherRow, error: teacherErr } = await supabase.from('teachers').select('id').match({ user_id: id, school_id }).single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const teacherId = teacherRow.id;

    if (teacher_name || teacher_nip) {
      await supabase.from('teachers').update({ teacher_name, teacher_nip }).match({ user_id: id, school_id });
    }

    if (Array.isArray(subject_ids)) {
      await supabase.from('teacher_subjects').delete().match({ teacher_id: teacherId });
      const insertSubjects = subject_ids.filter(Boolean).map((subject_id) => ({ teacher_id: teacherId, subject_id }));
      if (insertSubjects.length) await supabase.from('teacher_subjects').insert(insertSubjects);
    }

    if (Array.isArray(class_ids)) {
      await supabase.from('teacher_classes').delete().match({ teacher_id: teacherId });
      const insertClasses = class_ids.filter(Boolean).map((class_id) => ({ teacher_id: teacherId, class_id }));
      if (insertClasses.length) await supabase.from('teacher_classes').insert(insertClasses);
    }

    return success(res, {}, 'Identitas guru berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const resolveClassId = async (classValue) => {
  if (!classValue) return null;
  const normalized = String(classValue).trim();
  if (isUuid(normalized)) return normalized;
  const { data: classRow, error: classErr } = await supabase.from('classes').select('id').ilike('class_name', normalized).maybeSingle();
  if (classErr) return null;
  return classRow?.id || null;
};

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    const match = value.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (innerErr) {
        return null;
      }
    }
    const objectMatch = value.match(/(\{[\s\S]*\})/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[1]);
      } catch (innerErr) {
        return null;
      }
    }
    return null;
  }
};

const createAiGenerationLog = async ({ teacherId, school_id, subject_id, class_id, prompt, parameters, generatedCount }) => {
  try {
    await supabase.from('ai_generation_logs').insert([{
      id: uuidv4(),
      teacher_id: teacherId,
      school_id,
      subject_id,
      class_id: class_id || null,
      prompt,
      parameters: JSON.stringify(parameters),
      generated_count: generatedCount || 0,
    }]);
  } catch (err) {
    console.error('Failed to write AI generation log', err.message || err);
  }
};

const listSubjects = async (req, res) => {
  const { data, error: err } = await supabase.from('subjects').select('*').order('subject_name', { ascending: true });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const listClasses = async (req, res) => {
  const { data, error: err } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const importStudents = async (req, res) => {
  try {
    const { school_id } = req.user;
    const file = req.file;
    if (!file) return error(res, 'File CSV tidak ditemukan', 400);
    const text = fs.readFileSync(file.path, 'utf8');
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (rows.length < 2) return error(res, 'File CSV tidak memiliki data siswa', 400);
    const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
    const allowedHeaders = ['student_name', 'name', 'nisn', 'password', 'class_id', 'class_name'];
    const invalidHeader = headers.find((header) => !allowedHeaders.includes(header));
    if (invalidHeader) return error(res, `Header CSV tidak dikenal: ${invalidHeader}`, 400);

    const students = [];
    const nisnSet = new Set();
    const classCache = {};

    for (let i = 1; i < rows.length; i += 1) {
      const values = rows[i].split(',').map((value) => value.trim());
      if (values.every((value) => value === '')) continue;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      const student_name = record.student_name || record.name;
      const nisn = record.nisn;
      if (!student_name || !nisn) continue;
      if (nisnSet.has(nisn)) continue;
      nisnSet.add(nisn);
      let class_id = record.class_id || null;
      if (!class_id && record.class_name) {
        const classNameKey = record.class_name.toLowerCase();
        if (classCache[classNameKey]) {
          class_id = classCache[classNameKey];
        } else {
          const { data: classRow } = await supabase.from('classes').select('id').ilike('class_name', record.class_name).maybeSingle();
          if (classRow) {
            classCache[classNameKey] = classRow.id;
            class_id = classRow.id;
          }
        }
      }
      const password = record.password && record.password.length >= 6 ? record.password : (nisn.length >= 6 ? nisn : uuidv4().slice(0, 8));
      students.push({ student_name, nisn, password, class_id: class_id || null });
    }
    if (!students.length) return error(res, 'Tidak ada data siswa valid di file CSV', 400);

    const existing = await supabase.from('students').select('nisn').in('nisn', students.map((student) => student.nisn));
    if (existing.error) return error(res, existing.error.message, 500);
    const existingNisn = new Set((existing.data || []).map((row) => row.nisn));
    const toCreate = students.filter((student) => !existingNisn.has(student.nisn));

    if (!toCreate.length) return error(res, 'Semua NISN pada file sudah terdaftar', 400);

    const createdRecords = [];
    for (const student of toCreate) {
      const { authUserId } = await createStudentAuthAccount({
        student_name: student.student_name,
        nisn: student.nisn,
        password: student.password,
        school_id,
      });
      createdRecords.push({
        id: authUserId,
        school_id,
        student_name: student.student_name,
        nisn: student.nisn,
        class_id: student.class_id,
      });
    }

    const { data, error: err } = await supabase.from('students').insert(createdRecords).select('id, student_name, nisn, class_id');
    if (err) {
      return error(res, err.message, 500);
    }
    return success(res, data, `Berhasil mengimpor ${data.length} siswa`);
  } catch (err) {
    return error(res, err.message || 'Gagal mengimpor siswa', 500);
  }
};

const listStudents = async (req, res) => {
  const { school_id } = req.user;
  const { data, error: err } = await supabase.from('students').select('id, student_name, nisn, class_id, created_at').eq('school_id', school_id).order('created_at', { ascending: false });
  if (err) return error(res, err.message, 500);
  return success(res, data);
};

const createStudent = async (req, res) => {
  try {
    const payload = sanitizeObject(req.body);
    const { student_name, nisn, password, class_id } = payload;
    const school_id = req.user.school_id;

    if (!student_name || !nisn) {
      return error(res, 'Nama siswa dan NISN wajib diisi', 400);
    }

    const resolvedClassId = await resolveClassId(class_id);

    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('nisn', nisn)
      .maybeSingle();

    if (existingStudent) {
      return error(res, 'NISN sudah digunakan', 400);
    }

    const { authUserId } = await createStudentAuthAccount({
      student_name,
      nisn,
      password,
      school_id,
    });

    const studentPayload = {
      id: authUserId,
      school_id,
      student_name,
      nisn,
      class_id: resolvedClassId || null,
    };

    const { data, error: err } = await supabase
      .from('students')
      .insert([studentPayload])
      .select();

    if (err) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (_) {}
      return error(res, err.message, 400);
    }

    return success(res, data?.[0] || studentPayload, 'Siswa berhasil ditambahkan');
  } catch (err) {
    return error(res, err.message || 'Failed to create student', 500);
  }
};

const updateStudent = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const payload = sanitizeObject(req.body);
    if (payload.password) {
      payload.password_hash = await hashPassword(payload.password);
      delete payload.password;
    }
    if (payload.class_id) {
      payload.class_id = await resolveClassId(payload.class_id);
    }
    const { error: err } = await supabase.from('students').update(payload).match({ id, school_id });
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('students').select('id, student_name, nisn, class_id').match({ id, school_id }).single();
    return success(res, data, 'Siswa berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteStudent = async (req, res) => {
  const { school_id } = req.user;
  const { id } = req.params;
  const { error: err } = await supabase.from('students').delete().match({ id, school_id });
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Siswa berhasil dihapus');
};

const listQuestionBanks = async (req, res) => {
  const { school_id } = req.user;
  const { subject_id, class_id } = req.query;
  // include package info, subject and class
  // Try nested select first (requires a DB foreign key relationship).
  try {
    let query = supabase
      .from('question_banks')
      .select('*, subjects(subject_name), classes(class_name), question_packages(id, name)')
      .eq('school_id', school_id);
    if (subject_id) query = query.eq('subject_id', subject_id);
    if (class_id) query = query.eq('class_id', class_id);
    const { data, error: err } = await query.order('created_at', { ascending: false });
    if (err) throw err;
    return success(res, data);
  } catch (nestedErr) {
    // Fallback: no FK relationship in schema — fetch question_banks and packages separately and map
    try {
      let qbQuery = supabase.from('question_banks').select('*').eq('school_id', school_id);
      if (subject_id) qbQuery = qbQuery.eq('subject_id', subject_id);
      if (class_id) qbQuery = qbQuery.eq('class_id', class_id);
      const { data: qbData, error: qbErr } = await qbQuery.order('created_at', { ascending: false });
      if (qbErr) return error(res, qbErr.message, 500);

      // collect package ids
      const packageIds = Array.from(new Set((qbData || []).map((r) => r.package_id).filter(Boolean)));
      let packages = [];
      if (packageIds.length) {
        const { data: pkgData, error: pkgErr } = await supabase.from('question_packages').select('id, name').in('id', packageIds);
        if (!pkgErr && pkgData) packages = pkgData;
      }
      const pkgMap = (packages || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

      const enhanced = (qbData || []).map((r) => ({
        ...r,
        subjects: r.subject_id ? { subject_name: r.subject_id } : null,
        classes: r.class_id ? { class_name: r.class_id } : null,
        question_packages: r.package_id ? (pkgMap[r.package_id] || null) : null,
      }));

      return success(res, enhanced);
    } catch (fallbackErr) {
      return error(res, fallbackErr.message || 'Failed to list question banks', 500);
    }
  }
};

const createQuestion = async (req, res) => {
  console.error('POST /api/teacher/bank BODY:', JSON.stringify(req.body));
  try {
    const { school_id, id } = req.user;
    const payload = sanitizeObject(req.body);
    const { subject_id, class_id, question_type, question_text, options_json, answer_key, explanation, bloom_level } = payload;

    if (!subject_id) return error(res, 'subject_id diperlukan', 400);
    if (!question_type) return error(res, 'question_type diperlukan', 400);
    if (!question_text) return error(res, 'question_text diperlukan', 400);
    if (!answer_key && question_type !== 'uraian' && question_type !== 'isian_singkat') {
      return error(res, 'answer_key diperlukan untuk tipe soal ini', 400);
    }

    let optionsValue = null;
    if (options_json !== undefined && options_json !== null && options_json !== '') {
      if (typeof options_json === 'string') {
        try {
          optionsValue = JSON.parse(options_json);
        } catch (parseError) {
          return error(res, 'options_json tidak valid', 400);
        }
      } else {
        optionsValue = options_json;
      }

      if (question_type?.startsWith('pilihan_')) {
        const isValidOptions = Array.isArray(optionsValue) || (typeof optionsValue === 'object' && optionsValue !== null);
        if (!isValidOptions) {
          return error(res, 'options_json harus berupa array atau objek untuk soal pilihan', 400);
        }
      }
    }

    const { data: teacherRow, error: teacherErr } = await supabase.from('teachers').select('id').match({ user_id: id, school_id }).single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const teacherId = teacherRow.id;

    // handle package creation if provided
    let package_id = payload.package_id || null;
    if (payload.package_name) {
      const foundPackageId = await findOrCreateQuestionPackage({
        school_id,
        teacher_id: teacherId,
        package_name: payload.package_name,
        subject_id,
        class_id,
      });
      if (foundPackageId) package_id = foundPackageId;
    }

    const record = {
      id: uuidv4(),
      school_id,
      teacher_id: teacherId,
      subject_id,
      class_id,
      package_id,
      question_type,
      question_text,
      options_json: optionsValue,
      answer_key,
      explanation,
      bloom_level,
      image_url: payload.image_url || null,
      points: Number(payload.points) || 1,
    };
    const { data, error: err } = await supabase.from('question_banks').insert([record]).select().single();
    if (err) return error(res, err.message, 400);
    return success(res, data || record, 'Soal berhasil disimpan');
  } catch (err) {
    console.error('POST /api/teacher/bank ERROR:', err.stack || err.message || err);
    return error(res, err.message || 'Terjadi kesalahan server', 500);
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const payload = sanitizeObject(req.body);
    if (payload.options_json) {
      if (typeof payload.options_json === 'string') {
        try {
          payload.options_json = JSON.parse(payload.options_json);
        } catch (parseError) {
          return error(res, 'options_json tidak valid', 400);
        }
      }
    }
    if (payload.image_url === '') {
      payload.image_url = null;
    }
      if (payload.points !== undefined) {
        payload.points = Number(payload.points) || 1;
      }
      if (payload.package_name) {
        const { data: teacherRow } = await supabase.from('teachers').select('id').match({ user_id: req.user.id, school_id }).single();
        const foundPackageId = await findOrCreateQuestionPackage({
          school_id,
          teacher_id: teacherRow.id,
          package_name: payload.package_name,
          subject_id: payload.subject_id,
          class_id: payload.class_id,
        });
        if (foundPackageId) payload.package_id = foundPackageId;
        delete payload.package_name;
      }
    const { error: err } = await supabase.from('question_banks').update(payload).match({ id, school_id });
    if (err) return error(res, err.message, 400);
    const { data } = await supabase.from('question_banks').select('*').match({ id, school_id }).single();
    return success(res, data, 'Soal berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

const deleteQuestion = async (req, res) => {
  const { school_id } = req.user;
  const { id } = req.params;
  const { error: err } = await supabase.from('question_banks').delete().match({ id, school_id });
  if (err) return error(res, err.message, 500);
  return success(res, {}, 'Soal berhasil dihapus');
};

const importAIQuestions = async (req, res) => {
  try {
    const { school_id, id } = req.user;
    const payload = req.body;
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    const subject_id = payload.subject_id;
    const class_id = payload.class_id || null;
    let package_name = payload.package_name || null;
    if (!subject_id || !questions.length) return error(res, 'Subject dan daftar soal wajib diisi', 400);

    const { data: teacherRow, error: teacherErr } = await supabase.from('teachers').select('id').match({ user_id: id, school_id }).single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const teacher_id = teacherRow.id;

    // Always create a package if not provided
    if (!package_name) {
      package_name = `Paket AI - ${new Date().toLocaleString('id-ID')}`;
    }

    const package_id = uuidv4();
    const pkg = { id: package_id, school_id, teacher_id, name: package_name, subject_id, class_id };
    const { error: pkgErr } = await supabase.from('question_packages').insert([pkg]);
    if (pkgErr) return error(res, 'Gagal membuat paket soal: ' + pkgErr.message, 500);

    const insertRecords = questions.map((question) => {
      const optionsValue = question.options_json || question.options || null;
      return {
        id: uuidv4(),
        school_id,
        teacher_id,
        subject_id,
        class_id,
        package_id,
        question_type: question.type || question.question_type || 'pilihan_ganda',
        question_text: question.question || question.question_text || '',
        options_json: optionsValue,
        answer_key: question.answer || question.answer_key || '',
        explanation: question.explanation || question.pembahasan || '',
        bloom_level: question.bloom || question.level || '',
        image_url: question.image_url || null,
      };
    });

    const { data, error: err } = await supabase.from('question_banks').insert(insertRecords).select('*');
    if (err) return error(res, err.message || 'Gagal menyimpan soal AI ke bank soal', 500);
    
    return success(res, { 
      questions: data, 
      package: { id: package_id, name: package_name, subject_id, class_id },
      count: data?.length || 0 
    }, `✅ ${data?.length || 0} soal AI berhasil disimpan ke bank soal dalam paket "${package_name}"`);
  } catch (err) {
    return error(res, err.message || 'Gagal menyimpan soal AI ke bank soal', 500);
  }
};

const uploadQuestionImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return error(res, 'File gambar tidak ditemukan', 400);
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    return success(res, { image_url: imageUrl }, 'Gambar berhasil diunggah');
  } catch (err) {
    return error(res, err.message || 'Gagal mengunggah gambar', 500);
  }
};

const importQuestions = async (req, res) => {
  try {
    const { school_id, id } = req.user;
    const file = req.file;
    if (!file) return error(res, 'File tidak ditemukan', 400);

    const { data: teacherRow, error: teacherErr } = await supabase
      .from('teachers')
      .select('id')
      .match({ user_id: id, school_id })
      .single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const teacher_id = teacherRow.id;

    const questions = [];
    const allowedHeaders = new Set([
      'question_type',
      'question_text',
      'subject_id',
      'class_id',
      'options_json',
      'answer_key',
      'bloom_level',
      'image_url',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'option_e',
      'package_id',
      'package_name',
      'points',
      'explanation'
    ]);
    let rowNumber = 1;

    await new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
        .on('headers', (headers) => {
          const invalidHeader = headers.find((header) => header && !allowedHeaders.has(header.trim().toLowerCase()));
          if (invalidHeader) {
            reject(new Error(`Header CSV tidak dikenal: ${invalidHeader}`));
          }
        })
        .on('data', (row) => {
          rowNumber += 1;
          const record = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value === undefined || value === null ? '' : String(value).trim()])
          );

          if (Object.values(record).every((value) => value === '')) return;

          const question_type = record.question_type || 'pilihan_ganda';
          const question_text = record.question_text || record.soal || '';
          if (!question_text) return;

          const subject_id = record.subject_id || null;
          const class_id = record.class_id || null;
          const package_id = record.package_id || null;
          const points = record.points ? Number(record.points) || 1 : 1;
          const image_url = record.image_url || null;
          const answer_key = record.answer_key || record.answer || '';
          const explanation = record.explanation || record.pembahasan || '';
          const bloom_level = record.bloom_level || record.bloom || '';

          let options_json = null;
          if (record.options_json) {
            try {
              options_json = JSON.parse(record.options_json);
            } catch (parseErr) {
              options_json = null;
            }
          }

          const optionFields = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
          const optionData = optionFields.reduce((acc, key) => {
            if (record[key]) {
              const optionKey = key.slice(-1).toUpperCase();
              acc[optionKey] = record[key];
            }
            return acc;
          }, {});
          if (Object.keys(optionData).length) {
            options_json = { ...(options_json || {}), ...optionData };
          }

          questions.push({
            id: uuidv4(),
            school_id,
            teacher_id,
            subject_id,
            class_id,
            package_id,
            question_type,
            question_text,
            options_json,
            answer_key,
            explanation,
            bloom_level,
            image_url,
            points
          });
        })
        .on('error', reject)
        .on('end', resolve);
    });

    if (!questions.length) return error(res, 'Tidak ada soal valid ditemukan di file CSV', 400);

    const { error: err } = await supabase.from('question_banks').insert(questions, { returning: 'minimal' });
    if (err) return error(res, err.message, 500);

    return success(res, { imported: questions.length }, `Berhasil mengimpor ${questions.length} soal`);
  } catch (err) {
    return error(res, err.message || 'Gagal mengimpor soal', 500);
  }
};

const previewQuestion = async (req, res) => {
  const { school_id } = req.user;
  const { id } = req.params;
  const { data, error: err } = await supabase.from('question_banks').select('*').match({ id, school_id }).single();
  if (err) return error(res, err.message, 404);
  return success(res, data);
};

const findOrCreateQuestionPackage = async ({ school_id, teacher_id, package_name, subject_id, class_id }) => {
  if (!package_name) return null;
  const normalizedName = String(package_name).trim();
  if (!normalizedName) return null;
  const { data: existing, error: findErr } = await supabase.from('question_packages').select('id').match({
    school_id,
    teacher_id,
    name: normalizedName,
    subject_id: subject_id || null,
    class_id: class_id || null,
  }).limit(1);
  if (!findErr && Array.isArray(existing) && existing.length > 0) {
    return existing[0].id;
  }
  const newPkg = {
    id: uuidv4(),
    school_id,
    teacher_id,
    name: normalizedName,
    subject_id: subject_id || null,
    class_id: class_id || null,
  };
  const { error: insertErr } = await supabase.from('question_packages').insert([newPkg]);
  if (insertErr) return null;
  return newPkg.id;
};

const createStudentAuthAccount = async ({ student_name, nisn, password, school_id }) => {
  const normalizedNisn = String(nisn).trim();
  if (!normalizedNisn) throw new Error('NISN tidak valid');
  const passwordToUse = password && password.length >= 6 ? password : (normalizedNisn.length >= 6 ? normalizedNisn : uuidv4().slice(0, 8));
  const email = `${normalizedNisn}@student.${school_id}.local`;
  const username = normalizedNisn;

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: passwordToUse,
    user_metadata: { username, role: 'siswa' },
  });

  if (authErr) {
    throw new Error(authErr.message || 'Gagal membuat akun auth siswa');
  }
  const authUserId = authData?.user?.id || authData?.id || authData?.user_id;
  if (!authUserId) {
    throw new Error('ID pengguna auth siswa tidak ditemukan');
  }

  const password_hash = await hashPassword(passwordToUse);
  const userPayload = {
    id: authUserId,
    username,
    email,
    password_hash,
    role: 'siswa',
    school_id,
  };
  const { error: userErr } = await supabase.from('users').insert([userPayload]);
  if (userErr) {
    try {
      await supabase.auth.admin.deleteUser(authUserId);
    } catch (_) {}
    throw new Error(userErr.message || 'Gagal menyimpan akun siswa');
  }

  return { authUserId, passwordToUse };
};

const listQuestionPackages = async (req, res) => {
  try {
    const { school_id, id } = req.user;
    const { data: teacherRow, error: teacherErr } = await supabase.from('teachers').select('id').match({ user_id: id, school_id }).single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const { data, error: err } = await supabase.from('question_packages')
      .select('id, name, subject_id, class_id')
      .eq('school_id', school_id)
      .eq('teacher_id', teacherRow.id)
      .order('created_at', { ascending: false });
    if (err) return error(res, err.message, 500);
    const normalized = (data || []).map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      package_name: pkg.name,
      subject_id: pkg.subject_id || null,
      class_id: pkg.class_id || null,
    }));
    return success(res, normalized);
  } catch (err) {
    return error(res, err.message || 'Gagal mengambil paket soal', 500);
  }
};

const generateQuestions = async (req, res) => {
  try {
    const { school_id, id } = req.user;
    const payload = sanitizeObject(req.body);
    const {
      subject_id,
      topics,
      choices,
      complex,
      fill,
      essay,
      image_ratio,
      difficulty,
      class_id,
      custom_prompt,
    } = payload;
    const topicText = Array.isArray(topics) ? topics.filter(Boolean).join(', ') : '';
    if (!subject_id || !topicText) return error(res, 'Subject dan materi pokok wajib diisi', 400);
    const { data: teacherRow, error: teacherErr } = await supabase.from('teachers').select('id').match({ user_id: id, school_id }).single();
    if (teacherErr) return error(res, teacherErr.message, 500);
    const teacher_id = teacherRow.id;
    const { data: subject } = await supabase.from('subjects').select('subject_name').eq('id', subject_id).single();

    const aiResponse = await generateQuestionBank({
      subject: subject.subject_name,
      topic: topicText,
      choices: Number(choices) || 0,
      complex: Number(complex) || 0,
      fill: Number(fill) || 0,
      essay: Number(essay) || 0,
      imageRatio: Number(image_ratio) || 0,
      difficulty: difficulty || 'sedang',
      customPrompt: custom_prompt || null,
    });

    const parsed = safeParseJson(aiResponse);
    if (!Array.isArray(parsed) || !parsed.length) {
      return error(res, 'AI tidak menghasilkan data soal yang valid', 500);
    }

    await createAiGenerationLog({
      teacherId: teacher_id,
      school_id,
      subject_id,
      class_id,
      prompt: aiResponse,
      parameters: { choices, complex, fill, essay, image_ratio, difficulty, topics: topicText, custom_prompt },
      generatedCount: parsed.length,
    });

    return success(res, { generated: parsed }, 'Paket soal AI berhasil dibuat');
  } catch (err) {
    return error(res, err.message || 'Failed to generate questions', 500);
  }
};

const createExam = async (req, res) => {
  try {
    const { school_id } = req.user;
    const payload = sanitizeObject(req.body);
    const {
      title,
      class_id,
      subject_id,
      package_id,
      start_time,
      end_time,
      description,
      randomized,
      randomize_options,
      auto_submit,
      show_realtime_score,
    } = payload;

    if (!title || !class_id || !subject_id || !package_id || !start_time || !end_time) {
      return error(res, 'Judul, paket, kelas, mata pelajaran, jadwal mulai dan berakhir wajib diisi', 400);
    }

    const token = uuidv4().slice(0, 8).toUpperCase();
    const examId = uuidv4();
    const now = new Date().toISOString();
    const examPayload = {
      id: examId,
      title,
      school_id,
      class_id,
      subject_id,
      package_id,
      token,
      start_time,
      end_time,
      description: description || null,
      randomized: randomized === undefined ? true : Boolean(randomized),
      randomize_options: randomize_options === undefined ? true : Boolean(randomize_options),
      auto_submit: Boolean(auto_submit),
      show_realtime_score: Boolean(show_realtime_score),
      created_at: now,
      updated_at: now,
    };

    const { error: err } = await supabase.from('exams').insert([examPayload]);
    if (err) {
      console.error('Insert exam error:', err);
      return error(res, err.message || 'Gagal insert ujian ke database', 400);
    }

    console.log('Exam inserted successfully with id:', examId);

    const { data: questions, error: errQuestions } = await supabase
      .from('question_banks')
      .select('id')
      .eq('school_id', school_id)
      .eq('package_id', package_id)
      .limit(100);
    
    if (errQuestions) {
      console.error('Query questions error:', errQuestions);
      await supabase.from('exams').delete().eq('id', examId);
      return error(res, errQuestions.message, 500);
    }
    
    if (!questions || !questions.length) {
      console.error('No questions found for package:', package_id);
      await supabase.from('exams').delete().eq('id', examId);
      return error(res, 'Tidak ada soal ditemukan untuk paket ujian ini. Pastikan paket sudah berisi soal.', 400);
    }

    console.log(`Found ${questions.length} questions for exam`);

    const examQuestions = questions.map((item, index) => ({ 
      id: uuidv4(), 
      exam_id: examId, 
      question_bank_id: item.id, 
      sequence: index + 1 
    }));
    
    const { error: errExamQuestions } = await supabase.from('exam_questions').insert(examQuestions);
    if (errExamQuestions) {
      console.error('Insert exam questions error:', errExamQuestions);
      await supabase.from('exams').delete().eq('id', examId);
      return error(res, errExamQuestions.message || 'Gagal menambahkan soal ke ujian', 400);
    }

    console.log('Exam created successfully');
    
    const examResponse = {
      id: examId,
      title,
      school_id,
      class_id,
      subject_id,
      package_id,
      token,
      start_time,
      end_time,
      description: description || null,
      randomized: randomized === undefined ? true : Boolean(randomized),
      randomize_options: randomize_options === undefined ? true : Boolean(randomize_options),
      auto_submit: Boolean(auto_submit),
      show_realtime_score: Boolean(show_realtime_score),
      created_at: now,
      updated_at: now,
    };

    return success(res, examResponse, 'Paket ujian berhasil dibuat');
  } catch (err) {
    console.error('Create exam error:', err);
    return error(res, err.message || 'Gagal membuat ujian', 500);
  }
};

const listExams = async (req, res) => {
  const { school_id } = req.user;
  try {
    const { data: exams, error: examErr } = await supabase.from('exams')
      .select('*')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false });
    if (examErr) throw examErr;

    const packageIds = Array.from(new Set((exams || []).map((exam) => exam.package_id).filter(Boolean)));
    let packageMap = {};
    if (packageIds.length) {
      const { data: packages, error: pkgErr } = await supabase.from('question_packages').select('id, name').in('id', packageIds);
      if (!pkgErr && Array.isArray(packages)) {
        packageMap = packages.reduce((acc, pkg) => {
          acc[pkg.id] = pkg;
          return acc;
        }, {});
      }
    }

    const enriched = (exams || []).map((exam) => ({
      ...exam,
      question_packages: exam.package_id ? packageMap[exam.package_id] || null : null,
    }));
    return success(res, enriched);
  } catch (err) {
    return error(res, err.message || 'Gagal mengambil ujian', 500);
  }
};

module.exports = {
  getSchoolProfile,
  updateSchoolProfile,
  getTeacherProfile,
  updateTeacherProfile,
  listStudents,
  createStudent,
  importStudents,
  updateStudent,
  deleteStudent,
  listSubjects,
  listClasses,
  listQuestionBanks,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importAIQuestions,
  importQuestions,
  uploadQuestionImage,
  previewQuestion,
  listQuestionPackages,
  generateQuestions,
  createExam,
  listExams,
};

