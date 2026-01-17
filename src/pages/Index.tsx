import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import projecthub from '@/assets/projecthub.png';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-2xl animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 glow-effect">
          <img
            src={projecthub}
            alt="ProjectHub Logo"
              className="w-20 h-20 object-contain"
            />
        </div>
        
        <h1 className="text-5xl font-bold mb-6 tracking-tight">
          Welcome to <span className="text-primary">ProjectHub</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
          Your all-in-one platform to manage development projects and track hackathon participations with your team.
        </p>

        <button
          onClick={() => navigate('/auth')}
          className="btn-primary text-lg px-8 py-4"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
