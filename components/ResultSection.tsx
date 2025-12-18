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
        <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <p className="mt-8 text-gray-400 text-sm">AI Agent is analyzing structure, logic, and style...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-red-50 rounded-xl shadow-lg border border-red-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 text-3xl">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-red-700 mb-2">Evaluation Failed</h3>
        <p className="text-red-600 max-w-md">{error}</p>
        <p className="mt-4 text-xs text-red-400">
          Ensure your API_KEY is correctly set in your environment variables.
        </p>
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
        <p className="text-gray-500 max-w-sm">
          Enter the student's code and the grading rubric on the left, then click "Evaluate Code".
        </p>
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
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI Generated</span>
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

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigator.clipboard.writeText(result.feedback)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center w-full transition-colors"
          >
            Copy Feedback to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultSection;