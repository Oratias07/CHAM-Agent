
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    apiService.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDevLogin = async (passcode: string) => {
    try {
      const u = await apiService.devLogin(passcode);
      setUser(u);
    } catch (e) { alert("Login failed."); }
  };

  const handleRoleSelect = async (role: UserRole) => {
    const updated = await apiService.updateUserRole(role);
    setUser(updated);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full"></div>
        <div className="relative group">
          <div className="absolute inset-0 bg-brand-500 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-700 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl animate-logo-secondary">
            ST
            <div className="absolute -inset-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-orbit-clean"></div>
          </div>
        </div>
        <div className="mt-12 space-y-2 text-center">
          <div className="text-[10px] font-black text-brand-400 uppercase tracking-[0.5em] animate-pulse">System Synchronizing</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleGoogleLogin} onDevLogin={handleDevLogin} />;
  if (!user.role) return <RoleSelector onSelect={handleRoleSelect} />;

  const logout = () => { window.location.href = "/api/auth/logout"; };

  if (user.role === 'student') {
    if (!user.enrolledCourseIds || user.enrolledCourseIds.length === 0) {
      return (
        <div className="h-screen bg-zinc-100 dark:bg-slate-900 flex items-center justify-center p-6">
           <div className="max-w-md w-full bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] shadow-2xl text-center border dark:border-slate-800 transition-colors">
             <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-slate-800 dark:text-slate-100">Join Academy</h2>
             <p className="text-slate-500 font-bold mb-8 text-sm">Enter the course code provided by your instructor.</p>
             <input 
                placeholder="Course Code" 
                className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none mb-6 text-center font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500 dark:text-white" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    apiService.joinCourseRequest((e.target as any).value).then(res => {
                       alert(res.message);
                       (e.target as any).value = "";
                    }).catch(err => alert(err.message));
                  }
                }}
             />
             <div className="flex flex-col space-y-4">
                <button onClick={() => setDarkMode(!darkMode)} className="text-[10px] font-black text-brand-500 uppercase tracking-widest hover:underline">Toggle {darkMode ? 'Light' : 'Dark'} Mode</button>
                <button onClick={logout} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline">Sign Out</button>
             </div>
           </div>
        </div>
      );
    }
    return <StudentPortal user={user} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={logout} />;
  }

  return <LecturerDashboard user={user} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={logout} />;
};

export default App;
