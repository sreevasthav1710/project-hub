import { useState, useEffect } from 'react';
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
import { Plus, Trophy, Pencil, Trash2, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
    title: '', short_description: '', problem_statement: '', solution_description: '', tech_stack: '', github_url: '', deployed_url: '', start_date: '', end_date: '', status: 'upcoming' as HackathonStatus,
  });

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchHackathons(); }, [user]);

  const fetchHackathons = async () => {
    const { data } = await supabase.from('hackathons').select('*').order('start_date', { ascending: false });
    setHackathons((data as Hackathon[]) || []);
    setLoading(false);
  };

  const resetForm = () => { setForm({ title: '', short_description: '', problem_statement: '', solution_description: '', tech_stack: '', github_url: '', deployed_url: '', start_date: '', end_date: '', status: 'upcoming' }); setEditingHackathon(null); };
  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };
  
  const openEditModal = (h: Hackathon) => {
    setEditingHackathon(h);
    setForm({ title: h.title, short_description: h.short_description || '', problem_statement: h.problem_statement || '', solution_description: h.solution_description || '', tech_stack: h.tech_stack.join(', '), github_url: h.github_url || '', deployed_url: h.deployed_url || '', start_date: h.start_date || '', end_date: h.end_date || '', status: h.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { title: form.title, short_description: form.short_description || null, problem_statement: form.problem_statement || null, solution_description: form.solution_description || null, tech_stack: form.tech_stack.split(',').map(t => t.trim()).filter(Boolean), github_url: form.github_url || null, deployed_url: form.deployed_url || null, start_date: form.start_date || null, end_date: form.end_date || null, status: form.status };
    if (editingHackathon) await supabase.from('hackathons').update(data).eq('id', editingHackathon.id);
    else await supabase.from('hackathons').insert({ ...data, created_by: user!.id });
    setSaving(false); setIsModalOpen(false); resetForm(); fetchHackathons();
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
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HackathonStatus })} className="input-field mt-1"><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select></div>
          </div>
          <div><label className="text-sm font-medium text-muted-foreground">Tech Stack (comma separated)</label><input value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })} className="input-field mt-1" /></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingHackathon ? 'Save Changes' : 'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteHackathon} onClose={() => setDeleteHackathon(null)} onConfirm={handleDelete} title="Delete Hackathon" message={`Delete "${deleteHackathon?.title}"?`} loading={deleting} />
    </div>
  );
}
