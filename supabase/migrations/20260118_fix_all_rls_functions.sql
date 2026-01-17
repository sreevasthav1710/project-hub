-- Fix all RLS functions to use the correct table names
-- This fixes the issue where updates return 0 rows due to RLS blocking

-- Fix is_project_member_or_creator to check project_team instead of project_members
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

-- Verify the function works by testing it (optional, can be removed)
-- SELECT public.is_project_member_or_creator('some-project-id-here');
