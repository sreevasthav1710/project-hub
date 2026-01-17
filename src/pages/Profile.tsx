import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserStats } from '@/types/database';
import BackButton from '@/components/BackButton';
import ConfirmDialog from '@/components/ConfirmDialog';
import { User, FolderKanban, Trophy, CheckCircle, Clock, XCircle, Crown, FileDown, Loader2, Trash2, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  
  const fetchData = useCallback(async () => {
    const { data: profileData } = await supabase.from('profiles').select('full_name, email').eq('id', user!.id).maybeSingle();
    setProfile(profileData);

    const { data: projects } = await supabase.from('projects').select('id, status, created_by');
    const { data: projectMembers } = await supabase.from('project_team').select('project_id, role').eq('user_id', user!.id);
    const { data: hackathons } = await supabase.from('hackathons').select('id, status, created_by');
    const { data: hackathonMembers } = await supabase.from('hackathon_members').select('hackathon_id, role').eq('user_id', user!.id);

    const myProjectIds = new Set([
      ...(projects || []).filter(p => p.created_by === user!.id).map(p => p.id),
      ...(projectMembers || []).map(m => m.project_id)
    ]);
    const myProjects = (projects || []).filter(p => myProjectIds.has(p.id));
    const projectsLed = projectMembers?.filter(m => m.role === 'Team Lead').length || 0;

    const myHackathonIds = new Set([
      ...(hackathons || []).filter(h => h.created_by === user!.id).map(h => h.id),
      ...(hackathonMembers || []).map(m => m.hackathon_id)
    ]);
    const myHackathons = (hackathons || []).filter(h => myHackathonIds.has(h.id));
    const hackathonsLed = hackathonMembers?.filter(m => m.role === 'Team Lead').length || 0;

    setStats({
      totalProjects: myProjects.length,
      completedProjects: myProjects.filter(p => p.status === 'completed').length,
      inProgressProjects: myProjects.filter(p => p.status === 'in_progress').length,
      abortedProjects: myProjects.filter(p => p.status === 'aborted').length,
      projectsLed,
      totalHackathons: myHackathonIds.size,
      hackathonsLed,
      upcomingHackathons: myHackathons.filter(h => h.status === 'upcoming').length,
      ongoingHackathons: myHackathons.filter(h => h.status === 'ongoing').length,
      completedHackathons: myHackathons.filter(h => h.status === 'completed').length,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

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
    doc.text(`  - Upcoming: ${stats.upcomingHackathons}`, 25, 160);
    doc.text(`  - Ongoing: ${stats.ongoingHackathons}`, 25, 170);
    doc.text(`  - Completed: ${stats.completedHackathons}`, 25, 180);
    doc.text(`Hackathons Led: ${stats.hackathonsLed}`, 20, 195);

    doc.save(`${profile.full_name.replace(/\s+/g, '_')}_report.pdf`);
    setGenerating(false);
  };

  const handleFirstConfirm = () => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(true);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setShowSecondConfirm(false);

    try {
      // Note: This requires admin privileges or a serverless function
      // For now, we'll use the auth admin API endpoint if available
      // The CASCADE in the database will automatically delete related records
      
      // Delete from profiles table first (this will cascade from auth.users if we delete from there)
      // Since we can't directly delete from auth.users on the client side,
      // we'll need to call a database function or use admin API
      
      // Try to delete using admin API (requires service role key in serverless function)
      // For client-side, we can sign out and redirect, but actual deletion needs backend
      
      // Alternative: Sign out and redirect with a message
      // The account deletion would need to be handled via a serverless function or admin panel
      
      // For demonstration, we'll delete the profile and sign out
      // In production, you should create a serverless function that uses the admin API
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        alert('Error deleting account. Please contact support.');
        setDeleting(false);
        return;
      }

      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to home
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting your account. Please try again or contact support.');
      setDeleting(false);
    }
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
          <div className="flex gap-3">
            <button onClick={generatePDF} disabled={generating} className="btn-primary">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileDown className="w-5 h-5" /> Download Report</>}
            </button>
            
          </div>
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
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card"><CheckCircle className="w-6 h-6 text-success mb-2" /><p className="text-2xl font-bold">{stats?.completedProjects}</p><p className="text-muted-foreground text-sm">Completed</p></div>
        <div className="stat-card"><Clock className="w-6 h-6 text-primary mb-2" /><p className="text-2xl font-bold">{stats?.inProgressProjects}</p><p className="text-muted-foreground text-sm">In Progress</p></div>
        <div className="stat-card"><XCircle className="w-6 h-6 text-destructive mb-2" /><p className="text-2xl font-bold">{stats?.abortedProjects}</p><p className="text-muted-foreground text-sm">Aborted</p></div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Hackathon Breakdown</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="stat-card"><Calendar className="w-6 h-6 text-warning mb-2" /><p className="text-2xl font-bold">{stats?.upcomingHackathons}</p><p className="text-muted-foreground text-sm">Upcoming</p></div>
        <div className="stat-card"><Clock className="w-6 h-6 text-primary mb-2" /><p className="text-2xl font-bold">{stats?.ongoingHackathons}</p><p className="text-muted-foreground text-sm">Ongoing</p></div>
        <div className="stat-card"><CheckCircle className="w-6 h-6 text-success mb-2" /><p className="text-2xl font-bold">{stats?.completedHackathons}</p><p className="text-muted-foreground text-sm">Completed</p></div>
      </div>

      
    </div>
  );
}
