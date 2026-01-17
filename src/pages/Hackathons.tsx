import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Hackathon, HackathonStatus } from '@/types/database';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import TechStack from '@/components/TechStack';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { Plus, Trophy, Pencil, Trash2, ExternalLink, Calendar, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Profile } from '@/types/database';

const ALLOWED_ROLES = ['Team Lead', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Designer', 'Other'];

interface TeamMemberForm {
  user_id: string;
  role: string;
}

export default function Hackathons() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [deleteHackathon, setDeleteHackathon] = useState<Hackathon | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    problem_statement: '',
    solution_description: '',
    github_url: '',
    deployed_url: '',
    tech_stack: '',
    start_date: '',
    end_date: '',
    status: 'upcoming' as HackathonStatus,
  });
  
  const [teamMembers, setTeamMembers] = useState<TeamMemberForm[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  const fetchAllUsers = useCallback(async () => {
    try {
      console.log('Fetching all users from profiles table...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching profiles:', error);
        setAllUsers([]);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No profiles found in database');
        setAllUsers([]);
        return;
      }

      let users = (data || []) as Profile[];
      console.log(`Fetched ${users.length} users from profiles table`);
      
      if (user && !users.find(u => u.id === user.id)) {
        const { data: me, error: meError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (meError) {
          console.error('Error fetching current user profile:', meError);
        }
        if (me) {
          users = [me as Profile, ...users];
        }
      }
      
      setAllUsers(users);
    } catch (err) {
      console.error('Unexpected error fetching all users:', err);
      setAllUsers([]);
    }
  }, [user]);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  
  useEffect(() => {
    if (user) {
      fetchHackathons();
      fetchAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchAllUsers]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('hackathons_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathons' }, () => {
        fetchHackathons();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchHackathons = useCallback(async () => {
    if (!user) return;
    
    // Fetch all hackathons
    const { data: allHackathons } = await supabase.from('hackathons').select('*').order('start_date', { ascending: false });
    
    // Fetch hackathon memberships for the current user
    // Handle gracefully if hackathon_members table doesn't exist
    let userMemberships: any[] | null = null;
    try {
      const { data, error: membersError } = await supabase
        .from('hackathon_members')
        .select('hackathon_id')
        .eq('user_id', user.id);
      
      if (membersError) {
        // If table doesn't exist, just continue without filtering
        if (membersError.code === 'PGRST205' || membersError.message?.includes('Could not find the table')) {
          console.warn('hackathon_members table not found, showing all hackathons');
        } else {
          console.error('Error fetching hackathon memberships:', membersError);
        }
      } else {
        userMemberships = data;
      }
    } catch (err) {
      console.warn('Error accessing hackathon_members table:', err);
    }
    
    const userHackathonIds = new Set<string>();
    
    // Add hackathons where user is the creator
    (allHackathons || []).forEach(h => {
      if (h.created_by === user.id) {
        userHackathonIds.add(h.id);
      }
    });
    
    // Add hackathons where user is a team member
    (userMemberships || []).forEach(m => {
      userHackathonIds.add(m.hackathon_id);
    });
    
    // Filter hackathons to only show those the user is associated with
    const filteredHackathons = (allHackathons || []).filter(h => userHackathonIds.has(h.id));
    
    setHackathons((filteredHackathons as Hackathon[]) || []);
    setLoading(false);
  }, [user]);


  const resetForm = () => { 
    setForm({ title: '', short_description: '', problem_statement: '', solution_description: '', github_url: '', deployed_url: '', tech_stack: '', start_date: '', end_date: '', status: 'upcoming' }); 
    setTeamMembers([]);
    setEditingHackathon(null); 
  };
  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };
  
  const openEditModal = (h: Hackathon) => {
    setEditingHackathon(h);
    setForm({
      title: h.title,
      short_description: h.short_description || '',
      problem_statement: h.problem_statement || '',
      solution_description: h.solution_description || '',
      github_url: h.github_url || '',
      deployed_url: h.deployed_url || '',
      tech_stack: h.tech_stack.join(', '),
      start_date: h.start_date || '',
      end_date: h.end_date || '',
      status: h.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const leadCount = teamMembers.filter(m => m.role === 'Team Lead').length;
    if (leadCount > 1) {
      alert('A hackathon can only have one Team Lead. Please select only one Team Lead.');
      return;
    }

    setSaving(true);
    try {
      // Include all fields that should exist after migration
      const data: any = {
        title: form.title,
        short_description: form.short_description || null,
        problem_statement: form.problem_statement || null,
        solution_description: form.solution_description || null,
        github_url: form.github_url || null,
        deployed_url: form.deployed_url || null,
        tech_stack: form.tech_stack.split(',').map(t => t.trim()).filter(Boolean),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
      };
      
      
      if (editingHackathon) {
        const { error } = await supabase.from('hackathons').update(data).eq('id', editingHackathon.id);
        if (error) {
          console.error('Error updating hackathon:', error);
          alert(`Failed to update hackathon: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { data: newHackathon, error } = await supabase
          .from('hackathons')
          .insert({ ...data, created_by: user!.id })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating hackathon:', error);
          alert(`Failed to create hackathon: ${error.message}`);
          setSaving(false);
          return;
        }

        // Add team members if any (only if hackathon_members table exists)
        if (newHackathon && teamMembers.length > 0) {
          try {
            const { error: membersError } = await supabase.from('hackathon_members').insert(
              teamMembers.map(m => ({
                hackathon_id: newHackathon.id,
                user_id: m.user_id,
                role: m.role,
                is_lead: m.role === 'Team Lead',
              }))
            );
            
            if (membersError) {
              // If table doesn't exist, just warn but don't fail
              if (membersError.code === 'PGRST205' || membersError.message?.includes('Could not find the table')) {
                console.warn('hackathon_members table not found, skipping team member insertion');
              } else {
                console.error('Error adding team members:', membersError);
                alert(`Hackathon created but failed to add some team members: ${membersError.message}`);
              }
            }
          } catch (err) {
            console.warn('Error accessing hackathon_members table for insertion:', err);
          }
        }
      }
      
      setSaving(false);
      setIsModalOpen(false);
      resetForm();
      fetchHackathons();
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err);
      alert('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { user_id: '', role: 'Frontend Developer' }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: 'user_id' | 'role', value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const getAvailableUsers = (currentMemberIndex: number) => {
    const usedUserIds = teamMembers
      .map((m, i) => i !== currentMemberIndex ? m.user_id : null)
      .filter(Boolean) as string[];
    return allUsers.filter(u => !usedUserIds.includes(u.id));
  };

  const handleDelete = async () => { if (!deleteHackathon) return; setDeleting(true); await supabase.from('hackathons').delete().eq('id', deleteHackathon.id); setDeleting(false); setDeleteHackathon(null); fetchHackathons(); };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <BackButton to="/dashboard" label="Dashboard" />
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0"><h1 className="page-title">Hackathons</h1><p className="page-subtitle">Track your hackathon participations</p></div>
        <button onClick={openCreateModal} className="btn-primary"><Plus className="w-5 h-5" /> New Hackathon</button>
      </div>

      {hackathons.length === 0 ? (
        <EmptyState icon={<Trophy className="w-10 h-10" />} title="No hackathons yet" description="Add your first hackathon entry" action={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-5 h-5" /> Add Hackathon</button>} />
      ) : (
        <div className="grid gap-4">
          {hackathons.map((h) => (
            <div key={h.id} className="glass-panel rounded-xl p-6 hover:border-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold truncate">{h.title}</h3><StatusBadge status={h.status} /></div>
                  {(h.start_date || h.end_date) && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3"><Calendar className="w-4 h-4" />{h.start_date && format(new Date(h.start_date), 'MMM d, yyyy')}{h.start_date && h.end_date && ' - '}{h.end_date && format(new Date(h.end_date), 'MMM d, yyyy')}</div>}
                  {h.short_description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{h.short_description}</p>}
                  {h.tech_stack.length > 0 && <TechStack technologies={h.tech_stack} />}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/hackathons/${h.id}`)} className="btn-icon"><ExternalLink className="w-5 h-5" /></button>
                  <button onClick={() => openEditModal(h)} className="btn-icon"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => setDeleteHackathon(h)} className="btn-icon text-destructive"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingHackathon ? 'Edit Hackathon' : 'New Hackathon'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium text-muted-foreground">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field mt-1" required /></div>
          <div><label className="text-sm font-medium text-muted-foreground">Short Description</label><textarea value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="input-field mt-1" rows={2} /></div>
          <div>
          <label className="text-sm font-medium text-muted-foreground">
            Problem Statement
          </label>
          <textarea
            className="input-field mt-1"
            rows={3}
            value={form.problem_statement}
            onChange={(e) =>
              setForm({ ...form, problem_statement: e.target.value })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Solution Description
          </label>
          <textarea
            className="input-field mt-1"
            rows={3}
            value={form.solution_description}
            onChange={(e) =>
              setForm({ ...form, solution_description: e.target.value })
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              GitHub Repo (optional)
            </label>
            <input
              className="input-field mt-1"
              value={form.github_url}
              onChange={(e) =>
                setForm({ ...form, github_url: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Deployed Link (optional)
            </label>
            <input
              className="input-field mt-1"
              value={form.deployed_url}
              onChange={(e) =>
                setForm({ ...form, deployed_url: e.target.value })
              }
            />
          </div>
        </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HackathonStatus })} className="input-field mt-1"><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></div>
          </div>
          <div><label className="text-sm font-medium text-muted-foreground">Tech Stack (comma separated)</label><input value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} className="input-field mt-1" /></div>

          {!editingHackathon && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-muted-foreground">Team Members</label>
                <button type="button" onClick={addTeamMember} className="btn-secondary text-sm"><Plus className="w-4 h-4" /> Add Member</button>
              </div>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members added yet.</p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <select value={member.user_id} onChange={(e) => updateTeamMember(index, 'user_id', e.target.value)} className="input-field flex-1" required={teamMembers.length > 0}>
                        <option value="">Select user...</option>
                        {getAvailableUsers(index).map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                      </select>
                      <select value={member.role} onChange={(e) => updateTeamMember(index, 'role', e.target.value)} className="input-field w-48">
                        {ALLOWED_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <button type="button" onClick={() => removeTeamMember(index)} className="btn-icon text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingHackathon ? 'Save Changes' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteHackathon} onClose={() => setDeleteHackathon(null)} onConfirm={handleDelete} title="Delete Hackathon" message={`Delete "${deleteHackathon?.title}"?`} loading={deleting} />
    </div>
  );
}
