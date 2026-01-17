export type ProjectStatus = 'completed' | 'in_progress' | 'aborted';
export type HackathonStatus = 'upcoming' | 'ongoing' | 'completed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  short_description: string | null;
  problem_statement: string | null;
  solution_description: string | null;
  tech_stack: string[];
  github_url: string | null;
  deployed_url: string | null;
  download_url: string | null;
  qr_code_url: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  is_lead: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Hackathon {
  id: string;
  title: string;
  short_description: string | null;
  problem_statement: string | null;
  solution_description: string | null;
  tech_stack: string[];
  github_url: string | null;
  deployed_url: string | null;
  download_url: string | null;
  qr_code_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: HackathonStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HackathonMember {
  id: string;
  hackathon_id: string;
  user_id: string;
  role: string;
  is_lead: boolean;
  created_at: string;
  profile?: Profile;
}

export interface HackathonProject {
  id: string;
  hackathon_id: string;
  project_id: string;
  created_at: string;
  project?: Project;
}

export interface UserStats {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  abortedProjects: number;
  projectsLed: number;
  totalHackathons: number;
  hackathonsLed: number;
}
