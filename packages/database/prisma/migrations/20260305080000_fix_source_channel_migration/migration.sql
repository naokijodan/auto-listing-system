-- Fix: Previous migration 20260301035518 was recorded as applied
-- but the DDL statements may have failed silently.
-- This migration safely re-applies the missing changes using IF NOT EXISTS.

-- Add sourceChannel column if it doesn't exist
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sourceChannel" TEXT;
