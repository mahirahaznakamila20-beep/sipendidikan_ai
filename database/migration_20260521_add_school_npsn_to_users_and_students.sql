-- Migration: add school_npsn to users and students
BEGIN;

-- add nullable text column to hold school's NPSN on user/student rows
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_npsn text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_npsn text;

-- populate from schools table
UPDATE users u
SET school_npsn = s.npsn
FROM schools s
WHERE u.school_id = s.id AND (u.school_npsn IS NULL OR u.school_npsn = '');

UPDATE students st
SET school_npsn = s.npsn
FROM schools s
WHERE st.school_id = s.id AND (st.school_npsn IS NULL OR st.school_npsn = '');

-- add indexes to speed up lookups by npsn
CREATE INDEX IF NOT EXISTS idx_users_school_npsn ON users (school_npsn);
CREATE INDEX IF NOT EXISTS idx_students_school_npsn ON students (school_npsn);

COMMIT;
