
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
    <div className="h-screen flex flex-col items-center justify-center dark:bg-slate-950 text-white font-sans">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <div className="font-black tracking-widest animate-pulse uppercase text-xs">Initialising System Core...</div>
      <p className="text-slate-500 text-[10px] mt-4 font-bold uppercase tracking-tight">Checking secure session status</p>
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
