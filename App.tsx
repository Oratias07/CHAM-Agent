
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black animate-pulse">INITIALIZING SECURE CORE...</div>;

  if (!user) return <Login onLogin={() => {}} onDevLogin={handleDevLogin} />;
  if (!user.role) return <RoleSelector onSelect={handleRoleSelect} />;

  if (user.role === 'student') {
    if (!user.enrolledCourseIds || user.enrolledCourseIds.length === 0) {
      return (
        <div className="h-screen bg-zinc-100 dark:bg-slate-900 flex items-center justify-center p-6">
           <div className="max-w-md w-full bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] shadow-2xl text-center border dark:border-slate-800">
             <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Join Academy</h2>
             <p className="text-slate-500 font-bold mb-8 text-sm">Enter the course code provided by your instructor. Enrollment requires approval.</p>
             <input 
                placeholder="Course Code" 
                className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none mb-6 text-center font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    apiService.joinCourseRequest((e.target as any).value).then(res => {
                       alert(res.message);
                       (e.target as any).value = "";
                    }).catch(err => alert(err.message));
                  }
                }}
             />
             <button onClick={() => window.location.href="/api/auth/logout"} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline">Sign Out</button>
           </div>
        </div>
      );
    }
    return <StudentPortal user={user} />;
  }

  return <LecturerDashboard user={user} />;
};

export default App;
