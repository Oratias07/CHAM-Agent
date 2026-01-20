
import React from 'react';
import { GradingResult } from '../types';

interface ResultSectionProps {
  result: GradingResult | null;
  error: string | null;
  isEvaluating: boolean;
  darkMode?: boolean;
}

const Icons = {
  Lightning: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Warning: () => <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Target: () => <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Review: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>,
};

const ResultSection: React.FC<ResultSectionProps> = ({ result, error, isEvaluating }) => {
  if (isEvaluating) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-850 rounded-3xl shadow-xl border border-zinc-100 dark:border-slate-800 p-10 text-center transition-all">
        <div className="relative w-36 h-36 mb-10">
           <div className="absolute inset-0 border-[4px] border-brand-500/10 rounded-full"></div>
           <div className="absolute inset-0 border-[4px] border-brand-500 border-t-transparent rounded-full animate-spin"></div>
           <div className="absolute inset-6 bg-zinc-50 dark:bg-slate-800/80 rounded-full flex items-center justify-center text-brand-500 animate-pulse shadow-inner">
             <Icons.Lightning />
           </div>
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-tighter">AI Evaluation Core</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold max-w-[240px] leading-relaxed">Analyzing semantic logic and applying grading rubric with sub-second latency...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/20 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/30 p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mb-8 text-rose-600 shadow-sm">
          <Icons.Warning />
        </div>
        <h3 className="text-xl font-black text-rose-800 dark:text-rose-400 mb-3 uppercase tracking-tighter">Engine Interrupted</h3>
        <p className="text-rose-600/80 dark:text-rose-500/80 text-xs font-bold max-w-sm leading-relaxed mb-10">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20"
        >
          Reset Session
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-850 rounded-3xl shadow-xl border border-zinc-100 dark:border-slate-800 p-12 text-center">
        <div className="w-24 h-24 bg-zinc-50 dark:bg-slate-800/60 text-brand-500 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-10 shadow-inner">
          <Icons.Target />
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tighter uppercase">ממתין להערכה</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 text-sm font-bold leading-relaxed text-right" dir="rtl">
          לא ניתן לבצע הערכה כיוון שלא הוזנו פרטי השאלה, פתרון המאסטר או קוד הסטודנט. אנא ספק את התוכן הנדרש כדי לקבל משוב והערכה.
        </p>
        <div className="flex items-center space-x-3 text-[10px] font-black text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30 px-5 py-3 rounded-xl border border-brand-100 dark:border-brand-900/50 uppercase tracking-[0.2em] shadow-sm">
           <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
           <span>Engine Status: Operational</span>
        </div>
      </div>
    );
  }

  const scoreColorClass = result.score >= 9 
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30' 
    : result.score >= 7 
    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border-brand-100 dark:border-brand-900/30' 
    : result.score >= 5 
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30' 
    : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-850 rounded-3xl shadow-xl border border-zinc-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div className="bg-zinc-50/80 dark:bg-slate-800/60 backdrop-blur-md border-b border-zinc-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-tighter">
          <span className="mr-3 text-brand-500"><Icons.Lightning /></span> Grading Analysis
        </h2>
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 border border-zinc-200 dark:border-slate-700 px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm">Flash 3.0 Core</span>
      </div>
      
      <div className="p-10 flex-grow overflow-y-auto custom-scrollbar bg-zinc-50/30 dark:bg-slate-900/30">
        <div className="flex flex-col items-center mb-12">
          <div className={`relative w-40 h-40 rounded-full border-[8px] flex flex-col items-center justify-center mb-6 shadow-xl transition-all duration-1000 ${scoreColorClass.split(' ').slice(2).join(' ')}`}>
            <span className={`text-6xl font-black ${scoreColorClass.split(' ')[0]}`}>
              {result.score}
            </span>
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">out of 10.0</span>
          </div>
          <div className={`px-6 py-2 rounded-xl text-[9px] font-black border uppercase tracking-[0.2em] shadow-sm ${scoreColorClass}`}>
            {result.score >= 9 ? 'Elite Quality' : result.score >= 7 ? 'Standard Achieved' : result.score >= 5 ? 'Revision Needed' : 'Critical Errors'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-zinc-200 dark:border-slate-800 shadow-md relative group transition-all">
          <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center">
            <span className="mr-3 text-brand-500"><Icons.Review /></span> Professional Hebrew Review
          </h3>
          <p className="text-slate-800 dark:text-slate-100 text-lg leading-relaxed text-right font-bold" dir="rtl">
            {result.feedback}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center space-y-4">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(result.feedback);
              alert('Pedagogical feedback copied!');
            }}
            className="w-full py-4 bg-slate-900 dark:bg-brand-600 hover:bg-black dark:hover:bg-brand-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
          >
            Copy Professional Review
          </button>
          <div className="flex items-center space-x-2 text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] font-black">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
             <span>Persistence Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSection;
