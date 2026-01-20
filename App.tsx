
import React, { useState, useEffect } from 'react';
import { apiService } from './services/apiService';
import { User, UserRole } from './types';
import Login from './components/Login';
import LecturerDashboard from './LecturerDashboard';
import StudentPortal from './components/StudentPortal';
import RoleSelector from './components/RoleSelector';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchUser = async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      try {
        const userPromise = apiService.getCurrentUser();
        const u = await Promise.race([userPromise, timeoutPromise]) as User | null;
        if (isMounted) setUser(u);
      } catch (e) {
        console.warn("Auth initialization took too long or failed, defaulting to login.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();
    return () => { isMounted = false; };
  }, []);

  const handleRoleSelect = async (role: UserRole) => {
    try {
      const updatedUser = await apiService.updateUserRole(role);
      setUser(updatedUser);
    } catch (e) {
      alert("Failed to set role. Check connection.");
    }
  };

  const handleLecturerJoin = async (id: string) => {
    try {
      const updatedUser = await apiService.joinCourse(id);
      setUser(updatedUser);
    } catch (e) {
      alert("Failed to join course. Check ID.");
    }
  };

  const handleDevLogin = async (passcode: string) => {
    try {
      setLoading(true);
      const u = await apiService.devLogin(passcode);
      setUser(u);
    } catch (e) {
      alert("Developer bypass failed: " + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    window.location.href = "/api/auth/logout";
  };

  if (loading) return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_70%)]"></div>
      
      {/* Central Animation Container */}
      <div className="relative flex items-center justify-center w-64 h-64">
        {/* Primary Orbital Spinner - Rotating around its own center */}
        <div className="absolute w-40 h-40 border-2 border-brand-500/10 rounded-full"></div>
        <div className="absolute w-40 h-40 border-2 border-transparent border-t-brand-500 rounded-full animate-orbit-clean"></div>
        
        {/* Secondary Decorative Ring */}
        <div className="absolute w-52 h-52 border border-white/5 border-dashed rounded-full animate-[logo-spin-slow_20s_linear_infinite_reverse]"></div>

        {/* Central Logo Box - Perfectly Centered via Parent Flex */}
        <div className="relative w-24 h-24 bg-slate-900 rounded-3xl border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.15)] z-10 overflow-hidden group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          {/* Internal ST Letters (Secondary Animation) */}
          <div className="text-white font-black text-4xl tracking-tighter select-none animate-logo-secondary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            ST
          </div>

          {/* Shimmer Light */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] animate-[shimmer_3s_infinite]"></div>
        </div>
      </div>

      {/* Loading Status Text */}
      <div className="mt-8 flex flex-col items-center">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.5em] animate-pulse">
          Secure Core Initializing
        </p>
        <div className="mt-4 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 animate-[progress_5s_ease-in-out_infinite]"></div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(150%) skewX(-12deg); }
        }
        @keyframes progress {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(0%); }
          100% { width: 100%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );

  if (!user) return <Login onLogin={() => window.location.href = "/api/auth/google"} onDevLogin={handleDevLogin} />;

  if (!user.role) {
    return <RoleSelector onSelect={handleRoleSelect} />;
  }

  if (user.role === 'student') {
    if (!user.enrolledCourseIds || user.enrolledCourseIds.length === 0) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Enter Course</h2>
              <button onClick={handleLogout} className="text-[10px] font-black text-slate-400 hover:text-brand-500 uppercase tracking-widest transition-colors">Sign Out</button>
            </div>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Enter the unique code provided by your instructor to access learning materials.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const code = (e.target as any).courseCode.value;
              handleLecturerJoin(code);
            }}>
              <input name="courseCode" placeholder="Course Code (e.g. ABC123)" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 mb-6 text-slate-800 dark:white outline-none focus:border-brand-500 transition-all font-bold uppercase text-center" required />
              <button className="w-full py-5 bg-brand-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all">Join Course</button>
            </form>
          </div>
        </div>
      );
    }
    return <StudentPortal user={user} />;
  }

  return <LecturerDashboard user={user} />;
};

export default App;
