-- Migration: AI Generator and Modern Exam Support

alter table question_banks
  add column if not exists image_url text;

alter table exams
  add column if not exists randomize_options boolean default true,
  add column if not exists auto_submit boolean default false,
  add column if not exists show_realtime_score boolean default false,
  add column if not exists description text;

create table if not exists ai_generation_logs (
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

create index if not exists idx_ai_generation_logs_teacher
  on ai_generation_logs(teacher_id);
