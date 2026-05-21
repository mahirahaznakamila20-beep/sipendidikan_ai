-- Migration: Add question_packages table and points + package_id to question_banks
-- Run this SQL against your Postgres/Supabase database

BEGIN;

-- Create packages table
CREATE TABLE IF NOT EXISTS question_packages (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  subject_id uuid,
  class_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Add package_id and points to question_banks
ALTER TABLE IF EXISTS question_banks
  ADD COLUMN IF NOT EXISTS package_id uuid;

ALTER TABLE IF EXISTS question_banks
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 1;

-- Optionally add foreign key constraints (uncomment if appropriate for your setup)
-- ALTER TABLE question_banks ADD CONSTRAINT fk_package FOREIGN KEY (package_id) REFERENCES question_packages(id);

COMMIT;
