import React from 'react';
import { GradingResult } from '../types';

interface ResultSectionProps {
  result: GradingResult | null;
  error: string | null;
  isEvaluating: boolean;
}

const ResultSection: React.FC<ResultSectionProps> = ({ result, error, isEvaluating }) => {
  if (isEvaluating) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center animate-pulse">
        <div className="w-24 h-24 bg-indigo-50 rounded-full mb-4 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-bold text-indigo-900 mb-2">Analyzing Submission...</h3>
        <p className="text-gray-400 text-sm">Optimizing logic check with Flash Speed</p>
      </div>
    );
  }

  if (error) {
    const isQuotaError = error.includes("Rate Limit") || error.includes("429") || error.includes("quota");

    return (
      <div className={`h-full flex flex-col items-center justify-center rounded-xl shadow-lg border p-8 text-center ${isQuotaError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl ${isQuotaError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500'}`}>
          {isQuotaError ? '⌛' : '⚠️'}
        </div>
        <h3 className={`text-xl font-bold mb-2 ${isQuotaError ? 'text-amber-800' : 'text-red-700'}`}>
          {isQuotaError ? 'Speed Limit Reached' : 'Evaluation Failed'}
        </h3>
        <p className={`${isQuotaError ? 'text-amber-700' : 'text-red-600'} max-w-md mb-4`}>
          {error}
        </p>
        
        {isQuotaError && (
          <div className="p-4 bg-white border border-amber-100 rounded-lg text-xs text-left text-gray-600 shadow-sm">
            <p className="font-bold mb-1 text-amber-800">Why am I seeing this?</p>
            <p>The <b>Google Free Tier</b> limits how many times you can use the AI per minute. To "remove" this limit, you must use an API key from a <b>Paid Google Cloud Project</b>.</p>
          </div>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="w-24 h-24 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mb-6 text-4xl">
          🤖
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Grade</h3>
        <p className="text-gray-500 max-w-sm mb-6">
          Enter code and click "Evaluate" to receive instant Hebrew feedback.
        </p>
        <div className="flex items-center space-x-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>SYSTEM READY: FLASH SPEED MODE</span>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 7) return 'text-blue-600 border-blue-200 bg-blue-50';
    if (score >= 5) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-red-600 border-red-200 bg-red-50';
  };

  const scoreColorClass = getScoreColor(result.score);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <span className="mr-2">📊</span> Evaluation Report
        </h2>
        <div className="flex items-center space-x-2">
           <span className="text-[10px] font-bold text-indigo-400 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Latency: Ultra-Low</span>
           <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI Generated</span>
        </div>
      </div>
      
      <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center mb-10">
          <div className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center mb-4 shadow-sm ${scoreColorClass.replace('bg-', 'bg-opacity-0 ').split(' ')[1]}`}>
            <span className={`text-5xl font-extrabold ${scoreColorClass.split(' ')[0]}`}>
              {result.score}
            </span>
            <span className="absolute bottom-6 text-sm font-semibold text-gray-400">/ 10</span>
          </div>
          <div className={`px-4 py-1 rounded-full text-sm font-bold border ${scoreColorClass}`}>
            {result.score >= 9 ? 'Excellent' : result.score >= 7 ? 'Good' : result.score >= 5 ? 'Needs Improvement' : 'Critical Issues'}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4 flex items-center">
            <span className="text-lg mr-2">💬</span> 
            Feedback (Hebrew)
          </h3>
          <p className="text-gray-800 text-lg leading-relaxed text-right font-medium" dir="rtl">
            {result.feedback}
          </p>
        </div>

        <div className="mt-8 text-center flex flex-col items-center">
          <button 
            onClick={() => navigator.clipboard.writeText(result.feedback)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center transition-colors mb-2"
          >
            Copy Feedback
          </button>
          <p className="text-[10px] text-gray-400 italic">Code cleared and ready for next student.</p>
        </div>
      </div>
    </div>
  );
};

export default ResultSection;