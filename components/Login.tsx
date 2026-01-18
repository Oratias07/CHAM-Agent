import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onDevLogin: (passcode: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onDevLogin }) => {
  const [showDevInput, setShowDevInput] = useState(false);
  const [passcode, setPasscode] = useState('');

  const handleDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim()) {
      onDevLogin(passcode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 shadow-2xl text-center transition-all duration-500">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-10 shadow-2xl shadow-indigo-500/20 ring-4 ring-white/5">
          ST
        </div>
        
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">
          ST System
        </h1>
        <p className="text-slate-400 mb-12 text-lg font-medium leading-relaxed">
          {showDevInput ? 'Enter development passcode to bypass OAuth.' : 'High-performance academic evaluation powered by Gemini.'}
        </p>

        {!showDevInput ? (
          <div className="space-y-4">
            <button 
              onClick={onLogin}
              className="w-full flex items-center justify-center space-x-4 bg-white hover:bg-slate-50 text-slate-900 font-black py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl uppercase tracking-widest text-xs"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
            
            <button 
              onClick={() => setShowDevInput(true)}
              className="w-full flex items-center justify-center space-x-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold py-4 px-8 rounded-2xl border border-slate-700/50 transition-all text-xs uppercase tracking-widest"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Developer Bypass</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleDevSubmit} className="space-y-4">
            <div className="space-y-2">
              <input 
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-white text-center font-black tracking-[0.5em] outline-none focus:border-brand-500 transition-all"
                autoFocus
                required
              />
              <div className="flex justify-center space-x-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span>12345: Lecturer</span>
                <span>1234: Student</span>
              </div>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 text-white font-black py-5 px-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl uppercase tracking-widest text-xs"
            >
              Verify & Enter
            </button>
            
            <button 
              type="button"
              onClick={() => {
                setShowDevInput(false);
                setPasscode('');
              }}
              className="w-full flex items-center justify-center space-x-2 text-slate-500 hover:text-slate-300 font-bold py-3 text-[11px] uppercase tracking-widest transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Regret and Return</span>
            </button>
          </form>
        )}

        <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-indigo-400 font-black text-2xl tracking-tighter">1.5s</div>
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Latent</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-black text-2xl tracking-tighter">TLS</div>
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Security</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-400 font-black text-2xl tracking-tighter">AUTO</div>
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">Sync</div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-slate-600 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em] z-10 opacity-50">
        Academic Integrity Core (v2.0)
      </div>
    </div>
  );
};

export default Login;