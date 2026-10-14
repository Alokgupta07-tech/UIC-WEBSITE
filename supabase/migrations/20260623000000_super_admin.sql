-- ============================================================
-- STEP 1: Add 'super_admin' to the app_role enum
-- Run this FIRST, then run 20260623000001_super_admin_step2.sql
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
