-- Migration: Add package_id to exams
-- Run this SQL against your Postgres/Supabase database

BEGIN;

ALTER TABLE IF EXISTS exams
  ADD COLUMN IF NOT EXISTS package_id uuid;

-- Optionally add a foreign key constraint if your database schema supports it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_exams_package'
      AND t.relname = 'exams'
  ) THEN
    EXECUTE 'ALTER TABLE exams ADD CONSTRAINT fk_exams_package FOREIGN KEY (package_id) REFERENCES question_packages(id)';
  END IF;
END$$;

COMMIT;
