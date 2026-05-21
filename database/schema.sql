-- =====================================================
-- siPENDIdikan_AI - Supabase PostgreSQL Schema
-- FIXED VERSION FOR SUPABASE
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

create extension if not exists "uuid-ossp";

-- =====================================================
-- CLEAN OLD OBJECTS (OPTIONAL)
-- =====================================================

drop table if exists refresh_tokens cascade;
drop table if exists activity_logs cascade;
drop table if exists api_keys cascade;
drop table if exists assignment_submissions cascade;
drop table if exists assignments cascade;
drop table if exists learning_modules cascade;
drop table if exists exam_results cascade;
drop table if exists exam_questions cascade;
drop table if exists exams cascade;
drop table if exists question_banks cascade;
drop table if exists ai_generation_logs cascade;
drop table if exists teacher_classes cascade;
drop table if exists teacher_subjects cascade;
drop table if exists students cascade;
drop table if exists classes cascade;
drop table if exists subjects cascade;
drop table if exists teachers cascade;
drop table if exists users cascade;
drop table if exists schools cascade;

drop function if exists update_modified_at cascade;
drop function if exists is_admin cascade;
drop function if exists same_school(uuid) cascade;

-- =====================================================
-- TABLES
-- =====================================================

-- Schools
create table schools (
  id uuid primary key default uuid_generate_v4(),
  school_name text not null,
  npsn text unique not null,
  principal_name text,
  principal_nip text,
  address text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users
-- IMPORTANT:
-- linked directly with auth.users
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'guru', 'siswa')),
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Teachers
create table teachers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  teacher_name text not null,
  teacher_nip text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Subjects
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  subject_name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Classes
create table classes (
  id uuid primary key default uuid_generate_v4(),
  class_name text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Students
create table students (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  student_name text not null,
  nisn text unique not null,
  password_hash text not null,
  class_id uuid references classes(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Teacher Subjects
create table teacher_subjects (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unique (teacher_id, subject_id)
);

-- Teacher Classes
create table teacher_classes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  unique (teacher_id, class_id)
);

-- Question Banks
create table question_banks (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references schools(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  class_id uuid references classes(id) on delete set null,

  question_type text not null,
  question_text text not null,
  options_json jsonb,
  answer_key text,
  explanation text,
  bloom_level text,
  image_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- A.I. usage logs
create table ai_generation_logs (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  prompt text,
  parameters jsonb,
  generated_count integer default 0,
  created_at timestamptz default now()
);

-- Exams
create table exams (
  id uuid primary key default uuid_generate_v4(),
  title text not null,

  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  package_id uuid references question_packages(id) on delete set null,

  token text unique not null,

  start_time timestamptz not null,
  end_time timestamptz not null,

  randomized boolean default true,
  randomize_options boolean default true,
  auto_submit boolean default false,
  show_realtime_score boolean default false,
  description text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Exam Questions
create table exam_questions (
  id uuid primary key default uuid_generate_v4(),

  exam_id uuid not null references exams(id) on delete cascade,
  question_bank_id uuid not null references question_banks(id) on delete cascade,

  sequence integer not null,

  unique (exam_id, sequence)
);

-- Exam Results
create table exam_results (
  id uuid primary key default uuid_generate_v4(),

  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,

  score numeric default 0 check (score >= 0 and score <= 100),

  answers jsonb,

  submitted_at timestamptz default now()
);

-- Learning Modules
create table learning_modules (
  id uuid primary key default uuid_generate_v4(),

  school_id uuid not null references schools(id) on delete cascade,

  title text not null,
  description text,
  file_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assignments
create table assignments (
  id uuid primary key default uuid_generate_v4(),

  school_id uuid not null references schools(id) on delete cascade,

  class_id uuid references classes(id) on delete set null,

  title text not null,
  description text,

  due_date timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Assignment Submissions
create table assignment_submissions (
  id uuid primary key default uuid_generate_v4(),

  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,

  file_path text,

  status text default 'pending'
    check (status in ('pending', 'reviewed', 'graded')),

  grade text,

  submitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- API Keys
create table api_keys (
  id uuid primary key default uuid_generate_v4(),

  name text not null,
  api_key text unique not null,

  active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity Logs
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),

  user_id uuid references users(id) on delete set null,

  action text not null,
  metadata jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Refresh Tokens
create table refresh_tokens (
  id uuid primary key default uuid_generate_v4(),

  token_id uuid not null,

  user_id uuid references users(id) on delete cascade,

  revoked boolean default false,

  expires_at timestamptz not null,

  created_at timestamptz default now()
);

-- =====================================================
-- INDEXES
-- =====================================================

create index idx_question_banks_school_subject
on question_banks(school_id, subject_id);

create index idx_exam_school_class
on exams(school_id, class_id);

create index idx_ai_generation_logs_teacher
on ai_generation_logs(teacher_id);

create index idx_students_school_class
on students(school_id, class_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at
create or replace function update_modified_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Check admin
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from users
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Same school checker
create or replace function same_school(target_school uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from users
    where id = auth.uid()
    and school_id = target_school
  );
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

create trigger trg_schools_updated_at
before update on schools
for each row execute function update_modified_at();

create trigger trg_users_updated_at
before update on users
for each row execute function update_modified_at();

create trigger trg_teachers_updated_at
before update on teachers
for each row execute function update_modified_at();

create trigger trg_subjects_updated_at
before update on subjects
for each row execute function update_modified_at();

create trigger trg_classes_updated_at
before update on classes
for each row execute function update_modified_at();

create trigger trg_students_updated_at
before update on students
for each row execute function update_modified_at();

create trigger trg_question_banks_updated_at
before update on question_banks
for each row execute function update_modified_at();

create trigger trg_exams_updated_at
before update on exams
for each row execute function update_modified_at();

create trigger trg_learning_modules_updated_at
before update on learning_modules
for each row execute function update_modified_at();

create trigger trg_assignments_updated_at
before update on assignments
for each row execute function update_modified_at();

create trigger trg_assignment_submissions_updated_at
before update on assignment_submissions
for each row execute function update_modified_at();

create trigger trg_api_keys_updated_at
before update on api_keys
for each row execute function update_modified_at();

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table schools enable row level security;
alter table users enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table question_banks enable row level security;
alter table exams enable row level security;
alter table exam_results enable row level security;
alter table learning_modules enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table api_keys enable row level security;
alter table activity_logs enable row level security;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Schools
create policy "schools_select"
on schools
for select
using (same_school(id));

-- Users
create policy "users_select"
on users
for select
using (
  auth.uid() = id
  OR is_admin()
);

create policy "users_insert"
on users
for insert
with check (
  is_admin()
);

create policy "users_update"
on users
for update
using (
  auth.uid() = id
  OR is_admin()
)
with check (
  auth.uid() = id
  OR is_admin()
);

create policy "users_delete"
on users
for delete
using (
  is_admin()
);

-- Teachers
create policy "teachers_select"
on teachers
for select
using (
  same_school(school_id)
);

create policy "teachers_insert"
on teachers
for insert
with check (
  is_admin()
);

create policy "teachers_update"
on teachers
for update
using (
  is_admin()
)
with check (
  is_admin()
);

create policy "teachers_delete"
on teachers
for delete
using (
  is_admin()
);

-- Students
create policy "students_select"
on students
for select
using (
  auth.uid() = id
  OR same_school(school_id)
);

create policy "students_insert"
on students
for insert
with check (
  is_admin()
);

create policy "students_update"
on students
for update
using (
  auth.uid() = id
  OR is_admin()
)
with check (
  auth.uid() = id
  OR is_admin()
);

create policy "students_delete"
on students
for delete
using (
  is_admin()
);

-- Question Banks
create policy "question_banks_select"
on question_banks
for select
using (
  same_school(school_id)
);

create policy "question_banks_insert"
on question_banks
for insert
with check (
  same_school(school_id)
);

create policy "question_banks_update"
on question_banks
for update
using (
  same_school(school_id)
)
with check (
  same_school(school_id)
);

create policy "question_banks_delete"
on question_banks
for delete
using (
  same_school(school_id)
);

-- Exams
create policy "exams_select"
on exams
for select
using (
  same_school(school_id)
);

create policy "exams_insert"
on exams
for insert
with check (
  same_school(school_id)
);

create policy "exams_update"
on exams
for update
using (
  same_school(school_id)
)
with check (
  same_school(school_id)
);

create policy "exams_delete"
on exams
for delete
using (
  same_school(school_id)
);

-- Exam Results
create policy "exam_results_select"
on exam_results
for select
using (
  student_id = auth.uid()
  OR is_admin()
);

create policy "exam_results_insert"
on exam_results
for insert
with check (
  student_id = auth.uid()
);

-- Learning Modules
create policy "learning_modules_select"
on learning_modules
for select
using (
  same_school(school_id)
);

create policy "learning_modules_insert"
on learning_modules
for insert
with check (
  same_school(school_id)
);

create policy "learning_modules_update"
on learning_modules
for update
using (
  same_school(school_id)
)
with check (
  same_school(school_id)
);

-- Assignments
create policy "assignments_select"
on assignments
for select
using (
  same_school(school_id)
);

create policy "assignments_insert"
on assignments
for insert
with check (
  same_school(school_id)
);

create policy "assignments_update"
on assignments
for update
using (
  same_school(school_id)
)
with check (
  same_school(school_id)
);

-- Assignment Submissions
create policy "assignment_submissions_select"
on assignment_submissions
for select
using (
  student_id = auth.uid()
  OR is_admin()
);

create policy "assignment_submissions_insert"
on assignment_submissions
for insert
with check (
  student_id = auth.uid()
);

-- API Keys
create policy "api_keys_all"
on api_keys
for all
using (
  is_admin()
)
with check (
  is_admin()
);

-- Activity Logs
create policy "activity_logs_insert"
on activity_logs
for insert
with check (
  auth.uid() is not null
);

create policy "activity_logs_select"
on activity_logs
for select
using (
  is_admin()
);

-- =====================================================
-- SEED DATA
-- =====================================================

insert into schools (
  id,
  school_name,
  npsn,
  principal_name,
  principal_nip,
  address,
  phone
)
values (
  '11111111-1111-1111-1111-111111111111',
  'siPENDIdikan AI Center',
  '00000000',
  'Admin Head',
  '0000000000',
  'Wilayah Pusat',
  '081234567890'
)
on conflict (npsn) do nothing;

-- =====================================================
-- FINISHED
-- =====================================================