-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project status enum
CREATE TYPE public.project_status AS ENUM ('completed', 'in_progress', 'aborted');

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    short_description TEXT,
    problem_statement TEXT,
    solution_description TEXT,
    tech_stack TEXT[] DEFAULT '{}',
    github_url TEXT,
    deployed_url TEXT,
    download_url TEXT,
    qr_code_url TEXT,
    status project_status NOT NULL DEFAULT 'in_progress',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_members table for team management
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member',
    is_lead BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Create hackathon status enum
CREATE TYPE public.hackathon_status AS ENUM ('upcoming', 'ongoing', 'completed');

-- Create hackathons table
CREATE TABLE public.hackathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    short_description TEXT,
    problem_statement TEXT,
    solution_description TEXT,
    tech_stack TEXT[] DEFAULT '{}',
    github_url TEXT,
    deployed_url TEXT,
    download_url TEXT,
    qr_code_url TEXT,
    start_date DATE,
    end_date DATE,
    status hackathon_status NOT NULL DEFAULT 'upcoming',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hackathon_members table for team management
CREATE TABLE public.hackathon_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member',
    is_lead BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(hackathon_id, user_id)
);

-- Create hackathon_projects junction table
CREATE TABLE public.hackathon_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(hackathon_id, project_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_projects ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is project member or creator
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
        SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = auth.uid()
    )
$$;

-- Helper function: check if user is hackathon member or creator
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

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Projects policies
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_project_member_or_creator(id));
CREATE POLICY "Creators can delete projects" ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Project members policies
CREATE POLICY "Anyone can view project members" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Project creators/members can add members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (public.is_project_member_or_creator(project_id));
CREATE POLICY "Project creators/members can update members" ON public.project_members FOR UPDATE TO authenticated USING (public.is_project_member_or_creator(project_id));
CREATE POLICY "Project creators/members can remove members" ON public.project_members FOR DELETE TO authenticated USING (public.is_project_member_or_creator(project_id));

-- Hackathons policies
CREATE POLICY "Anyone can view hackathons" ON public.hackathons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create hackathons" ON public.hackathons FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members can update hackathons" ON public.hackathons FOR UPDATE TO authenticated USING (public.is_hackathon_member_or_creator(id));
CREATE POLICY "Creators can delete hackathons" ON public.hackathons FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Hackathon members policies
CREATE POLICY "Anyone can view hackathon members" ON public.hackathon_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hackathon creators/members can add members" ON public.hackathon_members FOR INSERT TO authenticated WITH CHECK (public.is_hackathon_member_or_creator(hackathon_id));
CREATE POLICY "Hackathon creators/members can update members" ON public.hackathon_members FOR UPDATE TO authenticated USING (public.is_hackathon_member_or_creator(hackathon_id));
CREATE POLICY "Hackathon creators/members can remove members" ON public.hackathon_members FOR DELETE TO authenticated USING (public.is_hackathon_member_or_creator(hackathon_id));

-- Hackathon projects policies
CREATE POLICY "Anyone can view hackathon projects" ON public.hackathon_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hackathon members can link projects" ON public.hackathon_projects FOR INSERT TO authenticated WITH CHECK (public.is_hackathon_member_or_creator(hackathon_id));
CREATE POLICY "Hackathon members can unlink projects" ON public.hackathon_projects FOR DELETE TO authenticated USING (public.is_hackathon_member_or_creator(hackathon_id));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_hackathons_updated_at BEFORE UPDATE ON public.hackathons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();