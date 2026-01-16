import React from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-8 shadow-lg shadow-indigo-500/20">
          AI
        </div>
        
        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
          CodeGrader SaaS
        </h1>
        <p className="text-slate-400 mb-10 text-lg">
          Enterprise-grade AI evaluation for programming instructors.
        </p>

        <div className="space-y-4">
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          
          <p className="text-slate-500 text-xs">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-indigo-400 font-bold text-xl">100%</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-bold text-xl">Secured</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest">MongoDB</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-400 font-bold text-xl">Flash</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest">Speed</div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-slate-500 text-sm font-medium z-10">
        Trusted by top Computer Science faculties globally.
      </div>
    </div>
  );
};

export default Login;