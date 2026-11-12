-- Migration to create the processing_jobs table for asynchronous Lambda/SQS execution
-- Run this in your Supabase SQL Editor (freakyfit schema)

CREATE TABLE IF NOT EXISTS freakyfit.processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'active' | 'completed' | 'failed'
    result JSONB DEFAULT NULL,
    error JSONB DEFAULT NULL,
    failed_reason TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast user and id lookups
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON freakyfit.processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_state ON freakyfit.processing_jobs(state);

-- Enable Row Level Security (RLS) if required by your Supabase setup
ALTER TABLE freakyfit.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access on processing_jobs"
ON freakyfit.processing_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view their own jobs
CREATE POLICY "Allow users to view their own jobs"
ON freakyfit.processing_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

