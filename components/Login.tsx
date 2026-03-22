
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onDevLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onDevLogin }) => {
  const [showDevOptions, setShowDevOptions] = useState(false);

  const resetDevFlow = () => {
    setShowDevOptions(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-sm sm:max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl text-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl mx-auto mb-8 shadow-2xl shadow-brand-500/30">
          ST
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tighter uppercase">ST System</h1>
        <p className="text-slate-400 mb-10 text-xs font-bold tracking-widest uppercase opacity-70">
          מערכת הערכת קוד אקדמית מבוססת AI
        </p>

        {!showDevOptions ? (
          <div className="space-y-3">
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-slate-900 font-black py-4 px-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl text-xs uppercase tracking-widest"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              <span>המשך עם Google</span>
            </button>

            <button
              onClick={() => setShowDevOptions(true)}
              className="w-full flex items-center justify-center space-x-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold py-3 px-6 rounded-2xl border border-slate-700/50 transition-all text-xs uppercase tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Developer Bypass</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 mb-6 text-xs font-black uppercase tracking-[0.3em]">בחר תפקיד לסימולציה</p>
            <button
              onClick={() => onDevLogin('lecturer')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-500/50 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">👨‍🏫</span>
                <div>
                  <h4 className="text-white font-black text-sm uppercase tracking-wider">מרצה</h4>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">שליטה מלאה במערכת</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => onDevLogin('student')}
              className="w-full p-6 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-brand-500/50 rounded-2xl text-left transition-all group"
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">🧑‍🎓</span>
                <div>
                  <h4 className="text-white font-black text-sm uppercase tracking-wider">סטודנט</h4>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">גישה לחומרים ומשימות</p>
                </div>
              </div>
            </button>
            <button onClick={resetDevFlow} className="mt-4 text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-colors">
              ביטול
            </button>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-center space-x-6">
          <div className="text-center"><div className="text-brand-400 font-black text-sm">Gemini</div><div className="text-slate-700 text-[8px] font-black uppercase tracking-widest mt-0.5">AI Core</div></div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center"><div className="text-emerald-400 font-black text-sm">SSL</div><div className="text-slate-700 text-[8px] font-black uppercase tracking-widest mt-0.5">מאובטח</div></div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center"><div className="text-purple-400 font-black text-sm">RTL</div><div className="text-slate-700 text-[8px] font-black uppercase tracking-widest mt-0.5">תמיכת עברית</div></div>
        </div>
      </div>

      <p className="mt-8 text-slate-700 text-[9px] font-black uppercase tracking-[0.4em]">ST System v2.1 · Academic Core</p>
    </div>
  );
};

export default Login;
