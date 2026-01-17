import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FolderKanban, Trophy, LogOut, User } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-16 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 btn-ghost"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </button>
          </div>
          <button onClick={handleSignOut} className="btn-ghost">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="space-y-8">
          <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl font-bold mb-3">Welcome to ProjectHub</h1>
            <p className="text-muted-foreground text-lg">Manage your projects and hackathons</p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => navigate('/projects')}
              className="dashboard-card text-left animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                  <FolderKanban className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Projects</h2>
                <p className="text-muted-foreground">
                  Create, manage, and track all your development projects in one place.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/hackathons')}
              className="dashboard-card text-left animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
                  <Trophy className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Hackathons</h2>
                <p className="text-muted-foreground">
                  Organize hackathon entries with deadlines, teams, and linked projects.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
