
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
      // Race a 5-second timeout against the actual fetch
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
      const updatedUser = await apiService.enrollInCourse(id);
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

  if (loading) return (
    <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full"></div>
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full animate-pulse"></div>
      
      <div className="relative flex flex-col items-center">
        {/* Futuristic Loading Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[1px] border-white/5 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-[2px] border-brand-500/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-[3px] border-transparent border-t-brand-500 border-r-brand-500 rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-[1px] border-dashed border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
        
        {/* Large Central ST System Logo */}
        <div className="relative w-56 h-56 bg-slate-900 rounded-[3.5rem] border border-white/10 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(59,103,245,0.1)] z-10 transition-all duration-1000 overflow-hidden group">
           {/* Glossy Overlay */}
           <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent"></div>
           
           <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-indigo-600 bg-clip-text text-transparent text-[7rem] font-black tracking-tighter drop-shadow-2xl">
             ST
           </div>
           <div className="text-brand-500/90 text-sm font-black uppercase tracking-[0.7em] -mt-4 drop-shadow-sm">
             System
           </div>
           
           {/* Internal Scanner Line */}
           <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-400/30 animate-[scan_2s_infinite_ease-in-out]"></div>
        </div>

        {/* Status Indicators */}
        <div className="mt-32 flex flex-col items-center">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex space-x-1">
              <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
              <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
            </div>
            <div className="font-black tracking-[0.6em] text-white/80 uppercase text-[10px]">Synchronizing Core</div>
          </div>
          
          <div className="h-[2px] w-56 bg-white/5 relative overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500 to-transparent w-full animate-[loading-bar_1.5s_infinite_ease-in-out]"></div>
          </div>
          
          <p className="text-slate-500 text-[9px] mt-10 font-bold uppercase tracking-[0.4em] opacity-60">
            Powered by Gemini 3.0 Ultra-Flash
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );

  if (!user) return <Login onLogin={() => window.location.href = "/api/auth/google"} onDevLogin={handleDevLogin} />;

  if (!user.role) {
    return <RoleSelector onSelect={handleRoleSelect} />;
  }

  if (user.role === 'student') {
    if (!user.enrolledLecturerId) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tighter">Enter Course</h2>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Enter the unique ID provided by your instructor to access learning materials and AI aids.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = (e.target as any).lecturerId.value;
              handleLecturerJoin(id);
            }}>
              <input 
                name="lecturerId"
                placeholder="Lecturer ID (e.g. dev-bypass-12345)" 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 mb-6 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-all font-bold"
                required
              />
              <button className="w-full py-5 bg-brand-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                Access Notebook
              </button>
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
