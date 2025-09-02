-- Migration to add expires_at field to existing polls table
-- Run this in your Supabase SQL editor if you have an existing polls table

-- Add the expires_at column to the polls table
ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Optional: Set a comment to document this field
COMMENT ON COLUMN polls.expires_at IS 'Timestamp when the poll expires. NULL means no expiration.';
