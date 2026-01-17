-- Migration: allow authenticated users to select profiles (so team dropdown can list users)
-- Run this in Supabase SQL editor or as a migration

-- Enable Row Level Security if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select profiles
CREATE POLICY "select_profiles_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- If you prefer only project creators to add team members, create appropriate policies on project_team separately.
