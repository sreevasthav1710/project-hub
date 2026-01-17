import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Hackathon, HackathonStatus, Profile } from '@/types/database';
import BackButton from '@/components/BackButton';
import StatusBadge from '@/components/StatusBadge';
import TechStack from '@/components/TechStack';
import Modal from '@/components/Modal';
import { Pencil, Github, ExternalLink, Loader2, QrCode, Users, Plus, Trash2, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ALLOWED_ROLES = ['Team Lead', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Designer', 'Other'];

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profile?: Profile;
}

export default function HackathonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Frontend Developer');

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
  

  const fetchHackathon = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('hackathons')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching hackathon:', error);
        setLoading(false);
        setHackathon(null);
        return;
      }
      
      if (data) {
        setHackathon(data as Hackathon);
        setForm({
          title: data.title,
          short_description: data.short_description || '',
          problem_statement: data.problem_statement || '',
          solution_description: data.solution_description || '',
          github_url: data.github_url || '',
          deployed_url: data.deployed_url || '',
          tech_stack: (data.tech_stack || []).join(', '),
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          status: data.status,
        });
        
      } else {
        setHackathon(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error fetching hackathon:', err);
      setLoading(false);
      setHackathon(null);
    }
  }, [id]);

  const fetchTeamMembers = useCallback(async () => {
    if (!id) return;
    const { data: members } = await supabase
      .from('hackathon_members')
      .select('*')
      .eq('hackathon_id', id);
    
    if (members) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setTeamMembers(members.map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        profile: profileMap.get(m.user_id),
      })));
    }
  }, [id]);

  const fetchAllUsers = useCallback(async () => {
    try {
      console.log('Fetching all users from profiles table...');
      
      // Fetch all profiles - select all columns to ensure we get complete data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching profiles:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setAllUsers([]);
        return;
      }

      console.log('Raw data from Supabase:', data);
      console.log('Number of profiles returned:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('No profiles found in database');
        setAllUsers([]);
        return;
      }

      let users = (data || []) as Profile[];
      console.log(`Fetched ${users.length} users from profiles table:`, users.map(u => ({ id: u.id, name: u.full_name, email: u.email })));
      
      // Don't add current user separately - they should already be in the list
      // Only add if they're truly missing (which shouldn't happen if RLS is working)
      if (user && !users.find(u => u.id === user.id)) {
        console.warn('Current user not found in profiles list, attempting to fetch separately...');
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
          console.log('Added current user to list');
        }
      }
      
      console.log(`Setting ${users.length} users in state`);
      setAllUsers(users);
    } catch (err) {
      console.error('Unexpected error fetching all users:', err);
      setAllUsers([]);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchHackathon();
      fetchTeamMembers();
      fetchAllUsers();
    }
  }, [user, id, fetchHackathon, fetchTeamMembers, fetchAllUsers]);

  useEffect(() => {
    if (!id) return;

    const hackathonSubscription = supabase
      .channel(`hackathon:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathons', filter: `id=eq.${id}` }, () => {
        fetchHackathon();
      })
      .subscribe();

    const membersSubscription = supabase
      .channel(`hackathon_members:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hackathon_members', filter: `hackathon_id=eq.${id}` }, () => {
        fetchTeamMembers();
      })
      .subscribe();

    return () => {
      hackathonSubscription.unsubscribe();
      membersSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdateHackathon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    try {
      const hackathonData: any = {
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
      

      console.log('Updating hackathon with data:', hackathonData);
      console.log('Hackathon ID:', id);

      const { data: updatedData, error } = await supabase
        .from('hackathons')
        .update(hackathonData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating hackathon:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert(`Failed to update hackathon: ${error.message}`);
        setSaving(false);
        return;
      }

      // Check if any rows were actually updated
      if (!updatedData || updatedData.length === 0) {
        console.warn('No rows were updated. This might be due to RLS policies.');
        console.warn('User ID:', user?.id);
        console.warn('Hackathon created_by:', hackathon?.created_by);
        console.warn('Is user the creator?', hackathon?.created_by === user?.id);
        
        // If user is the creator, try update without select to see if it actually works
        // The RLS might be blocking the SELECT but allowing the UPDATE
        if (hackathon?.created_by === user?.id) {
          console.log('User is the creator, trying update without select...');
          const { error: updateError } = await supabase
            .from('hackathons')
            .update(hackathonData)
            .eq('id', id);
          
          if (updateError) {
            console.error('Update error:', updateError);
            alert(`Failed to update hackathon: ${updateError.message}. Please run the RLS fix SQL in Supabase.`);
          } else {
            console.log('Update succeeded without select. Refreshing...');
            // Wait a moment then refresh
            setTimeout(async () => {
              await fetchHackathon();
            }, 300);
          }
        } else {
          alert('You do not have permission to update this hackathon. Only the creator or team members can update.');
        }
        
        setSaving(false);
        setIsEditModalOpen(false);
        return;
      }

      // Update local state immediately with the first (and should be only) result
      const updated = updatedData[0] as Hackathon;
      setHackathon(updated);
        setForm({
          title: updated.title,
          short_description: updated.short_description || '',
          problem_statement: updated.problem_statement || '',
          solution_description: updated.solution_description || '',
          github_url: updated.github_url || '',
          deployed_url: updated.deployed_url || '',
          tech_stack: (updated.tech_stack || []).join(', '),
          start_date: updated.start_date || '',
          end_date: updated.end_date || '',
          status: updated.status,
        });
      console.log('Hackathon updated successfully:', updated);

      // Force a refresh to ensure UI is updated
      setTimeout(async () => {
        await fetchHackathon();
      }, 100);

      setSaving(false);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Unexpected error updating hackathon:', err);
      alert('An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!id || !newMemberUserId || !newMemberRole) return;

    setSaving(true);
    try {
      const existingLead = teamMembers.find(m => m.role === 'Team Lead');
      if (newMemberRole === 'Team Lead' && existingLead) {
        alert('A hackathon can only have one Team Lead. Please change the existing Team Lead\'s role first.');
        setSaving(false);
        return;
      }

      const existingMember = teamMembers.find(m => m.user_id === newMemberUserId);
      if (existingMember) {
        alert('This user is already a team member.');
        setSaving(false);
        return;
      }

      const payload = {
        hackathon_id: id,
        user_id: newMemberUserId,
        role: newMemberRole,
      };

      const { data: upserted, error } = await supabase
        .from('hackathon_members')
        .upsert(payload, { onConflict: 'hackathon_id,user_id' })
        .select();

      if (error) {
        console.error('Supabase insert/upsert error (hackathon_members):', error);
        console.error('error.code:', (error as any)?.code, 'message:', (error as any)?.message, 'details:', (error as any)?.details, 'hint:', (error as any)?.hint);

        const msg = (error as any)?.message || JSON.stringify(error);
        if (msg && (msg.includes('duplicate') || (error as any)?.code === '23505')) {
          await fetchTeamMembers();
          alert('This user is already a team member.');
        } else {
          alert(`Failed to add team member: ${msg}`);
        }

        setSaving(false);
        return;
      }

      await fetchTeamMembers();
      setIsTeamModalOpen(false);
      setNewMemberUserId('');
      setNewMemberRole('Frontend Developer');
    } catch (err) {
      console.error('Error adding team member:', err);
      alert('Failed to add team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTeamMember = async (memberId: string, newRole: string) => {
    if (!id) return;

    setSaving(true);
    try {
      if (newRole === 'Team Lead') {
        const existingLead = teamMembers.find(m => m.role === 'Team Lead' && m.id !== memberId);
        if (existingLead) {
          alert('A hackathon can only have one Team Lead. Please change the existing Team Lead\'s role first.');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from('hackathon_members').update({
        role: newRole,
      }).eq('id', memberId);

      if (error) {
        console.error('Supabase error updating hackathon_member:', error);
        alert(`Failed to update team member: ${error.message || JSON.stringify(error)}`);
        setSaving(false);
        return;
      }

      await fetchTeamMembers();
      setEditingMember(null);
      setIsTeamModalOpen(false);
    } catch (err) {
      console.error('Error updating team member:', err);
      alert('Failed to update team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('hackathon_members').delete().eq('id', memberId);
      if (error) {
        console.error('Supabase error deleting hackathon_member:', error);
        alert(`Failed to remove team member: ${error.message || JSON.stringify(error)}`);
        setSaving(false);
        return;
      }
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      await fetchTeamMembers();
    } catch (err) {
      console.error('Error removing team member:', err);
      alert('Failed to remove team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!hackathon) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Hackathon not found</h2><BackButton to="/hackathons" label="Back to Hackathons" /></div></div>;
  }

  const availableUsers = allUsers.filter(u => !teamMembers.some(m => m.user_id === u.id));

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <BackButton to="/hackathons" label="Hackathons" />

      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="page-title mb-0">{hackathon.title}</h1>
            <StatusBadge status={hackathon.status} />
          </div>
          {hackathon.short_description && <p className="text-muted-foreground text-lg">{hackathon.short_description}</p>}
          {(hackathon.start_date || hackathon.end_date) && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <Calendar className="w-4 h-4" />
              {hackathon.start_date && format(new Date(hackathon.start_date), 'MMM d, yyyy')}
              {hackathon.start_date && hackathon.end_date && ' - '}
              {hackathon.end_date && format(new Date(hackathon.end_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>
        <button onClick={() => setIsEditModalOpen(true)} className="btn-primary">
          <Pencil className="w-5 h-5" /> Edit Hackathon
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Problem Statement</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {hackathon.problem_statement || 'No problem statement provided.'}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Solution Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {hackathon.solution_description || 'No solution description provided.'}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Tech Stack</h2>
            {hackathon.tech_stack && hackathon.tech_stack.length > 0 ? (
              <TechStack technologies={hackathon.tech_stack} />
            ) : (
              <p className="text-muted-foreground">No tech stack specified.</p>
            )}
          </div>

          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Links</h2>
            <div className="space-y-3">
              {hackathon.github_url && (
                <a
                  href={hackathon.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Github className="w-5 h-5" /> GitHub Repository
                </a>
              )}

              {hackathon.deployed_url && (
                <a
                  href={hackathon.deployed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-5 h-5" /> Deployed Application
                </a>
              )}

              {hackathon.qr_code_url && (
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-muted-foreground" />
                  <img src={hackathon.qr_code_url} alt="QR Code" className="w-24 h-24" />
                </div>
              )}
              
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> Team</h2>
              <button onClick={() => setIsTeamModalOpen(true)} className="btn-icon"><Plus className="w-4 h-4" /></button>
            </div>
            {teamMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No team members yet.</p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.profile?.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingMember(member)} className="btn-icon"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleRemoveTeamMember(member.id)} className="btn-icon text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Hackathon" size="lg">
        <form onSubmit={handleUpdateHackathon} className="space-y-4">
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
                  GitHub Repo
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
                  Deployed Link
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
          <div><label className="text-sm font-medium text-muted-foreground">Tech Stack (comma separated)</label><input value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} className="input-field mt-1" placeholder="React, TypeScript, Node.js" /></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={isTeamModalOpen || !!editingMember} onClose={() => { setIsTeamModalOpen(false); setEditingMember(null); }} title={editingMember ? 'Edit Team Member' : 'Add Team Member'} size="md">
        {editingMember ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member</label>
              <div className="input-field mt-1">{editingMember.profile?.full_name || 'Unknown User'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <select value={editingMember.role} onChange={(e) => handleUpdateTeamMember(editingMember.id, e.target.value)} className="input-field mt-1">
                {ALLOWED_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setIsTeamModalOpen(false); setEditingMember(null); }} className="btn-secondary flex-1">Close</button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User</label>
              <select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)} className="input-field mt-1">
                <option value="">Select a user...</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="input-field mt-1">
                {ALLOWED_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsTeamModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button type="button" onClick={handleAddTeamMember} className="btn-primary flex-1">Add Member</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
