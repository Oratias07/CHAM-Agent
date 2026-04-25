
import React from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-sm sm:max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl text-center">
        <img src="/logo.png" alt="CHAM Agent" className="w-20 h-20 rounded-[1.5rem] mx-auto mb-8 shadow-2xl shadow-brand-500/30 object-cover" />

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tighter uppercase">CHAM Agent</h1>
        <p className="text-slate-400 mb-10 text-xs font-bold tracking-widest uppercase opacity-70">
          מערכת הערכת קוד אקדמית מבוססת AI
        </p>

        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-slate-900 font-black py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl text-xs uppercase tracking-widest"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          <span>המשך עם Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
