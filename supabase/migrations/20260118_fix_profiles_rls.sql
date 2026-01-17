-- Fix RLS policies for profiles table to ensure all authenticated users can see all profiles
-- This is needed for the team member dropdown to show all registered users

-- Drop any existing SELECT policies that might be restrictive
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_profiles_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "select_profiles_authenticated_users" ON public.profiles;

-- Create a single, clear policy that allows all authenticated users to view all profiles
CREATE POLICY "authenticated_users_can_view_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
