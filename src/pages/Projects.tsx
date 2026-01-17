import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectStatus, Profile } from '@/types/database';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import TechStack from '@/components/TechStack';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { Plus, FolderKanban, Pencil, Trash2, ExternalLink, Github, Loader2, X, Globe } from 'lucide-react';

const ALLOWED_ROLES = ['Team Lead', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Designer', 'Other'];


export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    problem_statement: '',
    solution_description: '',
    tech_stack: '',
    github_url: '',
    deployed_url: '',
    download_url: '',
    status: 'in_progress' as ProjectStatus,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    // Fetch all projects
    const { data: allProjects } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    
    // Fetch project memberships for the current user
    const { data: userMemberships } = await supabase
      .from('project_team')
      .select('project_id')
      .eq('user_id', user.id);
    
    const userProjectIds = new Set<string>();
    
    // Add projects where user is the creator
    (allProjects || []).forEach(p => {
      if (p.created_by === user.id) {
        userProjectIds.add(p.id);
      }
    });
    
    // Add projects where user is a team member
    (userMemberships || []).forEach(m => {
      userProjectIds.add(m.project_id);
    });
    
    // Filter projects to only show those the user is associated with
    const filteredProjects = (allProjects || []).filter(p => userProjectIds.has(p.id));
    
    setProjects((filteredProjects as Project[]) || []);
    setLoading(false);
  }, [user]);


  const resetForm = () => {
    setForm({ title: '', short_description: '', problem_statement: '', solution_description: '', tech_stack: '', github_url: '', deployed_url: '', download_url: '', status: 'in_progress' });
    setEditingProject(null);
  };

  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };
  
  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      short_description: project.short_description || '',
      problem_statement: project.problem_statement || '',
      solution_description: project.solution_description || '',
      tech_stack: project.tech_stack.join(', '),
      github_url: project.github_url || '',
      deployed_url: project.deployed_url || '',
      download_url: project.download_url || '',
      status: project.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const projectData = {
        title: form.title,
        short_description: form.short_description || null,
        problem_statement: form.problem_statement || null,
        solution_description: form.solution_description || null,
        tech_stack: form.tech_stack.split(',').map(t => t.trim()).filter(Boolean),
        github_url: form.github_url || null,
        deployed_url: form.deployed_url || null,
        download_url: form.download_url || null,
        status: form.status,
      };

      if (editingProject) {
        const { error } = await supabase.from('projects').update(projectData).eq('id', editingProject.id);
        if (error) {
          console.error('Error updating project:', error);
          alert(`Failed to update project: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase.from('projects').insert({ ...projectData, created_by: user!.id }).select().single();
        if (error) {
          console.error('Error creating project:', error);
          alert(`Failed to create project: ${error.message}`);
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err);
      alert('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProject) return;
    setDeleting(true);
    await supabase.from('projects').delete().eq('id', deleteProject.id);
    setDeleting(false);
    setDeleteProject(null);
    fetchProjects();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <BackButton to="/dashboard" label="Dashboard" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your development projects</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban className="w-10 h-10" />} title="No projects yet" description="Create your first project to get started" action={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-5 h-5" /> Create Project</button>} />
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{project.title}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  {project.problem_statement && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {project.problem_statement}
                    </p>
                  )}

                  {project.tech_stack.length > 0 && <TechStack technologies={project.tech_stack} />}
                </div>
                <div className="flex items-center gap-2">
                  {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="btn-icon"><Github className="w-5 h-5" /></a>}
                  {project.deployed_url && <a href={project.deployed_url} target="_blank" rel="noopener noreferrer" className="btn-icon"><Globe className="w-5 h-5" /></a>}
                  <button onClick={() => navigate(`/projects/${project.id}`)} className="btn-icon"><ExternalLink className="w-5 h-5" /></button>
                  <button onClick={() => openEditModal(project)} className="btn-icon"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => setDeleteProject(project)} className="btn-icon text-destructive"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Edit Project' : 'New Project'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium text-muted-foreground">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field mt-1" required /></div>
          <div><label className="text-sm font-medium text-muted-foreground">Short Description</label><textarea value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="input-field mt-1" rows={2} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Problem Statement</label><textarea value={form.problem_statement} onChange={(e) => setForm({ ...form, problem_statement: e.target.value })} className="input-field mt-1" rows={3} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Solution Description</label><textarea value={form.solution_description} onChange={(e) => setForm({ ...form, solution_description: e.target.value })} className="input-field mt-1" rows={3} /></div>
          </div>
          <div><label className="text-sm font-medium text-muted-foreground">Tech Stack (comma separated)</label><input value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} className="input-field mt-1" placeholder="React, TypeScript, Node.js" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">GitHub URL</label><input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} className="input-field mt-1" type="url" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Deployed URL</label><input value={form.deployed_url} onChange={(e) => setForm({ ...form, deployed_url: e.target.value })} className="input-field mt-1" type="url" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Download URL</label><input value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value })} className="input-field mt-1" type="url" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })} className="input-field mt-1"><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="aborted">Aborted</option></select></div>
          </div>


          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProject ? 'Save Changes' : 'Create Project'}</button></div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteProject} onClose={() => setDeleteProject(null)} onConfirm={handleDelete} title="Delete Project" message={`Are you sure you want to delete "${deleteProject?.title}"? This action cannot be undone.`} loading={deleting} />
    </div>
  );
}
