-- Migration: enable RLS and add access policies for project_team
-- Apply this in Supabase SQL editor or via your migration workflow.

-- Enable Row Level Security if not already enabled
ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT team rows (so the UI can list members)
CREATE POLICY "select_project_team_authenticated"
ON public.project_team
FOR SELECT
TO authenticated
USING (true);

-- Allow inserting a team row if the user is inserting themselves OR they are the project creator
CREATE POLICY "insert_project_team_owner_or_self"
ON public.project_team
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.created_by = auth.uid()
  )
);

-- Allow updating a team row only by the user themselves or the project creator
CREATE POLICY "update_project_team_owner_or_project_creator"
ON public.project_team
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.created_by = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.created_by = auth.uid()
  )
);

-- Allow deleting a team member by the member themselves or the project creator
CREATE POLICY "delete_project_team_owner_or_project_creator"
ON public.project_team
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.created_by = auth.uid()
  )
);

-- NOTES:
-- 1) Review these policies in Supabase Dashboard after applying. They allow authenticated users to list members,
--    let users add themselves to a project team, and let project creators manage membership.
-- 2) If you prefer stricter rules (only project creators may add members), replace the INSERT policy WITH CHECK
--    by only checking that the project is created by auth.uid().
-- 3) If you add a unique constraint on (project_id, user_id), upserts will work as implemented in the client code.
