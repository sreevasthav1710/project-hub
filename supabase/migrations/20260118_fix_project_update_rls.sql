-- Fix RLS policies for project updates
-- This allows project creators to update their projects directly
-- and also fixes the is_project_member_or_creator function

-- First, fix the function to check project_team instead of project_members
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

-- Drop the existing update policy
DROP POLICY IF EXISTS "Members can update projects" ON public.projects;

-- Create a simpler policy that allows creators to update directly
-- This is more reliable than relying on the function
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
