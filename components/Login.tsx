
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onDevLogin: (passcode: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onDevLogin }) => {
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'lecturer' | 'student' | null>(null);
  const [passcode, setPasscode] = useState('');

  const handleDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim()) {
      onDevLogin(passcode);
    }
  };

  const resetDevFlow = () => {
    setShowDevOptions(false);
    setSelectedRole(null);
    setPasscode('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 blur-[180px] rounded-full"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse"></div>
      
      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-12 shadow-2xl text-center transition-all duration-700">
        <div className="relative w-24 h-24 bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mx-auto mb-10 shadow-2xl shadow-brand-500/20 ring-4 ring-white/5 group overflow-hidden">
          ST
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent"></div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white/10 rounded-full blur-xl"></div>
        </div>
        
        <h1 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase leading-none">
          ST System
        </h1>
        
        {!showDevOptions ? (
          <>
            <p className="text-slate-400 mb-12 text-sm font-bold uppercase tracking-[0.3em] opacity-80">
              High-performance academic evaluation powered by Gemini.
            </p>
            <div className="space-y-4">
              <button 
                onClick={onLogin}
                className="w-full flex items-center justify-center space-x-4 bg-white hover:bg-slate-50 text-slate-900 font-black py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl uppercase tracking-widest text-[11px]"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span>Continue with Google</span>
              </button>
              
              <button 
                onClick={() => setShowDevOptions(true)}
                className="w-full flex items-center justify-center space-x-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-black py-4 px-8 rounded-2xl border border-slate-700/50 transition-all text-[11px] uppercase tracking-widest"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Developer Bypass</span>
              </button>
            </div>
          </>
        ) : !selectedRole ? (
          <>
            <p className="text-slate-400 mb-10 text-xs font-black uppercase tracking-[0.3em] opacity-80">
              Select Simulation Role
            </p>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setSelectedRole('lecturer')}
                className="w-full p-8 bg-slate-800/50 hover:bg-slate-900 border border-slate-700/50 rounded-3xl text-left transition-all group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">👨‍🏫</span>
                  <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></div>
                </div>
                <h4 className="text-white font-black text-sm uppercase tracking-widest">Lecturer Bypass</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Full system control mode</p>
              </button>
              <button 
                onClick={() => setSelectedRole('student')}
                className="w-full p-8 bg-slate-800/50 hover:bg-slate-900 border border-slate-700/50 rounded-3xl text-left transition-all group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">🧑‍🎓</span>
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                </div>
                <h4 className="text-white font-black text-sm uppercase tracking-widest">Student Bypass</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Study assistant mode</p>
              </button>
              <button 
                onClick={resetDevFlow}
                className="mt-6 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
              >
                Cancel Bypass
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleDevSubmit} className="space-y-6">
            <p className="text-slate-400 mb-8 text-xs font-black uppercase tracking-[0.3em] opacity-80">
              Enter {selectedRole} Authentication
            </p>
            <div className="space-y-4">
              <input 
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl p-6 text-white text-center font-black tracking-[0.8em] text-2xl outline-none focus:border-brand-500 transition-all shadow-inner"
                autoFocus
                required
              />
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 py-2 rounded-lg">
                Hint: {selectedRole === 'lecturer' ? '12345' : '1234'}
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 text-white font-black py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-brand-500/20 uppercase tracking-widest text-[11px]"
            >
              Secure Login
            </button>
            
            <button 
              type="button"
              onClick={() => setSelectedRole(null)}
              className="w-full text-slate-500 hover:text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] transition-colors"
            >
              Change Role
            </button>
          </form>
        )}

        {/* Footer Metrics */}
        <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-brand-400 font-black text-xl tracking-tighter">V2.1</div>
            <div className="text-slate-600 text-[8px] font-black uppercase tracking-widest mt-1">Engine</div>
          </div>
          <div className="text-center">
            <div className="text-indigo-400 font-black text-xl tracking-tighter">SSL</div>
            <div className="text-slate-600 text-[8px] font-black uppercase tracking-widest mt-1">Secured</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-black text-xl tracking-tighter">AI</div>
            <div className="text-slate-600 text-[8px] font-black uppercase tracking-widest mt-1">Hybrid</div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-slate-700 text-[10px] font-black uppercase tracking-[0.5em] opacity-40">
        Academic Core Synchronization v2.1.0
      </div>
    </div>
  );
};

export default Login;
