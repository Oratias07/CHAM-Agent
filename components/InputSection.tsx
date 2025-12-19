import React from 'react';
import { TabOption, Student, Exercise } from '../types';

interface InputSectionProps {
  activeExercise: Exercise;
  onUpdateExerciseData: (field: keyof Exercise, value: any) => void;
  studentCode: string;
  setStudentCode: (code: string) => void;
  activeTab: TabOption;
  setActiveTab: (tab: TabOption) => void;
  isEvaluating: boolean;
  onEvaluate: () => void;
  students: Student[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  exercises: Exercise[];
  setActiveExerciseId: (id: string) => void;
  onAddExercise: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({
  activeExercise,
  onUpdateExerciseData,
  studentCode,
  setStudentCode,
  activeTab,
  setActiveTab,
  isEvaluating,
  onEvaluate,
  students,
  selectedStudentId,
  setSelectedStudentId,
  exercises,
  setActiveExerciseId,
  onAddExercise
}) => {
  
  const getActiveValue = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return activeExercise.question;
      case TabOption.SOLUTION: return activeExercise.masterSolution;
      case TabOption.RUBRIC: return activeExercise.rubric;
      case TabOption.STUDENT_CODE: return studentCode;
      case TabOption.CUSTOM: return activeExercise.customInstructions;
      default: return '';
    }
  };

  const setActiveValue = (value: string) => {
    switch (activeTab) {
      case TabOption.QUESTION: onUpdateExerciseData('question', value); break;
      case TabOption.SOLUTION: onUpdateExerciseData('masterSolution', value); break;
      case TabOption.RUBRIC: onUpdateExerciseData('rubric', value); break;
      case TabOption.STUDENT_CODE: setStudentCode(value); break;
      case TabOption.CUSTOM: onUpdateExerciseData('customInstructions', value); break;
    }
  };

  const tabs = [
    { id: TabOption.QUESTION, label: 'Question', icon: '❓' },
    { id: TabOption.SOLUTION, label: 'Master Solution', icon: '🔑' },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: '📋' },
    { id: TabOption.STUDENT_CODE, label: 'Student Code', icon: '🧑‍💻' },
    { id: TabOption.CUSTOM, label: 'Custom Instr.', icon: '⚙️' },
  ];

  const getPlaceholder = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return 'Write the question here...';
      case TabOption.SOLUTION: return 'Provide the correct solution here...';
      case TabOption.RUBRIC: return 'Define grading criteria here...';
      case TabOption.STUDENT_CODE: return 'Paste student code here...';
      case TabOption.CUSTOM: return 'Add any custom limitations (forbidden keywords, etc.)...';
      default: return 'Write here...';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full border border-gray-100 overflow-hidden">
      {/* Configuration Header */}
      <div className="bg-slate-800 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 flex-grow min-w-[200px]">
          <span className="text-white text-xs font-bold uppercase tracking-wider">Exercise:</span>
          <select 
            value={activeExercise.id}
            onChange={(e) => setActiveExerciseId(e.target.value)}
            className="bg-slate-700 text-white text-sm border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          <input 
            type="text"
            value={activeExercise.name}
            onChange={(e) => onUpdateExerciseData('name', e.target.value)}
            className="bg-slate-900/50 text-indigo-300 text-sm font-bold border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 flex-grow"
            placeholder="Rename exercise..."
          />
        </div>

        <button 
          onClick={onAddExercise}
          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors shadow-sm"
        >
          + New Exercise
        </button>
      </div>

      {/* Student Selector Sub-Header */}
      <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
        <label className="text-sm font-semibold text-indigo-900 flex items-center whitespace-nowrap">
          <span className="mr-2">🎓</span> Student:
        </label>
        <select 
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="ml-2 flex-grow max-w-[200px] text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1"
        >
          <option value="">-- Select Student --</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="ml-4 text-[10px] text-indigo-500 font-bold bg-indigo-100 px-2 py-1 rounded uppercase tracking-widest">
          Active
        </div>
      </div>

      <div className="bg-gray-50 border-b border-gray-200 px-4 pt-4 flex space-x-1 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center space-x-2
              ${activeTab === tab.id
                ? 'bg-white text-indigo-600 border-t border-l border-r border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-grow p-4 bg-white relative">
        <textarea
          className="w-full h-full p-4 text-sm font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none custom-scrollbar transition-all"
          value={getActiveValue()}
          onChange={(e) => setActiveValue(e.target.value)}
          placeholder={getPlaceholder()}
        />
        
        <div className="absolute bottom-6 right-8">
           <button
            onClick={onEvaluate}
            disabled={isEvaluating}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95
              ${isEvaluating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
          >
            {isEvaluating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Grading...</span>
              </>
            ) : (
              <>
                <span>✨ Evaluate {selectedStudentId ? '& Save' : 'Code'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;