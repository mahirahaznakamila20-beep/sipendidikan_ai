-- Migration: Add password_hash columns to users and students tables
-- Run this SQL against your Postgres/Supabase database

BEGIN;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_hash text not null DEFAULT '';

ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS password_hash text not null DEFAULT '';

COMMIT;
