import React from 'react';
import { GradingResult } from '../types';

interface ResultSectionProps {
  result: GradingResult | null;
  error: string | null;
  isEvaluating: boolean;
  darkMode?: boolean;
}

const ResultSection: React.FC<ResultSectionProps> = ({ result, error, isEvaluating }) => {
  if (isEvaluating) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-10 text-center transition-all">
        <div className="relative w-36 h-36 mb-10">
           <div className="absolute inset-0 border-[6px] border-brand-500/10 rounded-full"></div>
           <div className="absolute inset-0 border-[6px] border-brand-500 border-t-transparent rounded-full animate-spin"></div>
           <div className="absolute inset-6 bg-brand-50 dark:bg-slate-800/80 rounded-full flex items-center justify-center text-5xl animate-pulse shadow-inner">
             ⚡
           </div>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 uppercase tracking-tighter">AI Evaluation Core</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium max-w-[240px] leading-relaxed">Analyzing semantic logic and applying grading rubric with sub-second latency...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-3xl shadow-xl border border-red-200 dark:border-red-900/30 p-12 text-center">
        <div className="w-24 h-24 rounded-3xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-8 text-4xl text-red-600 shadow-sm">
          ⚠️
        </div>
        <h3 className="text-2xl font-black text-red-800 dark:text-red-400 mb-3 uppercase tracking-tighter">Engine Interrupted</h3>
        <p className="text-red-600/80 dark:text-red-500/80 text-sm font-bold max-w-sm leading-relaxed mb-10">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
        >
          Reset Session
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-12 text-center">
        <div className="w-28 h-28 bg-brand-50 dark:bg-slate-800/60 text-brand-500 dark:text-brand-400 rounded-[2rem] flex items-center justify-center mb-10 text-6xl shadow-inner animate-float">
          🎯
        </div>
        <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tighter uppercase">Ready for Insight</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-10 text-base font-medium leading-relaxed">
          Select a student and submit their implementation to generate precise Hebrew pedagogical feedback.
        </p>
        <div className="flex items-center space-x-4 text-[11px] font-black text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30 px-6 py-3 rounded-2xl border border-brand-100 dark:border-brand-900/50 uppercase tracking-[0.2em] shadow-sm">
           <span className="flex h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse"></span>
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
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div className="bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-tighter">
          <span className="mr-4 text-3xl">⚡</span> Grading Analysis
        </h2>
        <div className="flex items-center space-x-3">
           <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">Flash 3.0 Core</span>
        </div>
      </div>
      
      <div className="p-10 flex-grow overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
        <div className="flex flex-col items-center mb-12">
          <div className={`relative w-44 h-44 rounded-full border-[10px] flex flex-col items-center justify-center mb-8 shadow-2xl transition-all duration-1000 transform hover:scale-105 ${scoreColorClass.split(' ').slice(2).join(' ')}`}>
            <span className={`text-7xl font-black ${scoreColorClass.split(' ')[0]} drop-shadow-sm`}>
              {result.score}
            </span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">out of 10.0</span>
          </div>
          <div className={`px-8 py-2.5 rounded-2xl text-[10px] font-black border-2 uppercase tracking-[0.2em] shadow-md transition-all duration-300 ${scoreColorClass}`}>
            {result.score >= 9 ? 'Elite Quality' : result.score >= 7 ? 'Standard Achieved' : result.score >= 5 ? 'Revision Needed' : 'Critical Errors'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/60 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-xl relative group transition-all hover:shadow-2xl">
          <div className="absolute top-6 left-8 text-slate-200 dark:text-slate-700 text-8xl opacity-30 pointer-events-none font-serif italic">"</div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center">
            <span className="text-2xl mr-3">🗣️</span> 
            Professional Hebrew Review
          </h3>
          <p className="text-slate-800 dark:text-slate-100 text-2xl leading-relaxed text-right font-bold drop-shadow-sm" dir="rtl">
            {result.feedback}
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center space-y-5">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(result.feedback);
              alert('Pedagogical feedback copied!');
            }}
            className="w-full py-5 bg-slate-900 dark:bg-brand-600 hover:bg-black dark:hover:bg-brand-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-brand-500/30 active:scale-[0.98]"
          >
            Copy Professional Review
          </button>
          <div className="flex items-center space-x-3 text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] font-black">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             <span>Automatic Persistence Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSection;