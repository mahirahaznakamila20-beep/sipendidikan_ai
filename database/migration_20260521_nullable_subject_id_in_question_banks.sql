-- Migration: Allow nullable subject_id for imported question bank entries
-- Run this SQL against your Postgres/Supabase database

BEGIN;

ALTER TABLE IF EXISTS question_banks
  ALTER COLUMN subject_id DROP NOT NULL;

COMMIT;
