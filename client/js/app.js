const pages = {
  login: document.getElementById('page-login'),
  register: document.getElementById('page-register'),
  forgot: document.getElementById('page-forgot'),
  dashboard: document.getElementById('page-dashboard'),
};
const navMenu = document.getElementById('navMenu');
const welcomeText = document.getElementById('welcomeText');
const logoutButton = document.getElementById('logoutButton');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');

const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const forgotMessage = document.getElementById('forgotMessage');
const dashboardContent = document.getElementById('dashboardContent');
const dashboardTitle = document.getElementById('dashboardTitle');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');

const showPage = (page) => {
  Object.values(pages).forEach((section) => section.classList.remove('page-active'));
  pages[page].classList.add('page-active');
  logoutButton.style.display = page === 'dashboard' ? 'inline-flex' : 'none';
  document.querySelector('.sidebar').style.display = page === 'dashboard' ? 'block' : 'none';
};

const getToken = () => localStorage.getItem('sipendikan_access_token');
const getRefreshToken = () => localStorage.getItem('sipendikan_refresh_token');
const getUser = () => JSON.parse(localStorage.getItem('sipendikan_user') || 'null');
const setSession = (accessToken, refreshToken, user) => {
  localStorage.setItem('sipendikan_access_token', accessToken);
  localStorage.setItem('sipendikan_refresh_token', refreshToken);
  localStorage.setItem('sipendikan_user', JSON.stringify(user));
};
const clearSession = () => {
  localStorage.removeItem('sipendikan_access_token');
  localStorage.removeItem('sipendikan_refresh_token');
  localStorage.removeItem('sipendikan_user');
};

const parseJson = async (response) => {
  if (response.status === 204 || response.status === 304) {
    return {};
  }
  try {
    return await response.json();
  } catch (error) {
    return { success: false, message: 'Invalid server response' };
  }
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const result = await parseJson(response);
  if (!response.ok || !result.success) {
    return false;
  }
  const user = getUser();
  setSession(result.data.accessToken, result.data.refreshToken, user);
  return true;
};

const fetchApi = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const { _retry, ...fetchOptions } = options;
  const response = await fetch(path, { cache: 'no-store', ...fetchOptions, headers });
  const result = await parseJson(response);

  if (response.status === 401 && !_retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchApi(path, { ...options, _retry: true });
    }
    clearSession();
    showPage('login');
    return { success: false, message: 'Session expired. Silakan login kembali.' };
  }

  if (!response.ok && result.success === undefined) {
    result.success = false;
  }
  return result;
};

const showMessage = (element, text, success = true) => {
  if (!element) return;
  element.textContent = text;
  element.style.color = success ? 'var(--primary-dark)' : '#c0392b';
};

const setFormBusy = (form, busy) => {
  if (!form) return;
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  if (!submit.dataset.originalText) submit.dataset.originalText = submit.textContent;
  submit.disabled = busy;
  submit.textContent = busy ? 'Sedang memproses...' : submit.dataset.originalText;
};

const updateUserFormFields = (form) => {
  if (!form) return;
  const role = form.role?.value;
  const nisnField = form.querySelector('.user-nisn-field');
  const classField = form.querySelector('.user-class-field');
  const schoolSelect = form.querySelector('[name="school_id"]');
  const nisnInput = form.querySelector('[name="nisn"]');
  const classSelect = form.querySelector('[name="class_id"]');
  if (nisnField) nisnField.style.display = role === 'siswa' ? 'block' : 'none';
  if (classField) classField.style.display = role === 'siswa' ? 'block' : 'none';
  if (schoolSelect) schoolSelect.required = role === 'guru' || role === 'siswa';
  if (nisnInput) nisnInput.required = role === 'siswa';
  if (classSelect) classSelect.required = role === 'siswa';
};

const formatApiKeyMask = (key) => {
  if (!key) return '-';
  return key.length > 8 ? `${key.slice(0, 8)}...` : key;
};

const examDraftKey = (examId) => `sipendikan_exam_draft_${examId}`;
const saveExamDraft = (examId, answers) => {
  localStorage.setItem(examDraftKey(examId), JSON.stringify(answers));
};
const loadExamDraft = (examId) => {
  const data = localStorage.getItem(examDraftKey(examId));
  return data ? JSON.parse(data) : {};
};
const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const shuffleArray = (array) => {
  if (!Array.isArray(array)) return array;
  return array.slice().sort(() => Math.random() - 0.5);
};

const navItem = (text, action) => `<button type="button" class="btn btn-secondary" data-action="${action}">${text}</button>`;
window.handleNav = async (action) => {
  if (!getUser() || !getToken()) {
    showPage('login');
    return;
  }
  switch (action) {
    case 'adminSummary': return loadAdminDashboard();
    case 'adminSchools': return loadAdminSchools();
    case 'adminUsers': return loadAdminUsers();
    case 'adminTeachers': return loadAdminUsers('guru');
    case 'adminStudents': return loadAdminUsers('siswa');
    case 'adminSubjects': return loadAdminSubjects();
    case 'adminClasses': return loadAdminClasses();
    case 'adminApiKeys': return loadAdminApiKeys();
    case 'guruSchool': return loadTeacherSchool();
    case 'guruProfile': return loadTeacherProfile();
    case 'guruStudents': return loadTeacherStudents();
    case 'guruBank': return loadQuestionBank();
    case 'guruExam': return loadTeacherExams();
    case 'guruAI': return loadTeacherAI();
    case 'guruMaterial': return loadTeacherMaterial();
    case 'guruResults': return loadTeacherScoreRecap();
    case 'siswaDashboard': return loadStudentDashboard();
    case 'siswaProfile': return loadStudentProfile();
    case 'siswaModules': return loadStudentModules();
    case 'siswaAssignments': return loadStudentAssignments();
    case 'siswaExams': return loadStudentExams();
    case 'siswaResults': return loadStudentResults();
    default: return loadDashboard();
  }
};

navMenu.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  event.preventDefault();
  window.handleNav(button.dataset.action);
});

document.body.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  event.preventDefault();

  switch (action) {
    case 'editSchool': return window.editSchool(id);
    case 'deleteSchool': return window.deleteSchool(id);
    case 'editUser': return window.editUser(id, el.dataset.filter || '');
    case 'deleteUser': return window.deleteUser(id, el.dataset.filter || '');
    case 'editSubject': return window.editSubject(id);
    case 'deleteSubject': return window.deleteSubject(id);
    case 'editClass': return window.editClass(id);
    case 'deleteClass': return window.deleteClass(id);
    case 'editApiKey': return window.editApiKey(id);
    case 'toggleApiKey': return window.toggleApiKey(id);
    case 'previewQuestion': return window.previewQuestion(id);
    case 'editQuestion': return window.editQuestionModal(id);
    case 'deleteQuestion': return window.deleteQuestion(id);
    case 'downloadQuestionTemplate': return window.downloadQuestionTemplate();
    case 'importQuestion': return document.getElementById('importQuestionFile')?.click();
    case 'printQuestions': return window.printQuestions();
    case 'printScoreRecap': return window.printScoreRecap();
    case 'saveExamResultScore': return window.saveExamResultScore(id);
    case 'openExamToken': return window.openExamByToken(el.dataset.token);
    case 'copyExamToken': return window.copyExamToken(el.dataset.token);
    case 'closeModal': return el.closest('.modal-overlay')?.remove();
    case 'viewExamDetails': return window.viewExamDetails(id);
    default: return null;
  }
});

const renderDashboardMenu = (role) => {
  const user = getUser();
  const userLabel = user?.name || user?.username || user?.email || 'Pengguna';
  welcomeText.textContent = `Hi, ${userLabel} — role: ${role}`;
  const items = [];
  if (role === 'admin') {
    dashboardTitle.textContent = 'Dashboard Admin';
    dashboardSubtitle.textContent = 'Kelola sekolah, akun, mata pelajaran, kelas, dan API key.';
    items.push(navItem('Ringkasan', 'adminSummary'));
    items.push(navItem('Sekolah', 'adminSchools'));
    items.push(navItem('Akun Semua', 'adminUsers'));
    items.push(navItem('Akun Guru', 'adminTeachers'));
    items.push(navItem('Akun Siswa', 'adminStudents'));
    items.push(navItem('Mata Pelajaran', 'adminSubjects'));
    items.push(navItem('Kelas', 'adminClasses'));
    items.push(navItem('API Key', 'adminApiKeys'));
  }
  if (role === 'guru') {
    dashboardTitle.textContent = 'Dashboard Guru';
    dashboardSubtitle.textContent = 'Kelola sekolah, profil, siswa, bank soal, ujian, dan AI.';
    items.push(navItem('Identitas Sekolah', 'guruSchool'));
    items.push(navItem('Profil Guru', 'guruProfile'));
    items.push(navItem('Data Siswa', 'guruStudents'));
    items.push(navItem('Rekap Nilai', 'guruResults'));
    items.push(navItem('Bank Soal', 'guruBank'));
    items.push(navItem('Ruang Ujian', 'guruExam'));
    items.push(navItem('AI Generator', 'guruAI'));
    items.push(navItem('Upload Materi', 'guruMaterial'));
  }
  if (role === 'siswa') {
    dashboardTitle.textContent = 'Dashboard Siswa';
    dashboardSubtitle.textContent = 'Akses modul, ujian, dan tugas.';
    items.push(navItem('Ringkasan', 'siswaDashboard'));
    items.push(navItem('Profil Saya', 'siswaProfile'));
    items.push(navItem('Modul Pelajaran', 'siswaModules'));
    items.push(navItem('Kumpulkan Tugas', 'siswaAssignments'));
    items.push(navItem('Ujian', 'siswaExams'));
    items.push(navItem('Hasil Ujian', 'siswaResults'));
  }
  navMenu.innerHTML = items.join('');
};

const loadAdminDashboard = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Ringkasan Admin</h3><div>Memuat statistik...</div></div>';
  const [schoolsRes, usersRes, subjectsRes, classesRes] = await Promise.all([
    fetchApi('/api/admin/schools'),
    fetchApi('/api/admin/users'),
    fetchApi('/api/admin/subjects'),
    fetchApi('/api/admin/classes'),
  ]);

  if (!schoolsRes.success || !usersRes.success || !subjectsRes.success || !classesRes.success) {
    const message = schoolsRes.message || usersRes.message || subjectsRes.message || classesRes.message || 'Gagal memuat statistik admin';
    return dashboardContent.innerHTML = `<p>${message}</p>`;
  }

  const guruCount = usersRes.data.filter((user) => user.role === 'guru').length;
  const siswaCount = usersRes.data.filter((user) => user.role === 'siswa').length;
  const schoolCount = schoolsRes.data.length;
  const subjectCount = subjectsRes.data.length;
  const classCount = classesRes.data.length;

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Ringkasan Admin</h3>
      <div class="stats-grid">
        <div class="stat-card"><h4>Sekolah</h4><p>${schoolCount}</p></div>
        <div class="stat-card"><h4>Guru</h4><p>${guruCount}</p></div>
        <div class="stat-card"><h4>Siswa</h4><p>${siswaCount}</p></div>
        <div class="stat-card"><h4>Kelas</h4><p>${classCount}</p></div>
        <div class="stat-card"><h4>Mapel</h4><p>${subjectCount}</p></div>
      </div>
    </div>`;
};

const loadDashboard = async () => {
  const user = getUser();
  if (!user || !getToken()) {
    showPage('login');
    return;
  }
  showPage('dashboard');
  renderDashboardMenu(user.role);
  if (user.role === 'admin') return loadAdminDashboard();
  if (user.role === 'guru') return loadTeacherSchool();
  if (user.role === 'siswa') return loadStudentDashboard();
};

const loadAdminSchools = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Daftar Sekolah</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/admin/schools');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  window.adminSchools = result.data || [];
  const rows = window.adminSchools.map((school) => `
    <tr>
      <td>${school.school_name}</td>
      <td>${school.npsn}</td>
      <td>${school.principal_name || '-'}</td>
      <td>${school.phone || '-'}</td>
      <td>
        <button type="button" class="btn btn-secondary" data-action="editSchool" data-id="${school.id}">Edit</button>
        <button type="button" class="btn btn-secondary" data-action="deleteSchool" data-id="${school.id}">Hapus</button>
      </td>
    </tr>
  `).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Daftar Sekolah</h3>
      <form id="schoolCreateForm" class="simple-form" data-edit-id="">
        <label>Nama Sekolah</label>
        <input name="school_name" required>
        <label>NPSN</label>
        <input name="npsn" required>
        <label>Nama Kepala Sekolah</label>
        <input name="principal_name">
        <label>Telp</label>
        <input name="phone">
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah Sekolah</button>
          <button type="button" class="btn btn-secondary" id="schoolCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
        </div>
        <div class="message" id="schoolCreateMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Sekolah</th><th>NPSN</th><th>Kepala</th><th>Telp</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  const form = document.getElementById('schoolCreateForm');
  const messageEl = document.getElementById('schoolCreateMessage');
  document.getElementById('schoolCancelEdit').addEventListener('click', window.cancelSchoolEdit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = {
      school_name: form.school_name.value,
      npsn: form.npsn.value,
      principal_name: form.principal_name.value,
      phone: form.phone.value,
    };
    const path = editId ? `/api/admin/schools/${editId}` : '/api/admin/schools';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(messageEl, res.message, res.success);
    if (res.success) {
      window.cancelSchoolEdit();
      loadAdminSchools();
    }
  });
};

window.editSchool = (id) => {
  const school = (window.adminSchools || []).find((item) => item.id === id);
  if (!school) return;
  const form = document.getElementById('schoolCreateForm');
  if (!form) return;
  form.dataset.editId = id;
  form.school_name.value = school.school_name || '';
  form.npsn.value = school.npsn || '';
  form.principal_name.value = school.principal_name || '';
  form.phone.value = school.phone || '';
  form.querySelector('button[type="submit"]').textContent = 'Update Sekolah';
  document.getElementById('schoolCancelEdit').style.display = 'inline-flex';
};

window.cancelSchoolEdit = () => {
  const form = document.getElementById('schoolCreateForm');
  if (!form) return;
  form.reset();
  form.dataset.editId = '';
  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.dataset.originalText) submit.textContent = submit.dataset.originalText;
  document.getElementById('schoolCancelEdit').style.display = 'none';
};

window.deleteSchool = async (id) => {
  if (!confirm('Hapus sekolah ini?')) return;
  const res = await fetchApi(`/api/admin/schools/${id}`, { method: 'DELETE' });
  if (!res.success) {
    alert(res.message || 'Gagal menghapus sekolah');
    return;
  }
  loadAdminSchools();
};

const loadAdminUsers = async (roleFilter = null) => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Daftar Akun</h3><div>Memuat...</div></div>';
  const [result, schoolResult, classResult] = await Promise.all([
    fetchApi('/api/admin/users'),
    fetchApi('/api/admin/schools'),
    fetchApi('/api/admin/classes'),
  ]);
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;

  const schools = schoolResult.success ? schoolResult.data : [];
  const classes = classResult.success ? classResult.data : [];
  const schoolMap = new Map((schools || []).map((school) => [school.id, school.school_name]));
  const classMap = new Map((classes || []).map((item) => [item.id, item.class_name]));

  const filtered = roleFilter ? result.data.filter((user) => user.role === roleFilter) : result.data;
  window.adminUserCache = {};
  filtered.forEach((user) => {
    window.adminUserCache[user.id] = user;
  });

  const roleOptions = `
    <option value="admin">Admin</option>
    <option value="guru">Guru</option>
    <option value="siswa">Siswa</option>
  `;

  const rows = filtered.map((user) => `
    <tr>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${schoolMap.get(user.school_id) || user.school_id || '-'}</td>
      <td>${user.nisn || '-'}</td>
      <td>${classMap.get(user.class_id) || '-'}</td>
      <td>
        <button type="button" class="btn btn-secondary" data-action="editUser" data-id="${user.id}" data-filter="${roleFilter || ''}">Edit</button>
        <button type="button" class="btn btn-secondary" data-action="deleteUser" data-id="${user.id}" data-filter="${roleFilter || ''}">Hapus</button>
      </td>
    </tr>
  `).join('');

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Daftar Akun ${roleFilter ? roleFilter.toUpperCase() : ''}</h3>
      <form id="userCreateForm" class="simple-form" data-edit-id="" data-role-filter="${roleFilter || ''}">
        <label>Username</label>
        <input name="username" required>
        <label>Email</label>
        <input type="email" name="email" required>
        <label>Password</label>
        <input type="password" name="password">
        <label>Role</label>
        <select name="role" required>${roleOptions}</select>
        <label>Sekolah</label>
        <select name="school_id">
          <option value="">Pilih Sekolah</option>
          ${schools.map((school) => `<option value="${school.id}">${school.school_name}</option>`).join('')}
        </select>
        <div class="user-nisn-field" style="display:none;">
          <label>NISN</label>
          <input name="nisn" placeholder="NISN unik untuk siswa">
        </div>
        <div class="user-class-field" style="display:none;">
          <label>Kelas</label>
          <select name="class_id">
            <option value="">Pilih Kelas</option>
            ${classes.map((item) => `<option value="${item.id}">${item.class_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah Akun</button>
          <button type="button" class="btn btn-secondary" id="userCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
        </div>
        <div class="message" id="userCreateMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Sekolah</th><th>NISN</th><th>Kelas</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  const form = document.getElementById('userCreateForm');
  const messageEl = document.getElementById('userCreateMessage');
  const roleField = form.querySelector('[name="role"]');
  const roleFilterInput = form.dataset.roleFilter || '';
  if (roleFilterInput && roleField) {
    roleField.value = roleFilterInput;
  }
  roleField.addEventListener('change', () => updateUserFormFields(form));
  updateUserFormFields(form);
  document.getElementById('userCancelEdit').addEventListener('click', window.cancelUserEdit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = {
      username: form.username.value,
      email: form.email.value,
      role: form.role.value,
      school_id: form.school_id.value || null,
      nisn: form.nisn.value || null,
      class_id: form.class_id.value || null,
    };
    if (!editId && !form.password.value) {
      showMessage(messageEl, 'Password wajib diisi untuk akun baru', false);
      return;
    }
    if (form.password.value) {
      body.password = form.password.value;
    }
    if (!body.nisn) delete body.nisn;
    if (!body.class_id) delete body.class_id;
    const path = editId ? `/api/admin/users/${editId}` : '/api/admin/users';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(messageEl, res.message, res.success);
    if (res.success) {
      window.cancelUserEdit();
      loadAdminUsers(roleFilter);
    }
  });
};

window.editUser = (id, roleFilter = null) => {
  const user = (window.adminUserCache || {})[id];
  if (!user) return;
  const form = document.getElementById('userCreateForm');
  if (!form) return;
  form.dataset.editId = id;
  form.username.value = user.username || '';
  form.email.value = user.email || '';
  form.password.value = '';
  form.role.value = user.role || 'admin';
  form.school_id.value = user.school_id || '';
  form.nisn.value = user.nisn || '';
  form.class_id.value = user.class_id || '';
  updateUserFormFields(form);
  form.querySelector('button[type="submit"]').textContent = 'Update Akun';
  document.getElementById('userCancelEdit').style.display = 'inline-flex';
};

window.cancelUserEdit = () => {
  const form = document.getElementById('userCreateForm');
  if (!form) return;
  form.reset();
  form.dataset.editId = '';
  const roleFilter = form.dataset.roleFilter || '';
  if (roleFilter) {
    const roleField = form.querySelector('[name="role"]');
    if (roleField) roleField.value = roleFilter;
  }
  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.dataset.originalText) submit.textContent = submit.dataset.originalText;
  document.getElementById('userCancelEdit').style.display = 'none';
  updateUserFormFields(form);
};

window.deleteUser = async (id, roleFilter = null) => {
  if (!confirm('Hapus akun ini?')) return;
  const res = await fetchApi(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (!res.success) {
    alert(res.message || 'Gagal menghapus akun');
    return;
  }
  loadAdminUsers(roleFilter || null);
};

const loadAdminSubjects = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Daftar Mata Pelajaran</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/admin/subjects');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  window.adminSubjectCache = {};
  const rows = result.data.map((item) => {
    window.adminSubjectCache[item.id] = item;
    return `
      <tr>
        <td>${item.subject_name}</td>
        <td>
          <button type="button" class="btn btn-secondary" data-action="editSubject" data-id="${item.id}">Edit</button>
          <button type="button" class="btn btn-secondary" data-action="deleteSubject" data-id="${item.id}">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Daftar Mata Pelajaran</h3>
      <form id="subjectCreateForm" class="simple-form" data-edit-id="">
        <label>Nama Mata Pelajaran</label>
        <input name="subject_name" required>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah Mapel</button>
          <button type="button" class="btn btn-secondary" id="subjectCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
        </div>
        <div class="message" id="subjectCreateMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Mapel</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  const form = document.getElementById('subjectCreateForm');
  const messageEl = document.getElementById('subjectCreateMessage');
  document.getElementById('subjectCancelEdit').addEventListener('click', window.cancelSubjectEdit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = { subject_name: form.subject_name.value };
    const path = editId ? `/api/admin/subjects/${editId}` : '/api/admin/subjects';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(messageEl, res.message, res.success);
    if (res.success) {
      window.cancelSubjectEdit();
      loadAdminSubjects();
    }
  });
};

window.editSubject = (id) => {
  const item = (window.adminSubjectCache || {})[id];
  if (!item) return;
  const form = document.getElementById('subjectCreateForm');
  if (!form) return;
  form.dataset.editId = id;
  form.subject_name.value = item.subject_name || '';
  form.querySelector('button[type="submit"]').textContent = 'Update Mapel';
  document.getElementById('subjectCancelEdit').style.display = 'inline-flex';
};

window.cancelSubjectEdit = () => {
  const form = document.getElementById('subjectCreateForm');
  if (!form) return;
  form.reset();
  form.dataset.editId = '';
  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.dataset.originalText) submit.textContent = submit.dataset.originalText;
  document.getElementById('subjectCancelEdit').style.display = 'none';
};

window.deleteSubject = async (id) => {
  if (!confirm('Hapus mata pelajaran ini?')) return;
  const res = await fetchApi(`/api/admin/subjects/${id}`, { method: 'DELETE' });
  if (!res.success) {
    alert(res.message || 'Gagal menghapus mata pelajaran');
    return;
  }
  loadAdminSubjects();
};

const loadAdminClasses = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Daftar Kelas</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/admin/classes');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  window.adminClassCache = {};
  const rows = result.data.map((item) => {
    window.adminClassCache[item.id] = item;
    return `
      <tr>
        <td>${item.class_name}</td>
        <td>
          <button type="button" class="btn btn-secondary" data-action="editClass" data-id="${item.id}">Edit</button>
          <button type="button" class="btn btn-secondary" data-action="deleteClass" data-id="${item.id}">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Daftar Kelas</h3>
      <form id="classCreateForm" class="simple-form" data-edit-id="">
        <label>Nama Kelas</label>
        <input name="class_name" required>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah Kelas</button>
          <button type="button" class="btn btn-secondary" id="classCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
        </div>
        <div class="message" id="classCreateMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Kelas</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  const form = document.getElementById('classCreateForm');
  const messageEl = document.getElementById('classCreateMessage');
  document.getElementById('classCancelEdit').addEventListener('click', window.cancelClassEdit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = { class_name: form.class_name.value };
    const path = editId ? `/api/admin/classes/${editId}` : '/api/admin/classes';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(messageEl, res.message, res.success);
    if (res.success) {
      window.cancelClassEdit();
      loadAdminClasses();
    }
  });
};

window.editClass = (id) => {
  const item = (window.adminClassCache || {})[id];
  if (!item) return;
  const form = document.getElementById('classCreateForm');
  if (!form) return;
  form.dataset.editId = id;
  form.class_name.value = item.class_name || '';
  form.querySelector('button[type="submit"]').textContent = 'Update Kelas';
  document.getElementById('classCancelEdit').style.display = 'inline-flex';
};

window.cancelClassEdit = () => {
  const form = document.getElementById('classCreateForm');
  if (!form) return;
  form.reset();
  form.dataset.editId = '';
  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.dataset.originalText) submit.textContent = submit.dataset.originalText;
  document.getElementById('classCancelEdit').style.display = 'none';
};

window.deleteClass = async (id) => {
  if (!confirm('Hapus kelas ini?')) return;
  const res = await fetchApi(`/api/admin/classes/${id}`, { method: 'DELETE' });
  if (!res.success) {
    alert(res.message || 'Gagal menghapus kelas');
    return;
  }
  loadAdminClasses();
};

const loadAdminApiKeys = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Daftar API Key</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/admin/api-keys');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  window.adminApiKeyCache = {};
  const rows = result.data.map((item) => {
    window.adminApiKeyCache[item.id] = item;
    return `
      <tr>
        <td>${item.name}</td>
        <td>${formatApiKeyMask(item.api_key)}</td>
        <td>${item.active ? 'Ya' : 'Tidak'}</td>
        <td>
          <button type="button" class="btn btn-secondary" data-action="editApiKey" data-id="${item.id}">Edit</button>
          <button type="button" class="btn btn-secondary" data-action="toggleApiKey" data-id="${item.id}">Toggle</button>
        </td>
      </tr>
    `;
  }).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Daftar API Key</h3>
      <form id="apiKeyCreateForm" class="simple-form" data-edit-id="">
        <label>Nama API</label>
        <input name="name" required>
        <label>API Key</label>
        <input name="api_key" required>
        <label>Aktif</label>
        <select name="active"><option value="true">Ya</option><option value="false">Tidak</option></select>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah API Key</button>
          <button type="button" class="btn btn-secondary" id="apiKeyCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
        </div>
        <div class="message" id="apiKeyCreateMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Nama</th><th>Key</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  const form = document.getElementById('apiKeyCreateForm');
  const messageEl = document.getElementById('apiKeyCreateMessage');
  document.getElementById('apiKeyCancelEdit').addEventListener('click', window.cancelApiKeyEdit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = {
      name: form.name.value,
      api_key: form.api_key.value,
      active: form.active.value === 'true',
    };
    const path = editId ? `/api/admin/api-keys/${editId}` : '/api/admin/api-keys';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(messageEl, res.message, res.success);
    if (res.success) {
      window.cancelApiKeyEdit();
      loadAdminApiKeys();
    }
  });
};

window.editApiKey = (id) => {
  const item = (window.adminApiKeyCache || {})[id];
  if (!item) return;
  const form = document.getElementById('apiKeyCreateForm');
  if (!form) return;
  form.dataset.editId = id;
  form.name.value = item.name || '';
  form.api_key.value = item.api_key || '';
  form.active.value = item.active ? 'true' : 'false';
  form.querySelector('button[type="submit"]').textContent = 'Update API Key';
  document.getElementById('apiKeyCancelEdit').style.display = 'inline-flex';
};

window.cancelApiKeyEdit = () => {
  const form = document.getElementById('apiKeyCreateForm');
  if (!form) return;
  form.reset();
  form.dataset.editId = '';
  const submit = form.querySelector('button[type="submit"]');
  if (submit && submit.dataset.originalText) submit.textContent = submit.dataset.originalText;
  document.getElementById('apiKeyCancelEdit').style.display = 'none';
};

window.toggleApiKey = async (id) => {
  const res = await fetchApi(`/api/admin/api-keys/${id}/toggle`, { method: 'PATCH' });
  if (!res.success) {
    alert(res.message || 'Gagal mengubah status API key');
    return;
  }
  loadAdminApiKeys();
};

const loadTeacherSchool = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Identitas Sekolah</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/teacher/school');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  const school = result.data;
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Identitas Sekolah</h3>
      <form id="schoolProfileForm" class="simple-form">
        <label>Nama Sekolah</label>
        <input name="school_name" value="${school.school_name || ''}" required>
        <label>NPSN</label>
        <input name="npsn" value="${school.npsn || ''}" readonly>
        <label>Nama Kepala Sekolah</label>
        <input name="principal_name" value="${school.principal_name || ''}">
        <label>NIP Kepala Sekolah</label>
        <input name="principal_nip" value="${school.principal_nip || ''}">
        <label>Alamat Sekolah</label>
        <input name="address" value="${school.address || ''}">
        <label>No Telp / WA</label>
        <input name="phone" value="${school.phone || ''}">
        <button class="btn btn-primary" type="submit">Simpan Identitas</button>
        <div class="message" id="schoolProfileMessage"></div>
      </form>
    </div>`;
  document.getElementById('schoolProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = {
      school_name: form.get('school_name'),
      principal_name: form.get('principal_name'),
      principal_nip: form.get('principal_nip'),
      address: form.get('address'),
      phone: form.get('phone'),
    };
    const res = await fetchApi('/api/teacher/school', { method: 'PUT', body: JSON.stringify(body) });
    showMessage(document.getElementById('schoolProfileMessage'), res.message, res.success);
  });
};

const loadTeacherProfile = async () => {
  const result = await fetchApi('/api/teacher/profile');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  const profile = result.data;
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Identitas Guru</h3>
      <form id="teacherProfileForm" class="simple-form">
        <label>Nama Guru</label>
        <input name="teacher_name" value="${profile.teacher_name || ''}" required>
        <label>NIP Guru</label>
        <input name="teacher_nip" value="${profile.teacher_nip || ''}">
        <label>Email</label>
        <input value="${profile.email || ''}" readonly>
        <label>Username</label>
        <input value="${profile.username || ''}" readonly>
        <button class="btn btn-primary" type="submit">Simpan Profil</button>
        <div class="message" id="teacherProfileMessage"></div>
      </form>
    </div>`;
  document.getElementById('teacherProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = {
      teacher_name: form.get('teacher_name'),
      teacher_nip: form.get('teacher_nip'),
    };
    const res = await fetchApi('/api/teacher/profile', { method: 'PUT', body: JSON.stringify(body) });
    showMessage(document.getElementById('teacherProfileMessage'), res.message, res.success);
  });
};

const loadTeacherStudents = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Data Siswa</h3><div>Memuat...</div></div>';
  const [result, classesRes] = await Promise.all([
    fetchApi('/api/teacher/students'),
    fetchApi('/api/teacher/classes'),
  ]);
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  const classes = classesRes.success ? classesRes.data : [];
  window.teacherClassMap = {};
  classes.forEach((cls) => {
    window.teacherClassMap[cls.id] = cls.class_name;
  });
  window.teacherStudentCache = {};
  result.data.forEach((student) => {
    window.teacherStudentCache[student.id] = student;
  });
  const rows = result.data.map((student) => `
    <tr>
      <td>${student.student_name}</td>
      <td>${student.nisn}</td>
      <td>${window.teacherClassMap[student.class_id] || student.class_id || '-'}</td>
      <td>
        <button type="button" class="btn btn-secondary edit-student-btn" data-id="${student.id}">Edit</button>
        <button type="button" class="btn btn-secondary delete-student-btn" data-id="${student.id}">Hapus</button>
      </td>
    </tr>
  `).join('');
  const classOptions = classes.map((c) => `<option value="${c.id}">${c.class_name}</option>`).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Data Siswa</h3>
      <form id="studentForm" class="simple-form" data-edit-id="">
        <label>Nama Siswa</label>
        <input name="student_name" required>
        <label>NISN</label>
        <input name="nisn" required>
        <label>Password (opsional, minimal 6 karakter)</label>
        <input name="password" type="password" placeholder="Biarkan kosong untuk gunakan NISN atau acak">
        <label>Kelas</label>
        <select name="class_id">
          <option value="">Pilih Kelas (opsional)</option>
          ${classOptions}
        </select>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Tambah Siswa</button>
          <button type="button" class="btn btn-secondary" id="studentCancelEdit" style="display:none;margin-left:.5rem">Batal</button>
          <button type="button" class="btn btn-secondary" id="downloadStudentTemplateButton" style="margin-left:.5rem">Download Template</button>
          <button type="button" class="btn btn-secondary" id="importStudentButton" style="margin-left:.5rem">Import Siswa</button>
        </div>
        <input type="file" id="importStudentFile" accept=".csv" style="display:none;">
        <div class="message" id="studentMessage"></div>
      </form>
      <table class="table" id="teacherStudentTable"><thead><tr><th>Nama</th><th>NISN</th><th>Kelas</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  const form = document.getElementById('studentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const body = {
      student_name: form.student_name.value,
      nisn: form.nisn.value,
      password: form.password.value || undefined,
      class_id: form.class_id.value || null,
    };
    const path = editId ? `/api/teacher/students/${editId}` : '/api/teacher/students';
    const method = editId ? 'PUT' : 'POST';
    setFormBusy(form, true);
    const res = await fetchApi(path, { method, body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(document.getElementById('studentMessage'), res.message, res.success);
    if (res.success) {
      window.cancelTeacherStudentEdit();
      loadTeacherStudents();
    }
  });
  const studentTable = document.getElementById('teacherStudentTable');
  studentTable?.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const studentId = button.dataset.id;
    if (!studentId) return;
    if (button.classList.contains('edit-student-btn')) {
      window.editTeacherStudent(studentId);
      return;
    }
    if (button.classList.contains('delete-student-btn')) {
      if (!confirm('Hapus siswa ini?')) return;
      const res = await fetchApi(`/api/teacher/students/${studentId}`, { method: 'DELETE' });
      showMessage(document.getElementById('studentMessage'), res.message, res.success);
      if (res.success) loadTeacherStudents();
    }
  });
  document.getElementById('downloadStudentTemplateButton').addEventListener('click', () => {
    window.downloadStudentTemplate();
  });
  document.getElementById('importStudentButton').addEventListener('click', () => {
    document.getElementById('importStudentFile').click();
  });
  document.getElementById('importStudentFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    const result = await fetchApi('/api/teacher/students/import', { method: 'POST', body: data });
    showMessage(document.getElementById('studentMessage'), result.message, result.success);
    if (result.success) {
      e.target.value = '';
      loadTeacherStudents();
    }
  });
  document.getElementById('studentCancelEdit').addEventListener('click', window.cancelTeacherStudentEdit);
};

window.editTeacherStudent = (id) => {
  const student = (window.teacherStudentCache || {})[id];
  if (!student) return;
  const form = document.getElementById('studentForm');
  form.dataset.editId = id;
  form.student_name.value = student.student_name || '';
  form.nisn.value = student.nisn || '';
  form.class_id.value = student.class_id || '';
  form.querySelector('button[type="submit"]').textContent = 'Update Siswa';
  document.getElementById('studentCancelEdit').style.display = 'inline-flex';
};

window.cancelTeacherStudentEdit = () => {
  const form = document.getElementById('studentForm');
  form.reset();
  form.dataset.editId = '';
  form.querySelector('button[type="submit"]').textContent = 'Tambah Siswa';
  document.getElementById('studentCancelEdit').style.display = 'none';
};

const loadTeacherScoreRecap = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Rekap Nilai Siswa</h3><div>Memuat...</div></div>';
  const [resultRes, classesRes] = await Promise.all([
    fetchApi('/api/teacher/results'),
    fetchApi('/api/teacher/classes'),
  ]);

  if (!resultRes.success) return dashboardContent.innerHTML = `<p>${resultRes.message}</p>`;

  const classMap = (classesRes.success ? classesRes.data : []).reduce((map, cls) => {
    map[cls.id] = cls.class_name;
    return map;
  }, {});

  const rows = (resultRes.data || []).map((result) => {
    const student = result.students || {};
    const exam = result.exams || {};
    const scoreValue = result.score != null ? result.score : '';
    const className = classMap[student.class_id] || classMap[exam.class_id] || student.class_id || exam.class_id || '-';
    const submittedAt = result.submitted_at ? new Date(result.submitted_at).toLocaleString('id-ID') : '-';
    return `
      <tr data-result-row="${result.id}">
        <td>${student.student_name || '-'}</td>
        <td>${student.nisn || '-'}</td>
        <td>${className}</td>
        <td>${exam.title || '-'}</td>
        <td>
          <input type="number" min="0" step="1" class="score-input" data-score-id="${result.id}" value="${scoreValue}" style="width: 5rem;">
        </td>
        <td>${submittedAt}</td>
        <td>
          <button type="button" class="btn btn-primary btn-sm" data-action="saveExamResultScore" data-id="${result.id}">Simpan</button>
          <span class="result-save-message" style="margin-left:.5rem"></span>
        </td>
      </tr>`;
  }).join('');

  dashboardContent.innerHTML = `
    <div class="panel printable" id="scoreRecapTablePanel">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <h3>Rekap Nilai Siswa</h3>
        <button type="button" class="btn btn-secondary" data-action="printScoreRecap">Cetak Rekap</button>
      </div>
      <table class="table" style="margin-top:1rem;">
        <thead>
          <tr>
            <th>Nama Siswa</th>
            <th>NISN</th>
            <th>Kelas</th>
            <th>Ujian</th>
            <th>Nilai</th>
            <th>Tanggal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7">Belum ada hasil ujian.</td></tr>'}</tbody>
      </table>
      <div class="message" id="scoreRecapMessage"></div>
    </div>`;
};

window.saveExamResultScore = async (id) => {
  const row = document.querySelector(`[data-result-row="${id}"]`);
  if (!row) return;
  const input = row.querySelector('.score-input');
  const messageEl = row.querySelector('.result-save-message');
  if (!input) return;

  const rawValue = input.value.trim();
  if (rawValue === '') {
    showMessage(messageEl, 'Isi nilai terlebih dahulu', false);
    return;
  }

  const score = Number(rawValue);
  if (Number.isNaN(score) || score < 0) {
    showMessage(messageEl, 'Nilai tidak valid', false);
    return;
  }

  const button = row.querySelector('[data-action="saveExamResultScore"]');
  if (button) {
    button.disabled = true;
    button.textContent = 'Menyimpan...';
  }

  const res = await fetchApi(`/api/teacher/results/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ score }),
  });

  if (button) {
    button.disabled = false;
    button.textContent = 'Simpan';
  }

  if (!res.success) {
    showMessage(messageEl, res.message || 'Gagal menyimpan nilai', false);
    return;
  }

  showMessage(messageEl, res.message || 'Nilai tersimpan', true);
  setTimeout(() => {
    loadTeacherScoreRecap();
  }, 600);
};

window.printTable = (selector) => {
  const container = document.querySelector(selector);
  if (!container) return;
  const style = document.createElement('style');
  style.id = 'printable-table-style';
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      ${selector}, ${selector} * { visibility: visible !important; }
      ${selector} { position: absolute; left: 0; top: 0; width: 100%; }
    }
  `;
  document.head.appendChild(style);
  window.print();
  document.head.removeChild(style);
};

window.printScoreRecap = () => {
  window.printTable('#scoreRecapTablePanel');
};

window.deleteTeacherStudent = async (id) => {
  if (!confirm('Hapus siswa ini?')) return;
  const res = await fetchApi(`/api/teacher/students/${id}`, { method: 'DELETE' });
  showMessage(document.getElementById('studentMessage'), res.message, res.success);
  if (res.success) loadTeacherStudents();
};

const loadQuestionBank = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Bank Soal</h3><div>Memuat...</div></div>';
  const [bankResult, classesRes, subjectsRes] = await Promise.all([
    fetchApi('/api/teacher/bank'),
    fetchApi('/api/teacher/classes'),
    fetchApi('/api/teacher/subjects'),
  ]);
  if (!bankResult.success) return dashboardContent.innerHTML = `<p>${bankResult.message}</p>`;

  const classOptions = classesRes.success ? classesRes.data.map((c) => `<option value="${c.id}">${c.class_name}</option>`).join('') : '';
  const subjectOptions = subjectsRes.success ? subjectsRes.data.map((s) => `<option value="${s.id}">${s.subject_name}</option>`).join('') : '';

  window.questionCache = {};
  const bankData = bankResult.data || [];
  
  bankData.forEach((item) => {
    window.questionCache[item.id] = item;
  });

  // Group questions by class -> subject -> type
  const grouped = {};
  bankData.forEach((item) => {
    const className = item.classes?.class_name || 'Semua Kelas';
    const subjectName = item.subjects?.subject_name || 'Umum';
    const type = item.question_type || 'pilihan_ganda';
    grouped[className] = grouped[className] || {};
    grouped[className][subjectName] = grouped[className][subjectName] || {};
    grouped[className][subjectName][type] = grouped[className][subjectName][type] || [];
    grouped[className][subjectName][type].push(item);
  });

  const renderQuestionsTable = (questions, type) => {
    if (!questions || !questions.length) return '';
    const typeLabel = {
      'pilihan_ganda': 'Pilihan Ganda (1 Jawaban)',
      'pilihan_ganda_kompleks': 'Pilihan Ganda Kompleks (2 Jawaban)',
      'isian_singkat': 'Isian Singkat',
      'uraian': 'Uraian',
    }[type] || type;

    return `
      <div class="question-group">
        <h4>${typeLabel}</h4>
        <table class="table">
          <thead>
            <tr>
              <th width="50">No</th>
              <th>Soal</th>
              <th width="180">Paket</th>
              <th width="120">Poin</th>
              <th width="180">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${questions.map((q, idx) => `
              <tr data-question-id="${q.id}">
                <td>${idx + 1}</td>
                <td class="question-text-cell" data-action="previewQuestion" data-id="${q.id}" style="cursor:pointer;">${(q.question_text || '').substring(0, 80)}...</td>
                <td>${q.question_packages?.name || q.package_name || '-'}</td>
                <td contenteditable="true" data-id="${q.id}" class="poin-cell">${q.points || 1}</td>
                <td>
                  <button type="button" class="btn btn-secondary" data-action="previewQuestion" data-id="${q.id}" style="font-size:0.85rem;">Lihat</button>
                  <button type="button" class="btn btn-secondary" data-action="editQuestion" data-id="${q.id}" style="font-size:0.85rem;">Edit</button>
                  <button type="button" class="btn btn-secondary" data-action="deleteQuestion" data-id="${q.id}" style="font-size:0.85rem;background:#d9534f;">Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // Build HTML grouped by class and subject
  let allQuestionsHtml = '';
  Object.keys(grouped).forEach((className) => {
    allQuestionsHtml += `<div class="class-group"><h3>${className}</h3>`;
    Object.keys(grouped[className]).forEach((subjectName) => {
      allQuestionsHtml += `<h4 style="margin-left:8px">${subjectName}</h4>`;
      const types = grouped[className][subjectName];
      Object.keys(types).forEach((type) => {
        allQuestionsHtml += renderQuestionsTable(types[type], type);
      });
    });
    allQuestionsHtml += '</div>';
  });

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Bank Soal</h3>
      <form id="filterBankForm" class="simple-form form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <label>Kelas</label>
          <select id="filterClass" name="class_id">
            <option value="">Semua Kelas</option>
            ${classOptions}
          </select>
        </div>
        <div>
          <label>Mata Pelajaran</label>
          <select id="filterSubject" name="subject_id">
            <option value="">Semua Mata Pelajaran</option>
            ${subjectOptions}
          </select>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3>Buat Soal Manual</h3>
      <form id="questionForm" class="simple-form form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="grid-column: 1 / -1;">
          <label>Tipe Soal</label>
          <select id="questionTypeSelect" name="question_type" required>
            <option value="">-- Pilih Tipe Soal --</option>
            <option value="pilihan_ganda">Pilihan Ganda (1 Jawaban Benar)</option>
            <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks (2 Jawaban Benar)</option>
            <option value="isian_singkat">Isian Singkat</option>
            <option value="uraian">Uraian</option>
          </select>
        </div>

        <div style="grid-column: 1 / -1;">
          <label>Teks Soal</label>
          <textarea id="questionText" name="question_text" required placeholder="Ketik teks soal di sini..."></textarea>
        </div>

        <div id="pgOptions" style="display:none; grid-column: 1 / -1;">
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div>
              <label>Jawaban A</label>
              <input type="text" id="optionA" placeholder="Opsi A">
            </div>
            <div>
              <label>Jawaban B</label>
              <input type="text" id="optionB" placeholder="Opsi B">
            </div>
            <div>
              <label>Jawaban C</label>
              <input type="text" id="optionC" placeholder="Opsi C">
            </div>
            <div>
              <label>Jawaban D</label>
              <input type="text" id="optionD" placeholder="Opsi D">
            </div>
          </div>
          <div style="margin-top: 12px;">
            <label>Jawaban Benar</label>
            <select id="correctAnswer">
              <option value="">-- Pilih Jawaban Benar --</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </div>

        <div id="pgkOptions" style="display:none; grid-column: 1 / -1;">
          <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
            <div>
              <label><input type="checkbox" class="pgk-checkbox" data-option="A"> Jawaban A</label>
              <input type="text" class="pgk-input" data-option="A" placeholder="Opsi A">
            </div>
            <div>
              <label><input type="checkbox" class="pgk-checkbox" data-option="B"> Jawaban B</label>
              <input type="text" class="pgk-input" data-option="B" placeholder="Opsi B">
            </div>
            <div>
              <label><input type="checkbox" class="pgk-checkbox" data-option="C"> Jawaban C</label>
              <input type="text" class="pgk-input" data-option="C" placeholder="Opsi C">
            </div>
            <div>
              <label><input type="checkbox" class="pgk-checkbox" data-option="D"> Jawaban D</label>
              <input type="text" class="pgk-input" data-option="D" placeholder="Opsi D">
            </div>
          </div>
        </div>

        <div id="shortAnswerOptions" style="display:none; grid-column: 1 / -1;">
          <label>Jawaban Benar</label>
          <input type="text" id="shortAnswerCorrect" placeholder="Jawaban yang benar">
        </div>

        <div id="essayOptions" style="display:none; grid-column: 1 / -1;">
          <label>Jawaban Kunci / Rubrik</label>
          <textarea id="essayRubric" placeholder="Kunci jawaban atau rubrik penilaian"></textarea>
        </div>

        <div style="grid-column: 1 / -1;">
          <label>Gambar Soal (Opsional)</label>
          <input type="file" id="questionImage" accept="image/*">
        </div>

        <div style="grid-column: 1 / -1;">
          <label>Nama Paket Soal (opsional)</label>
          <input type="text" id="questionPackageName" name="package_name" placeholder="Nama paket soal, mis: Paket Semester 1">
        </div>

        <div>
          <label>Poin</label>
          <input type="number" id="questionPoints" value="1" min="1">
        </div>

        <div style="grid-column: 1 / -1; display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="submit" class="btn btn-primary">Simpan Soal</button>
          <button type="button" class="btn btn-secondary" data-action="downloadQuestionTemplate">Download Template</button>
          <div>
            <input type="file" id="importQuestionFile" accept=".csv,.xlsx,.xls" style="display:none;">
            <button type="button" class="btn btn-secondary" data-action="importQuestion">Import Soal</button>
          </div>
          <button type="button" class="btn btn-secondary" data-action="printQuestions">Cetak Soal</button>
        </div>
        <div class="message" id="questionMessage" style="grid-column: 1 / -1;"></div>
      </form>
    </div>

    <div class="panel" id="questionsTablePanel">
      ${allQuestionsHtml || '<p>Tidak ada soal di bank soal.</p>'}
    </div>
  `;

  // make poin cells editable and save on blur
  document.querySelectorAll('.poin-cell').forEach((el) => {
    el.addEventListener('blur', async (e) => {
      const id = el.dataset.id;
      if (!id) return;
      const raw = el.textContent || '';
      const val = Number(raw.trim()) || 1;
      el.textContent = val;
      try {
        const res = await fetchApi(`/api/teacher/bank/${id}`, { method: 'PUT', body: JSON.stringify({ points: val }) });
        showMessage(document.getElementById('questionMessage'), res.message, res.success);
        if (!res.success) {
          // revert if failed
          el.textContent = el.dataset.prev || val;
        }
      } catch (err) {
        showMessage(document.getElementById('questionMessage'), err.message, false);
      }
    });
  });

  const typeSelect = document.getElementById('questionTypeSelect');
  const pgOptions = document.getElementById('pgOptions');
  const pgkOptions = document.getElementById('pgkOptions');
  const shortAnswerOptions = document.getElementById('shortAnswerOptions');
  const essayOptions = document.getElementById('essayOptions');

  function updateQuestionTypeUI() {
    if (!typeSelect) return;

    pgOptions.style.display =
      typeSelect.value === 'pilihan_ganda' ? 'block' : 'none';

    pgkOptions.style.display =
      typeSelect.value === 'pilihan_ganda_kompleks' ? 'block' : 'none';

    shortAnswerOptions.style.display =
      typeSelect.value === 'isian_singkat' ? 'block' : 'none';

    essayOptions.style.display =
      typeSelect.value === 'uraian' ? 'block' : 'none';
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', updateQuestionTypeUI);
  }

  document.querySelectorAll('.pgk-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = document.querySelectorAll(
        '.pgk-checkbox:checked'
      );

      if (checked.length > 2) {
        cb.checked = false;

        showMessage(
          document.getElementById('questionMessage'),
          'Maksimal 2 jawaban benar',
          false
        );
      }
    });
  });

  const importQuestionFileEl =
  document.getElementById('importQuestionFile');

  if (importQuestionFileEl) {
    importQuestionFileEl.addEventListener(
      'change',
      async (e) => {

        const file = e.target?.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {

          const res = await fetch(
            '/api/teacher/bank/import',
            {
              method:'POST',
              headers:{
                Authorization:
                `Bearer ${getToken()}`
              },
              body:formData
            }
          );

          const result = await res.json();

          showMessage(
            document.getElementById(
              'questionMessage'
            ),
            result.message,
            result.success
          );

          if(result.success){
            importQuestionFileEl.value='';
            loadQuestionBank();
          }

        } catch(err){

          showMessage(
            document.getElementById(
              'questionMessage'
            ),
            err.message,
            false
          );

        }

      }
    );
}

const questionForm =
document.getElementById('questionForm');

if (questionForm) {

  questionForm.addEventListener(
    'submit',
    async(e)=>{

      e.preventDefault();

      const msgEl =
      document.getElementById(
        'questionMessage'
      );

      const type=typeSelect.value;

      const subjectId=
      document.getElementById(
        'filterSubject'
      )?.value;

      if(!subjectId){

        showMessage(
          msgEl,
          'Pilih mata pelajaran',
          false
        );

        return;
      }

      let body={

        subject_id:subjectId,

        class_id:
        document.getElementById(
          'filterClass'
        )?.value || null,

        question_type:type,

        question_text:
        document.getElementById(
          'questionText'
        )?.value || ''

      };

      if(type==='pilihan_ganda'){

        const optionA=
        document.getElementById(
          'optionA'
        )?.value || '';

        const optionB=
        document.getElementById(
          'optionB'
        )?.value || '';

        const optionC=
        document.getElementById(
          'optionC'
        )?.value || '';

        const optionD=
        document.getElementById(
          'optionD'
        )?.value || '';

        const answer=
        document.getElementById(
          'correctAnswer'
        )?.value;

        if(
          !optionA ||
          !optionB ||
          !optionC ||
          !optionD
        ){
          showMessage(
            msgEl,
            'Semua opsi wajib diisi',
            false
          );
          return;
        }

        if(!answer){

          showMessage(
            msgEl,
            'Pilih jawaban benar',
            false
          );

          return;
        }

        body.options_json=[
          optionA,
          optionB,
          optionC,
          optionD
        ];

        body.answer_key=answer;
      }

      else if(
        type==='pilihan_ganda_kompleks'
      ){

        const optionA=document
        .querySelector(
        '.pgk-input[data-option="A"]'
        )?.value || '';

        const optionB=document
        .querySelector(
        '.pgk-input[data-option="B"]'
        )?.value || '';

        const optionC=document
        .querySelector(
        '.pgk-input[data-option="C"]'
        )?.value || '';

        const optionD=document
        .querySelector(
        '.pgk-input[data-option="D"]'
        )?.value || '';

        const correctAnswers=
        Array.from(
          document.querySelectorAll(
            '.pgk-checkbox:checked'
          )
        ).map(
          cb=>cb.dataset.option
        );

        if(
          !optionA ||
          !optionB ||
          !optionC ||
          !optionD
        ){
          showMessage(
            msgEl,
            'Semua opsi wajib diisi',
            false
          );
          return;
        }

        if(
          correctAnswers.length !== 2
        ){

          showMessage(
            msgEl,
            'Pilih tepat 2 jawaban',
            false
          );

          return;
        }

        body.options_json=[
          optionA,
          optionB,
          optionC,
          optionD
        ];

        body.answer_key=
        correctAnswers.join(',');
      }

      else if(
        type==='isian_singkat'
      ){

        const answer=
        document.getElementById(
          'shortAnswerCorrect'
        )?.value;

        if(!answer){

          showMessage(
            msgEl,
            'Isi jawaban benar',
            false
          );

          return;
        }

        body.answer_key=answer;
      }

      else if(
        type==='uraian'
      ){

        body.answer_key=
        document.getElementById(
          'essayRubric'
        )?.value || null;
      }

      try{

        // attach points and optional package
        body.points = Number(document.getElementById('questionPoints')?.value) || 1;
        body.package_name = document.getElementById('questionPackageName')?.value || null;

        setFormBusy(questionForm, true);

        const res = await fetchApi('/api/teacher/bank', { method: 'POST', body: JSON.stringify(body) });

        setFormBusy(
          questionForm,
          false
        );

        showMessage(
          msgEl,
          res.message,
          res.success
        );

        if(res.success){

          questionForm.reset();

          updateQuestionTypeUI();

          loadQuestionBank();
        }

      }catch(err){

        setFormBusy(
          questionForm,
          false
        );

        showMessage(
          msgEl,
          err.message,
          false
        );

      }

    }
  );

}
  }

window.editQuestionModal = (id) => {
  const item = window.questionCache?.[id];
  if (!item) {
    console.warn('Question tidak ditemukan:', id);
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const options = item.options_json || {};
  const answerKey = item.answer_key || '';
  const optionsHtml = Object.entries(options).map(([key, value]) => `
    <div>
      <label>${key}</label>
      <input type="text" value="${String(value || '').replace(/"/g, '&quot;')}" data-option="${key}" class="option-input">
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal-card">
      <h3>Edit Soal</h3>
      <form id="editQuestionForm" class="simple-form">
        <label>Tipe Soal</label>
        <input type="text" value="${item.question_type}" disabled>
        <label>Teks Soal</label>
        <textarea id="editQuestionText" required>${String(item.question_text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        ${optionsHtml ? `<div class="form-grid" style="grid-template-columns: 1fr 1fr;">${optionsHtml}</div>` : ''}
        <label>Jawaban Benar</label>
        <input type="text" id="editAnswerKey" value="${String(answerKey).replace(/"/g, '&quot;')}">
        <label>Penjelasan</label>
        <textarea id="editExplanation">${String(item.explanation || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
        <label>Bloom Level</label>
        <input type="text" id="editBloomLevel" value="${item.bloom_level || ''}">
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
          <button type="button" class="btn btn-secondary" data-action="closeModal">Batal</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const editForm = modal.querySelector('#editQuestionForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let options = {};
      modal.querySelectorAll('.option-input').forEach((input) => {
        options[input.dataset.option] = input.value;
      });
      const body = {
        question_text: document.getElementById('editQuestionText').value,
        options_json: Object.keys(options).length > 0 ? options : null,
        answer_key: document.getElementById('editAnswerKey').value || null,
        explanation: document.getElementById('editExplanation').value || null,
        bloom_level: document.getElementById('editBloomLevel').value || null,
      };
      const res = await fetchApi(`/api/teacher/bank/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      const msgEl = modal.querySelector('.message') || document.getElementById('questionMessage');
      if (msgEl) showMessage(msgEl, res.message, res.success);
      if (res.success) {
        modal.remove();
        loadQuestionBank();
      }
    });
  }
};

window.previewQuestion = async (id) => {
  const item = window.questionCache?.[id];
  if (!item) {
    const msgEl = document.getElementById('questionMessage');
    if (msgEl) showMessage(msgEl, 'Soal tidak ditemukan', false);
    console.warn('Question tidak ditemukan:', id);
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const options = item.options_json || {};
  const optionsHtml = Object.entries(options).map(([key, value]) => `<div><strong>${key}:</strong> ${String(value || '')}</div>`).join('');
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Preview Soal</h3>
      <div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <p><strong>Tipe:</strong> ${item.question_type}</p>
        <p><strong>Soal:</strong></p>
        <p>${String(item.question_text || '')}</p>
        ${optionsHtml ? `<p><strong>Opsi:</strong></p><div>${optionsHtml}</div>` : ''}
        <p><strong>Jawaban Benar:</strong> ${item.answer_key || '-'}</p>
        <p><strong>Penjelasan:</strong> ${String(item.explanation || '-')}</p>
        <p><strong>Bloom Level:</strong> ${item.bloom_level || '-'}</p>
      </div>
      <button type="button" class="btn btn-secondary" data-action="closeModal" style="margin-top: 20px;">Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
};

window.deleteQuestion = async (id) => {
  if (!confirm('Hapus soal ini?')) return;
  const res = await fetchApi(`/api/teacher/bank/${id}`, { method: 'DELETE' });
  const msgEl = document.getElementById('questionMessage');
  if (msgEl) showMessage(msgEl, res.message, res.success);
  if (res.success) loadQuestionBank();
};

window.downloadQuestionTemplate = () => {

  const headers = [
    'question_type',
    'question_text',
    'bloom_level',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'answer_key'
  ];

  const rows = [

    [
      'pilihan_ganda',
      'Berapa hasil dari 2 + 2?',
      'C1',
      '1',
      '2',
      '3',
      '4',
      '',
      'D'
    ],

    [
      'pilihan_ganda_kompleks',
      'Manakah yang termasuk hewan mamalia?',
      'C2',
      'Kucing',
      'Ayam',
      'Sapi',
      'Ikan',
      '',
      'A,C'
    ],

    [
      'isian_singkat',
      'Ibu kota Indonesia adalah?',
      'C1',
      '',
      '',
      '',
      '',
      '',
      'Jakarta'
    ],

    [
      'uraian',
      'Jelaskan proses fotosintesis!',
      'C3',
      '',
      '',
      '',
      '',
      '',
      'Rubrik Penilaian'
    ]
  ];

  const csv = [headers, ...rows]
    .map(row =>
      row.map(cell =>
        `"${String(cell).replace(/"/g, '""')}"`
      ).join(',')
    )
    .join('\n');

  const blob = new Blob(
    [csv],
    { type: 'text/csv;charset=utf-8;' }
  );

  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);

  link.download =
    `template_soal_${new Date().toISOString().split('T')[0]}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
};


window.printQuestions = () => {
  window.print();
};

window.downloadStudentTemplate = () => {
  const headers = ['student_name', 'nisn', 'password', 'class_id'];
  const rows = [
    ['Budi Santoso', '1234567890', '1234567890', ''],
    ['Siti Aminah', '9876543210', '', ''],
  ];
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `template_datasiswa_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

const loadStudentExams = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Ujian</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/student/exams');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  const now = new Date();

  const rows = result.data.map((exam) => {
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    const status = now < startTime ? 'Belum Aktif' : now > endTime ? 'Selesai' : 'Aktif';
    return `
      <tr>
        <td>${exam.title}</td>
        <td>${exam.token || '-'}</td>
        <td>${startTime.toLocaleString('id-ID')}</td>
        <td>${endTime.toLocaleString('id-ID')}</td>
        <td>${status}</td>
        <td>
          ${exam.token ? `<button type="button" class="btn btn-secondary" data-action="openExamToken" data-token="${exam.token}">Ikuti</button>` : '-'}
          ${exam.token ? `<button type="button" class="btn btn-secondary" data-action="copyExamToken" data-token="${exam.token}">Copy Token</button>` : ''}
        </td>
      </tr>`;
  }).join('');

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Ujian</h3>
      <p>Masukkan token ujian atau pilih ujian yang tersedia untuk mengikuti.</p>
      <form id="joinExamForm" class="simple-form" style="margin-bottom: 24px;">
        <label>Token Ujian</label>
        <input name="token" placeholder="Masukkan token ujian" required>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Ikuti Ujian</button>
        </div>
        <div class="message" id="joinExamMessage"></div>
      </form>
      ${result.data.length > 0 ? `
        <table class="table">
          <thead>
            <tr>
              <th>Judul</th>
              <th>Token</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : '<p>Tidak ada ujian tersedia saat ini.</p>'}
    </div>`;

  document.getElementById('joinExamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = e.target.token.value.trim();
    if (!token) return showMessage(document.getElementById('joinExamMessage'), 'Token ujian wajib diisi', false);
    await openExamByToken(token);
  });
};

window.openExamByToken = async (token) => {
  if (!token) return;
  const messageEl = document.getElementById('joinExamMessage');
  const result = await fetchApi(`/api/student/exams/token/${token}`);
  if (!result.success) {
    if (messageEl) showMessage(messageEl, result.message || 'Gagal membuka ujian', false);
    return;
  }
  if (messageEl) messageEl.textContent = '';
  renderExamAttempt(result.data.exam, result.data.questions || []);
};

window.copyExamToken = (token) => {
  if (!token) return;
  if (!navigator.clipboard) {
    alert('Clipboard tidak didukung di browser ini');
    return;
  }
  navigator.clipboard.writeText(token).then(() => {
    alert('Token ujian telah disalin ke clipboard');
  }).catch(() => {
    alert('Gagal menyalin token');
  });
};

const loadTeacherExams = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Ruang Ujian</h3><div>Memuat...</div></div>';
  const [result, classesRes, subjectsRes, packagesRes] = await Promise.all([
    fetchApi('/api/teacher/exams'),
    fetchApi('/api/teacher/classes'),
    fetchApi('/api/teacher/subjects'),
    fetchApi('/api/teacher/bank/packages'),
  ]);
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  const classOptions = classesRes.success ? classesRes.data.map((c) => `<option value="${c.id}">${c.class_name}</option>`).join('') : '';
  const subjectOptions = subjectsRes.success ? subjectsRes.data.map((s) => `<option value="${s.id}">${s.subject_name}</option>`).join('') : '';
  const packageList = packagesRes.success ? packagesRes.data || [] : [];
  const allPackageOptions = packageList.map((pkg) => ({
    id: pkg.id,
    label: pkg.name || pkg.package_name || `Paket ${pkg.id}`,
    subject_id: pkg.subject_id || '',
    class_id: pkg.class_id || '',
  }));

  const buildPackageOptions = (subjectId, classId) => {
    const filtered = allPackageOptions.filter((pkg) => {
      const subjectMatches = !subjectId || !pkg.subject_id || pkg.subject_id === subjectId;
      const classMatches = !classId || !pkg.class_id || pkg.class_id === classId;
      return subjectMatches && classMatches;
    });
    if (!filtered.length) {
      return '<option value="" disabled>Tidak ada paket soal sesuai pilihan</option>';
    }
    return `<option value="">Pilih Paket</option>${filtered.map((pkg) => `<option value="${pkg.id}" data-subject-id="${pkg.subject_id}" data-class-id="${pkg.class_id}">${pkg.label}</option>`).join('')}`;
  };

  window.examCache = {};
  (result.data || []).forEach((exam) => {
    window.examCache[exam.id] = exam;
  });
  const rows = (result.data || []).map((exam) => `
    <tr>
      <td>${exam.title}</td>
      <td>${exam.token}</td>
      <td>${new Date(exam.start_time).toLocaleString()}</td>
      <td>${new Date(exam.end_time).toLocaleString()}</td>
      <td>${exam.question_packages?.name || '-'}</td>
      <td>
        <button type="button" class="btn btn-secondary" data-action="viewExamDetails" data-id="${exam.id}">Lihat</button>
      </td>
    </tr>
  `).join('');
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Ruang Ujian</h3>
      <form id="examForm" class="simple-form">
        <label>Judul Ujian</label>
        <input name="title" required>
        <label>Kelas</label>
        <select name="class_id" required>
          <option value="">Pilih Kelas</option>
          ${classOptions}
        </select>
        <label>Mata Pelajaran</label>
        <select name="subject_id" required>
          <option value="">Pilih Mata Pelajaran</option>
          ${subjectOptions}
        </select>
        <label>Pilih Paket Ujian</label>
        <select name="package_id" required>
          ${buildPackageOptions('', '')}
        </select>
        <label>Waktu Mulai</label>
        <input type="datetime-local" name="start_time" required>
        <label>Waktu Selesai</label>
        <input type="datetime-local" name="end_time" required>
        <label>Deskripsi (Opsional)</label>
        <textarea name="description"></textarea>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Buat Ujian</button>
        </div>
        <div class="message" id="examMessage"></div>
      </form>
      <table class="table"><thead><tr><th>Judul</th><th>Token</th><th>Mulai</th><th>Selesai</th><th>Paket</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  const examForm = document.getElementById('examForm');
  const packageSelect = examForm.querySelector('select[name="package_id"]');
  const subjectSelect = examForm.querySelector('select[name="subject_id"]');
  const classSelect = examForm.querySelector('select[name="class_id"]');

  const syncPackageOptions = () => {
    if (!packageSelect) return;
    const selectedPackage = packageSelect.value;
    packageSelect.innerHTML = buildPackageOptions(subjectSelect.value, classSelect.value);
    packageSelect.value = selectedPackage || '';
    if (!packageSelect.querySelector(`option[value="${packageSelect.value}"]`)) {
      packageSelect.value = '';
    }
  };

  if (packageSelect) {
    packageSelect.addEventListener('change', () => {
      const selected = packageSelect.selectedOptions[0] || packageSelect.options[packageSelect.selectedIndex];
      if (!selected || !selected.dataset) return;
      const subjectId = selected.dataset.subjectId;
      const classId = selected.dataset.classId;
      if (subjectId && subjectSelect) subjectSelect.value = subjectId;
      if (classId && classSelect) classSelect.value = classId;
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener('change', syncPackageOptions);
  }
  if (classSelect) {
    classSelect.addEventListener('change', syncPackageOptions);
  }

  examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = {
      title: form.title.value,
      class_id: form.class_id.value,
      subject_id: form.subject_id.value,
      package_id: form.package_id.value,
      start_time: new Date(form.start_time.value).toISOString(),
      end_time: new Date(form.end_time.value).toISOString(),
      description: form.description.value || null,
    };
    setFormBusy(form, true);
    const res = await fetchApi('/api/teacher/exams', { method: 'POST', body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(document.getElementById('examMessage'), res.message, res.success);
    if (res.success) {
      form.reset();
      loadTeacherExams();
    }
  });
};

window.viewExamDetails = async (id) => {
  const exam = (window.examCache || {})[id];
  if (!exam) return;
  alert(`Token: ${exam.token}\nJudul: ${exam.title}\n\nBagikan token ini kepada siswa untuk mengikuti ujian.`);
};

const renderAiTopicChips = (topics) => {
  return topics.map((topic, index) => `
    <span class="tag-chip">${topic}
      <button type="button" class="chip-remove" data-index="${index}">✕</button>
    </span>
  `).join('');
};

const parseOptionsJson = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

const renderAiPreview = () => {
  const previewSection = document.getElementById('aiPreviewSection');
  if (!previewSection) return;
  const questions = window.aiGeneratedQuestions || [];
  if (!questions.length) {
    previewSection.innerHTML = '<p>Tidak ada soal AI yang dihasilkan.</p>';
    return;
  }

  const items = questions.map((question, index) => {
    const options = question.options || question.options_json || [];
    const optionList = Array.isArray(options)
      ? options.map((option) => {
          const label = typeof option === 'object' ? (option.label || option.text || JSON.stringify(option)) : option;
          return `<li>${label}</li>`;
        }).join('')
      : '';
    const qType = question.type || question.question_type || 'Pilihan Ganda';
    const difficulty = question.difficulty || question.level || 'sedang';
    const imageUrl = question.image_url ? question.image_url : 'https://via.placeholder.com/520x260?text=Soal+Gambar';
    return `
      <div class="question-card" data-index="${index}">
        <div class="question-card-header">
          <span class="badge">${qType}</span>
          <span class="badge badge-secondary">${difficulty}</span>
        </div>
        <p class="question-title"><strong>${index + 1}.</strong> ${question.question || question.question_text || 'Tidak ada teks soal'}</p>
        <div class="question-image"><img src="${imageUrl}" alt="Gambar Soal" loading="lazy"></div>
        ${optionList ? `<ul class="question-options">${optionList}</ul>` : ''}
        <div class="question-meta">
          <div><strong>Kunci jawaban:</strong> ${question.answer || question.answer_key || '-'}</div>
          <div><strong>Rubrik:</strong> ${question.rubric || '-'}</div>
        </div>
        <div class="question-actions">
          <button class="btn btn-secondary" type="button" data-action="edit" data-index="${index}">Edit Soal</button>
          <button class="btn btn-secondary" type="button" data-action="remove" data-index="${index}">Hapus Soal</button>
        </div>
      </div>`;
  }).join('');

  previewSection.innerHTML = `
    <div style="background-color: #f0f7ff; border-left: 4px solid #2196F3; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
      <strong>💡 Tips:</strong> Review soal di bawah. Edit jika diperlukan, kemudian klik "Simpan ke Bank Soal" untuk menyimpan dan membuat ujian dari soal ini.
    </div>
    <div class="preview-toolbar">
      <button class="btn btn-primary" id="saveAiToBankButton">✅ Simpan ke Bank Soal</button>
      <button class="btn btn-secondary" id="exportAiButton">📥 Export (Simpan Juga)</button>
      <button class="btn btn-secondary" id="printAiButton">🖨️ Cetak PDF</button>
      <button class="btn btn-secondary" id="regenerateAiButton">🔄 Generate Ulang</button>
    </div>
    <div class="preview-grid">${items}</div>
  `;

  previewSection.querySelector('#saveAiToBankButton')?.addEventListener('click', saveGeneratedQuestions);
  previewSection.querySelector('#exportAiButton')?.addEventListener('click', saveGeneratedQuestions);
  previewSection.querySelector('#printAiButton')?.addEventListener('click', () => window.print());
  previewSection.querySelector('#regenerateAiButton')?.addEventListener('click', () => document.getElementById('aiGenerateForm').dispatchEvent(new Event('submit')));
  previewSection.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const index = Number(event.target.dataset.index);
      openAiQuestionEditor(index);
    });
  });
  previewSection.querySelectorAll('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const index = Number(event.target.dataset.index);
      window.aiGeneratedQuestions.splice(index, 1);
      renderAiPreview();
    });
  });
};

const openAiQuestionEditor = (index) => {
  const question = window.aiGeneratedQuestions[index];
  if (!question) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Edit Soal AI</h3>
      <form id="aiEditForm" class="simple-form">
        <label>Jenis Soal</label>
        <input name="type" value="${question.type || question.question_type || ''}" required>
        <label>Tingkat Kesulitan</label>
        <input name="difficulty" value="${question.difficulty || question.level || ''}" placeholder="mudah/sedang/tinggi">
        <label>Soal</label>
        <textarea name="question" required>${question.question || question.question_text || ''}</textarea>
        <label>Opsi (JSON)</label>
        <textarea name="options" placeholder='["A","B","C","D"]'>${JSON.stringify(question.options || question.options_json || [])}</textarea>
        <label>Kunci Jawaban</label>
        <input name="answer" value="${question.answer || question.answer_key || ''}">
        <label>Penjelasan</label>
        <textarea name="explanation">${question.explanation || question.pembahasan || ''}</textarea>
        <label>Rubrik</label>
        <textarea name="rubric">${question.rubric || ''}</textarea>
        <label>URL Gambar</label>
        <input name="image_url" value="${question.image_url || ''}">
        <label>Unggah Gambar</label>
        <input type="file" name="image_file" accept="image/*">
        <button type="button" class="btn btn-secondary" id="uploadQuestionImage">Unggah Gambar</button>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Simpan Perubahan</button>
          <button class="btn btn-secondary" type="button" id="cancelAiEdit">Batal</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#cancelAiEdit').addEventListener('click', () => modal.remove());
  modal.querySelector('#uploadQuestionImage')?.addEventListener('click', async () => {
    const fileInput = modal.querySelector('input[name="image_file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      return showMessage(document.getElementById('aiGenerateMessage'), 'Pilih file gambar terlebih dahulu', false);
    }
    const formData = new FormData();
    formData.append('image', file);
    const uploadRes = await fetchApi('/api/teacher/bank/upload-image', { method: 'POST', body: formData });
    if (uploadRes.success && uploadRes.data?.image_url) {
      modal.querySelector('input[name="image_url"]').value = uploadRes.data.image_url;
      showMessage(document.getElementById('aiGenerateMessage'), 'Gambar berhasil diunggah', true);
    } else {
      showMessage(document.getElementById('aiGenerateMessage'), uploadRes.message || 'Gagal mengunggah gambar', false);
    }
  });
  modal.querySelector('#aiEditForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    question.type = form.get('type');
    question.difficulty = form.get('difficulty');
    question.question = form.get('question');
    question.options = parseOptionsJson(form.get('options')) || question.options || [];
    question.answer = form.get('answer');
    question.explanation = form.get('explanation');
    question.rubric = form.get('rubric');
    question.image_url = form.get('image_url') || question.image_url || null;
    window.aiGeneratedQuestions[index] = question;
    modal.remove();
    renderAiPreview();
  });
};

const saveGeneratedQuestions = async () => {
  const questions = window.aiGeneratedQuestions || [];
  const form = document.getElementById('aiGenerateForm');
  if (!questions.length || !form) {
    return showMessage(document.getElementById('aiGenerateMessage'), 'Tidak ada soal yang dihasilkan untuk disimpan', false);
  }
  const subject_id = form.subject_id.value;
  const class_id = form.class_id.value || null;
  if (!subject_id) {
    return showMessage(document.getElementById('aiGenerateMessage'), 'Pilih mata pelajaran sebelum menyimpan', false);
  }

  const topicText = (window.aiGenerationTopics || []).join(', ') || 'Paket AI Generated';
  const timestamp = new Date().toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const defaultPackageName = `Paket AI - ${topicText.substring(0, 30)} - ${timestamp}`;
  const package_name = form.package_name?.value?.trim() || defaultPackageName;

  const body = { subject_id, class_id, package_name, questions };
  
  setFormBusy(form, true);
  const res = await fetchApi('/api/teacher/bank/import-ai', { method: 'POST', body: JSON.stringify(body) });
  setFormBusy(form, false);
  
  showMessage(document.getElementById('aiGenerateMessage'), res.message, res.success);
  
  if (res.success) {
    window.aiGeneratedQuestions = [];
    window.aiGenerationTopics = [];
    const previewSection = document.getElementById('aiPreviewSection');
    if (previewSection) previewSection.style.display = 'none';
    
    const packageInfo = res.data?.package;
    const count = res.data?.count || questions.length;
    let successMessage = `✅ ${count} soal AI berhasil disimpan!`;
    if (packageInfo) {
      successMessage += `\n\n📦 Paket: ${packageInfo.name}\n\nAnda dapat langsung membuat ujian di menu "Ruang Ujian"!`;
    }
    alert(successMessage);
  }
};

const loadTeacherAI = async () => {
  const [subjectRes, classRes] = await Promise.all([
    fetchApi('/api/teacher/subjects').catch(() => ({ success: false, data: [] })),
    fetchApi('/api/teacher/classes').catch(() => ({ success: false, data: [] })),
  ]);
  const subjectOptions = subjectRes.success ? subjectRes.data.map((s) => `<option value="${s.id}">${s.subject_name}</option>`).join('') : '';
  const classOptions = classRes.success ? [`<option value="">Semua Kelas</option>`, ...classRes.data.map((c) => `<option value="${c.id}">${c.class_name}</option>`)] .join('') : '<option value="">Semua Kelas</option>';
  window.aiGeneratedQuestions = [];
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>AI Generator</h3>
      <form id="aiGenerateForm" class="simple-form form-grid">
        <div>
          <label>Mata Pelajaran</label>
          <select name="subject_id" required>
            <option value="">Pilih Mata Pelajaran</option>
            ${subjectOptions}
          </select>
        </div>
        <div>
          <label>Kelas</label>
          <select name="class_id">
            ${classOptions}
          </select>
        </div>
        <div>
          <label>Nama Paket Soal (opsional)</label>
          <input name="package_name" placeholder="Nama paket soal untuk hasil generate">
        </div>
        <div>
          <label>Materi Pokok (enter untuk tambah)</label>
          <input type="text" id="topicInput" placeholder="Ketik materi dan tekan Enter">
          <div id="topicList" class="topic-list"></div>
        </div>
        <div style="grid-column:1 / -1;">
          <label>Instruksi Tambahan AI (opsional)</label>
          <textarea name="custom_prompt" rows="4" placeholder="Tulis perintah khusus untuk AI, misalnya fokus pada konteks lokal atau gaya tertentu"></textarea>
        </div>
        <div>
          <label>Tingkat Kesulitan</label>
          <select name="difficulty" required>
            <option value="sedang">Sedang</option>
            <option value="mudah">Mudah</option>
            <option value="tinggi">Tinggi</option>
          </select>
        </div>
        <div>
          <label>Jumlah PG</label>
          <input type="number" name="choices" min="0" value="5">
        </div>
        <div>
          <label>Jumlah PGK</label>
          <input type="number" name="complex" min="0" value="2">
        </div>
        <div>
          <label>Jumlah Isian Singkat</label>
          <input type="number" name="fill" min="0" value="1">
        </div>
        <div>
          <label>Jumlah Uraian</label>
          <input type="number" name="essay" min="0" value="2">
        </div>
        <div>
          <label>Persentase soal bergambar</label>
          <input type="number" name="image_ratio" min="0" max="100" value="30">
        </div>
        <div class="checkbox-group" style="grid-column:1 / -1; display:grid; gap:10px;">
          <label><input type="checkbox" name="random_soal" checked> Random soal</label>
          <label><input type="checkbox" name="random_opsi" checked> Random opsi jawaban</label>
          <label><input type="checkbox" name="auto_submit"> Auto submit</label>
          <label><input type="checkbox" name="show_realtime_score"> Tampilkan realtime hasil</label>
        </div>
        <div class="form-actions" style="grid-column:1 / -1; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-primary" type="submit">Generate Paket Asesmen</button>
          <span class="hint-text">Gunakan materi yang jelas untuk hasil terbaik.</span>
        </div>
        <div class="message" id="aiGenerateMessage"></div>
      </form>
    </div>
    <div id="aiPreviewSection" class="panel" style="display:none;"></div>
  `;

  const topicInput = document.getElementById('topicInput');
  const topicList = document.getElementById('topicList');
  const topics = [];
  const renderTopics = () => {
    topicList.innerHTML = renderAiTopicChips(topics);
    topicList.querySelectorAll('.chip-remove').forEach((button) => {
      button.addEventListener('click', (event) => {
        const index = Number(event.target.dataset.index);
        topics.splice(index, 1);
        renderTopics();
      });
    });
  };

  topicInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const topic = topicInput.value.trim();
      if (topic && !topics.includes(topic)) {
        topics.push(topic);
        renderTopics();
        topicInput.value = '';
      }
    }
  });

  document.getElementById('aiGenerateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!topics.length) {
      return showMessage(document.getElementById('aiGenerateMessage'), 'Tambahkan minimal satu materi pokok', false);
    }
    const body = {
      subject_id: form.subject_id.value,
      class_id: form.class_id.value || null,
      topics,
      choices: Number(form.choices.value),
      complex: Number(form.complex.value),
      fill: Number(form.fill.value),
      essay: Number(form.essay.value),
      image_ratio: Number(form.image_ratio.value),
      difficulty: form.difficulty.value,
      custom_prompt: form.custom_prompt.value.trim() || null,
      random_soal: form.random_soal.checked,
      random_opsi: form.random_opsi.checked,
      auto_submit: form.auto_submit.checked,
      show_realtime_score: form.show_realtime_score.checked,
    };
    window.aiGenerationTopics = topics;
    setFormBusy(form, true);
    const res = await fetchApi('/api/teacher/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    setFormBusy(form, false);
    showMessage(document.getElementById('aiGenerateMessage'), res.message, res.success);
    const previewSection = document.getElementById('aiPreviewSection');
    if (res.success && Array.isArray(res.data.generated)) {
      window.aiGeneratedQuestions = res.data.generated.map((item) => ({
        ...item,
        options: item.options || item.options_json || [],
      }));
      previewSection.style.display = 'block';
      renderAiPreview();
    } else {
      previewSection.style.display = 'none';
    }
  });
};

const loadTeacherMaterial = async () => {
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Upload Materi</h3>
      <p>Fitur upload materi belum tersedia di server. Tambahkan endpoint dan form upload pada backend terlebih dahulu.</p>
    </div>`;
};

const loadStudentDashboard = async () => {
  const [examsRes, assignmentsRes, resultsRes] = await Promise.all([
    fetchApi('/api/student/exams'),
    fetchApi('/api/student/assignments'),
    fetchApi('/api/student/results'),
  ]);
  const user = getUser();
  const examCount = examsRes.success ? examsRes.data.length : 0;
  const assignmentCount = assignmentsRes.success ? assignmentsRes.data.length : 0;
  const completedExams = resultsRes.success ? resultsRes.data.length : 0;
  
  const recentExams = examsRes.success ? examsRes.data.slice(0, 3) : [];
  const upcomingExams = recentExams.filter(e => new Date(e.start_time) > new Date());
  const activeExams = recentExams.filter(e => new Date(e.start_time) <= new Date() && new Date(e.end_time) > new Date());
  
  const examRows = upcomingExams.concat(activeExams).map(exam => `
    <tr>
      <td>${exam.title}</td>
      <td>${new Date(exam.start_time).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      <td>${new Date(exam.end_time) > new Date() ? '<span style="color: green;">Aktif</span>' : '<span style="color: gray;">Selesai</span>'}</td>
    </tr>
  `).join('');

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Selamat Datang, ${user?.student_name || user?.name || 'Siswa'}</h3>
      <p>NISN: <strong>${user?.nisn || '-'}</strong> | Kelas: <strong>${user?.class_id || '-'}</strong></p>
      <p style="margin-top: 12px;">Ringkasan aktivitas pembelajaran Anda.</p>
    </div>
    
    <div class="panel">
      <h3>Statistik Pembelajaran</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Ujian Tersedia</h4>
          <p>${examCount}</p>
        </div>
        <div class="stat-card">
          <h4>Tugas Aktif</h4>
          <p>${assignmentCount}</p>
        </div>
        <div class="stat-card">
          <h4>Ujian Selesai</h4>
          <p>${completedExams}</p>
        </div>
      </div>
    </div>

    ${upcomingExams.length || activeExams.length ? `
    <div class="panel">
      <h3>Ujian Mendatang & Aktif</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Nama Ujian</th>
            <th>Waktu Mulai</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${examRows}
        </tbody>
      </table>
    </div>
    ` : '<div class="panel"><p>Tidak ada ujian mendatang atau aktif.</p></div>'}
  `;
};

const loadStudentProfile = async () => {
  const storedUser = getUser();
  const profileRes = await fetchApi('/api/student/profile');
  const user = profileRes.success ? {
    ...storedUser,
    student_name: profileRes.data.student_name,
    nisn: profileRes.data.nisn,
    email: profileRes.data.email,
    class_id: profileRes.data.class_id,
    school_id: profileRes.data.school_id,
  } : storedUser;
  if (profileRes.success) {
    setSession(getToken(), getRefreshToken(), user);
  }

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Profil Saya</h3>
      <form id="studentProfileForm" class="simple-form form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <label>Nama Siswa</label>
          <input name="student_name" value="${user?.student_name || ''}" readonly>
        </div>
        <div>
          <label>NISN</label>
          <input name="nisn" value="${user?.nisn || ''}" readonly>
        </div>
        <div style="grid-column: 1 / -1;">
          <label>Email</label>
          <input value="${user?.email || ''}" readonly>
        </div>
        <div style="grid-column: 1 / -1;">
          <label>Sekolah / Kelas</label>
          <input value="${user?.class_id || user?.school_id || '-'}" readonly>
        </div>
        <div style="grid-column: 1 / -1;">
          <button type="button" class="btn btn-secondary" id="editPasswordBtn">Ganti Password</button>
        </div>
      </form>
      <div class="message" id="profileMessage"></div>
    </div>

    <div class="panel" id="passwordPanel" style="display:none;">
      <h3>Ganti Password</h3>
      <form id="changePasswordForm" class="simple-form">
        <label>Password Baru</label>
        <input type="password" name="password" placeholder="Minimal 6 karakter" required>
        <label>Konfirmasi Password</label>
        <input type="password" name="password_confirm" placeholder="Ketik ulang password" required>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Simpan Password</button>
          <button type="button" class="btn btn-secondary" id="cancelPasswordBtn">Batal</button>
        </div>
        <div class="message" id="passwordMessage"></div>
      </form>
    </div>
  `;

  document.getElementById('editPasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordPanel').style.display = 'block';
  });

  document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordPanel').style.display = 'none';
  });

  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const password = form.get('password');
    const passwordConfirm = form.get('password_confirm');
    if (password !== passwordConfirm) {
      return showMessage(document.getElementById('passwordMessage'), 'Password tidak cocok', false);
    }
    if (password.length < 6) {
      return showMessage(document.getElementById('passwordMessage'), 'Password minimal 6 karakter', false);
    }
    const res = await fetchApi('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    showMessage(document.getElementById('passwordMessage'), res.message, res.success);
    if (res.success) {
      document.getElementById('passwordPanel').style.display = 'none';
    }
  });
};

const loadStudentModules = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Modul Pelajaran</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/student/modules');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  
  const rows = result.data.map((module) => `
    <tr>
      <td>${module.title}</td>
      <td>${module.description || '-'}</td>
      <td>${new Date(module.created_at).toLocaleDateString('id-ID')}</td>
      <td>
        ${module.file_url ? `<a href="${module.file_url}" target="_blank" class="btn btn-secondary" style="font-size: 0.85rem;">Download</a>` : '-'}
      </td>
    </tr>
  `).join('');
  
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Modul Pelajaran</h3>
      <p>Modul pembelajaran dari guru Anda. Klik tombol download untuk mengakses file.</p>
      ${result.data.length > 0 ? `
        <table class="table">
          <thead>
            <tr>
              <th>Judul Modul</th>
              <th>Deskripsi</th>
              <th>Tanggal Upload</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : '<p>Tidak ada modul pelajaran tersedia.</p>'}
    </div>
  `;
};

const loadStudentAssignments = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Kumpulkan Tugas</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/student/assignments');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  
  const rows = result.data.map((assignment) => {
    const now = new Date();
    const deadline = new Date(assignment.due_date);
    const isOverdue = now > deadline;
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    return `
    <tr>
      <td>${assignment.title}</td>
      <td>${assignment.description || '-'}</td>
      <td>${deadline.toLocaleDateString('id-ID')}</td>
      <td style="color: ${isOverdue ? 'red' : daysLeft <= 3 ? 'orange' : 'green'};">
        ${isOverdue ? 'Lewat' : daysLeft + ' hari'}
      </td>
      <td>
        <button type="button" class="btn btn-secondary submit-assignment-btn" data-id="${assignment.id}" style="font-size: 0.85rem;">Submit</button>
      </td>
    </tr>
  `;
  }).join('');
  
  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Kumpulkan Tugas</h3>
      <p>Kumpulkan tugas-tugas dari guru Anda sebelum deadline.</p>
      ${result.data.length > 0 ? `
        <table class="table">
          <thead>
            <tr>
              <th>Judul Tugas</th>
              <th>Deskripsi</th>
              <th>Deadline</th>
              <th>Sisa Waktu</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : '<p>Tidak ada tugas untuk Anda kumpulkan.</p>'}
    </div>
  `;

  document.querySelectorAll('.submit-assignment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const assignmentId = btn.dataset.id;
      const assignment = result.data.find(a => a.id === assignmentId);
      showSubmitAssignmentModal(assignmentId, assignment?.title);
    });
  });
};

window.showSubmitAssignmentModal = (assignmentId, title) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Submit Tugas: ${title}</h3>
      <form id="assignmentSubmitForm" class="simple-form">
        <label>File Tugas</label>
        <input type="file" name="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.png,.zip">
        <p style="font-size: 0.85rem; color: gray;">Format: PDF, DOC, XLS, PPT, TXT, JPG, PNG, ZIP (Max 10MB)</p>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Upload dan Submit</button>
          <button type="button" class="btn btn-secondary" data-action="closeModal">Batal</button>
        </div>
        <div class="message" id="assignmentMessage"></div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('assignmentSubmitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const res = await fetchApi(`/api/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: form,
    });
    showMessage(document.getElementById('assignmentMessage'), res.message, res.success);
    if (res.success) {
      setTimeout(() => {
        modal.remove();
        loadStudentAssignments();
      }, 1500);
    }
  });
};

const loadStudentResults = async () => {
  dashboardContent.innerHTML = '<div class="panel"><h3>Hasil Ujian</h3><div>Memuat...</div></div>';
  const result = await fetchApi('/api/student/results');
  if (!result.success) return dashboardContent.innerHTML = `<p>${result.message}</p>`;
  
  let totalScore = 0;
  let completedCount = 0;
  const rows = result.data.map((result) => {
    const score = result.score != null ? Number(result.score) : null;
    if (score !== null && !Number.isNaN(score)) {
      totalScore += score;
      completedCount++;
    }
    return `
    <tr>
      <td>${result.exams?.title || '-'}</td>
      <td>${new Date(result.submitted_at).toLocaleDateString('id-ID')}</td>
      <td>${score !== null && !Number.isNaN(score) ? Math.round(score) + '%' : 'Sedang dikerjakan'}</td>
      <td>
        ${score !== null && !Number.isNaN(score) ? `<button type="button" class="btn btn-secondary view-result-btn" data-id="${result.id}" style="font-size: 0.85rem;">Lihat Detail</button>` : '-'}
      </td>
    </tr>
  `;
  }).join('');
  
  const avgScore = completedCount > 0 ? (totalScore / completedCount).toFixed(2) : 0;

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Hasil Ujian</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Total Ujian</h4>
          <p>${result.data.length}</p>
        </div>
        <div class="stat-card">
          <h4>Selesai</h4>
          <p>${completedCount}</p>
        </div>
        <div class="stat-card">
          <h4>Rata-rata Nilai</h4>
          <p>${avgScore}%</p>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Daftar Hasil Ujian</h3>
      ${result.data.length > 0 ? `
        <table class="table">
          <thead>
            <tr>
              <th>Nama Ujian</th>
              <th>Tanggal Submit</th>
              <th>Nilai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : '<p>Tidak ada hasil ujian tersedia.</p>'}
    </div>
  `;

  document.querySelectorAll('.view-result-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const resultId = btn.dataset.id;
      const resultData = result.data.find(r => r.id === resultId);
      showResultDetail(resultData);
    });
  });
};

window.showResultDetail = (result) => {
  const score = result.score != null ? Number(result.score) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Detail Hasil Ujian</h3>
      <div style="padding: 16px; background: #f9f9f9; border-radius: 8px;">
        <p><strong>Nama Ujian:</strong> ${result.exams?.title}</p>
        <p><strong>Tanggal:</strong> ${new Date(result.submitted_at).toLocaleString('id-ID')}</p>
        <p><strong>Nilai:</strong> <strong style="font-size: 1.2em; color: #2ecc71;">${score !== null && !Number.isNaN(score) ? Math.round(score) + '%' : 'Sedang dinilai'}</strong></p>
        <p><strong>Waktu Mulai:</strong> ${new Date(result.exams?.start_time).toLocaleString('id-ID')}</p>
        <p><strong>Waktu Selesai:</strong> ${new Date(result.exams?.end_time).toLocaleString('id-ID')}</p>
      </div>
      <button type="button" class="btn btn-secondary" data-action="closeModal" style="margin-top: 20px;">Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
};


const renderExamAttempt = (exam, questions) => {
  const deadline = new Date(exam.end_time).getTime();
  const now = Date.now();
  const running = now <= deadline;
  const remaining = deadline - now;
  const initialAnswers = loadExamDraft(exam.id) || {};

  const displayQuestions = exam.randomized ? shuffleArray(questions) : questions;
  const shouldShuffleOptions = exam.randomize_options !== false;

  const questionItems = displayQuestions.map((q, index) => {
    let optionsMarkup = '';
    const answerValue = initialAnswers[q.sequence] || '';
    try {
      const optionsData = q.question_banks.options_json;
      const options = optionsData
        ? typeof optionsData === 'string'
          ? JSON.parse(optionsData)
          : optionsData
        : [];
      const displayOptions = shouldShuffleOptions ? shuffleArray(options) : options;
      if (Array.isArray(displayOptions) && displayOptions.length) {
        optionsMarkup = displayOptions.map((option) => {
          const value = typeof option === 'object' ? JSON.stringify(option) : option;
          const label = typeof option === 'object' ? option.label || option.text || JSON.stringify(option) : option;
          const checked = answerValue === value ? 'checked' : '';
          return `
            <label class="option-row">
              <input type="radio" name="question_${q.sequence}" value='${value}' ${checked}>
              <span>${label}</span>
            </label>`;
        }).join('');
      }
    } catch (error) {
      optionsMarkup = '<p>Tidak dapat menampilkan pilihan.</p>';
    }

    return `
      <div class="question-block">
        <p><strong>${index + 1}.</strong> ${q.question_banks.question_text}</p>
        ${optionsMarkup || `<textarea name="question_${q.sequence}" placeholder="Jawaban...">${answerValue}</textarea>`}
      </div>`;
  }).join('');

  dashboardContent.innerHTML = `
    <div class="panel">
      <h3>Ujian: ${exam.title}</h3>
      <p>Token: ${exam.token}</p>
      <p>Waktu mulai: ${new Date(exam.start_time).toLocaleString()}</p>
      <p>Waktu selesai: ${new Date(exam.end_time).toLocaleString()}</p>
      <p>Waktu tersisa: <span id="examTimer">${running ? formatCountdown(remaining) : 'Berakhir'}</span></p>
    </div>
    <form id="examSubmitForm" class="panel simple-form">
      ${questionItems}
      <button class="btn btn-primary" type="submit" ${running ? '' : 'disabled'}>Submit Ujian</button>
      <div class="message" id="examSubmitMessage"></div>
    </form>`;

  const examTimer = document.getElementById('examTimer');
  const examSubmitMessage = document.getElementById('examSubmitMessage');
  let timerInterval;
  if (running) {
    timerInterval = setInterval(async () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        clearInterval(timerInterval);
        examTimer.textContent = 'Berakhir';
        showMessage(examSubmitMessage, 'Waktu ujian telah habis. Sistem akan melakukan submit otomatis.', false);
        if (exam.auto_submit) {
          await document.getElementById('examSubmitForm').requestSubmit();
        }
        return;
      }
      examTimer.textContent = formatCountdown(left);
    }, 1000);
  }

  const examForm = document.getElementById('examSubmitForm');
  const saveDraft = () => {
    const answers = {};
    displayQuestions.forEach((q) => {
      const checked = examForm.querySelector(`[name="question_${q.sequence}"]:checked`);
      if (checked) {
        answers[q.sequence] = checked.value;
        return;
      }
      const textarea = examForm.querySelector(`[name="question_${q.sequence}"]`);
      if (textarea) answers[q.sequence] = textarea.value;
    });
    saveExamDraft(exam.id, answers);
  };

  examForm.addEventListener('change', saveDraft);

  examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!running) {
      return showMessage(examSubmitMessage, 'Ujian sudah selesai atau token tidak aktif', false);
    }
    saveDraft();
    const answers = {};
    displayQuestions.forEach((q) => {
      const checked = examForm.querySelector(`[name="question_${q.sequence}"]:checked`);
      if (checked) {
        answers[q.sequence] = checked.value;
        return;
      }
      const textarea = examForm.querySelector(`[name="question_${q.sequence}"]`);
      answers[q.sequence] = textarea ? textarea.value : '';
    });
    const submitRes = await fetchApi(`/api/student/exams/${exam.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!submitRes.success) {
      return showMessage(examSubmitMessage, submitRes.message || 'Gagal submit ujian', false);
    }
    localStorage.removeItem(examDraftKey(exam.id));
    showMessage(examSubmitMessage, 'Ujian berhasil diserahkan', true);
  });
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = 'Sedang memproses...';
  const form = new FormData(loginForm);
  const body = {
    identifier: form.get('identifier'),
    password: form.get('password'),
    role: form.get('role'),
  };
  const result = await fetchApi('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
  if (!result.success) {
    return showMessage(loginMessage, result.message || 'Login gagal', false);
  }
  setSession(result.data.accessToken, result.data.refreshToken, result.data.user);
  loadDashboard();
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerMessage.textContent = 'Mendaftar...';
  const form = new FormData(registerForm);
  const body = {
    username: form.get('username'),
    email: form.get('email'),
    password: form.get('password'),
    school_npsn: form.get('npsn'),
  };
  const result = await fetchApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!result.success) {
    return showMessage(registerMessage, result.message || 'Gagal', false);
  }

  showMessage(registerMessage, 'Registrasi berhasil. Silakan login.');
});

forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  forgotMessage.textContent = 'Mengirim permintaan...';
  const form = new FormData(forgotForm);
  const result = await fetchApi('/api/auth/password-reset', { method: 'POST', body: JSON.stringify({ email: form.get('email') }) });
  if (!result.success) return showMessage(forgotMessage, result.message || 'Gagal', false);
  showMessage(forgotMessage, 'Permintaan reset dikirim. Cek email atau token.');
});

logoutButton.addEventListener('click', async () => {
  await fetchApi('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: getRefreshToken() }) });
  clearSession();
  showPage('login');
});

document.getElementById('showRegister').addEventListener('click', (e) => { e.preventDefault(); showPage('register'); });
document.getElementById('showForgot').addEventListener('click', (e) => { e.preventDefault(); showPage('forgot'); });
document.getElementById('showLoginFromRegister').addEventListener('click', (e) => { e.preventDefault(); showPage('login'); });
document.getElementById('showLoginFromForgot').addEventListener('click', (e) => { e.preventDefault(); showPage('login'); });

window.addEventListener('DOMContentLoaded', () => {
  if (getToken() && getUser()) {
    loadDashboard();
  } else {
    showPage('login');
  }
});
