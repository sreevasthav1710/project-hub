-- Comprehensive fix for RLS policies to allow project and hackathon updates
-- Run this in your Supabase SQL Editor

-- ============================================
-- Fix Projects RLS
-- ============================================

-- Fix the function to check project_team instead of project_members
CREATE OR REPLACE FUNCTION public.is_project_member_or_creator(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects WHERE id = p_project_id AND created_by = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_team WHERE project_id = p_project_id AND user_id = auth.uid()
    )
$$;

-- Drop existing update policies
DROP POLICY IF EXISTS "Members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can update projects" ON public.projects;

-- Create a simpler policy that allows creators to update directly
CREATE POLICY "Creators can update their projects" 
ON public.projects 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid());

-- Also allow team members to update (using the fixed function)
CREATE POLICY "Team members can update projects" 
ON public.projects 
FOR UPDATE 
TO authenticated 
USING (public.is_project_member_or_creator(id));

-- ============================================
-- Fix Hackathons RLS (same pattern)
-- ============================================

-- The is_hackathon_member_or_creator function should already be correct
-- but let's make sure it's working
CREATE OR REPLACE FUNCTION public.is_hackathon_member_or_creator(p_hackathon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.hackathons WHERE id = p_hackathon_id AND created_by = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.hackathon_members WHERE hackathon_id = p_hackathon_id AND user_id = auth.uid()
    )
$$;

-- Drop existing update policies for hackathons
DROP POLICY IF EXISTS "Members can update hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Creators can update their hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Team members can update hackathons" ON public.hackathons;

-- Create a simpler policy that allows creators to update directly
CREATE POLICY "Creators can update their hackathons" 
ON public.hackathons 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid());

-- Also allow team members to update (using the function)
CREATE POLICY "Team members can update hackathons" 
ON public.hackathons 
FOR UPDATE 
TO authenticated 
USING (public.is_hackathon_member_or_creator(id));
