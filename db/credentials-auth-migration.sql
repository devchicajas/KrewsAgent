-- Open-source credentials auth (bcrypt passwords in users table)
-- Run in Supabase SQL Editor after schema.sql

alter table users add column if not exists password_hash text;
