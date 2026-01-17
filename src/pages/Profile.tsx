import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserStats } from '@/types/database';
import BackButton from '@/components/BackButton';
import { User, FolderKanban, Trophy, CheckCircle, Clock, XCircle, Crown, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const { data: profileData } = await supabase.from('profiles').select('full_name, email').eq('id', user!.id).maybeSingle();
    setProfile(profileData);

    const { data: projects } = await supabase.from('projects').select('id, status, created_by');
    const { data: projectMembers } = await supabase.from('project_members').select('project_id, is_lead').eq('user_id', user!.id);
    const { data: hackathons } = await supabase.from('hackathons').select('id, created_by');
    const { data: hackathonMembers } = await supabase.from('hackathon_members').select('hackathon_id, is_lead').eq('user_id', user!.id);

    const myProjectIds = new Set([
      ...(projects || []).filter(p => p.created_by === user!.id).map(p => p.id),
      ...(projectMembers || []).map(m => m.project_id)
    ]);
    const myProjects = (projects || []).filter(p => myProjectIds.has(p.id));
    const projectsLed = myProjects.filter(p => p.created_by === user!.id || (projectMembers || []).some(m => m.project_id === p.id && m.is_lead)).length;

    const myHackathonIds = new Set([
      ...(hackathons || []).filter(h => h.created_by === user!.id).map(h => h.id),
      ...(hackathonMembers || []).map(m => m.hackathon_id)
    ]);
    const hackathonsLed = (hackathons || []).filter(h => myHackathonIds.has(h.id) && (h.created_by === user!.id || (hackathonMembers || []).some(m => m.hackathon_id === h.id && m.is_lead))).length;

    setStats({
      totalProjects: myProjects.length,
      completedProjects: myProjects.filter(p => p.status === 'completed').length,
      inProgressProjects: myProjects.filter(p => p.status === 'in_progress').length,
      abortedProjects: myProjects.filter(p => p.status === 'aborted').length,
      projectsLed,
      totalHackathons: myHackathonIds.size,
      hackathonsLed,
    });
    setLoading(false);
  };

  const generatePDF = async () => {
    if (!profile || !stats) return;
    setGenerating(true);
    
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ProjectHub - User Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${profile.full_name}`, 20, 35);
    doc.text(`Email: ${profile.email}`, 20, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
    
    doc.setFontSize(16);
    doc.text('Statistics', 20, 75);
    doc.setFontSize(12);
    doc.text(`Total Projects: ${stats.totalProjects}`, 20, 90);
    doc.text(`  - Completed: ${stats.completedProjects}`, 25, 100);
    doc.text(`  - In Progress: ${stats.inProgressProjects}`, 25, 110);
    doc.text(`  - Aborted: ${stats.abortedProjects}`, 25, 120);
    doc.text(`Projects Led: ${stats.projectsLed}`, 20, 135);
    doc.text(`Total Hackathons: ${stats.totalHackathons}`, 20, 150);
    doc.text(`Hackathons Led: ${stats.hackathonsLed}`, 20, 160);

    doc.save(`${profile.full_name.replace(/\s+/g, '_')}_report.pdf`);
    setGenerating(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8">
      <BackButton to="/dashboard" label="Dashboard" />
      
      <div className="glass-panel rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center"><User className="w-10 h-10 text-primary" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name || 'User'}</h1>
            <p className="text-muted-foreground">{profile?.email}</p>
          </div>
          <button onClick={generatePDF} disabled={generating} className="btn-primary">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileDown className="w-5 h-5" /> Download Report</>}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Your Statistics</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card"><FolderKanban className="w-8 h-8 text-primary mb-3" /><p className="text-3xl font-bold">{stats?.totalProjects}</p><p className="text-muted-foreground text-sm">Total Projects</p></div>
        <div className="stat-card"><Trophy className="w-8 h-8 text-accent mb-3" /><p className="text-3xl font-bold">{stats?.totalHackathons}</p><p className="text-muted-foreground text-sm">Hackathons</p></div>
        <div className="stat-card"><Crown className="w-8 h-8 text-warning mb-3" /><p className="text-3xl font-bold">{stats?.projectsLed}</p><p className="text-muted-foreground text-sm">Projects Led</p></div>
        <div className="stat-card"><Crown className="w-8 h-8 text-warning mb-3" /><p className="text-3xl font-bold">{stats?.hackathonsLed}</p><p className="text-muted-foreground text-sm">Hackathons Led</p></div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Project Breakdown</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="stat-card"><CheckCircle className="w-6 h-6 text-success mb-2" /><p className="text-2xl font-bold">{stats?.completedProjects}</p><p className="text-muted-foreground text-sm">Completed</p></div>
        <div className="stat-card"><Clock className="w-6 h-6 text-primary mb-2" /><p className="text-2xl font-bold">{stats?.inProgressProjects}</p><p className="text-muted-foreground text-sm">In Progress</p></div>
        <div className="stat-card"><XCircle className="w-6 h-6 text-destructive mb-2" /><p className="text-2xl font-bold">{stats?.abortedProjects}</p><p className="text-muted-foreground text-sm">Aborted</p></div>
      </div>
    </div>
  );
}
