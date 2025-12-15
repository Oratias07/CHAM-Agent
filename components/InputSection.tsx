import React from 'react';
import { TabOption, GradingInputs, Student } from '../types';

interface InputSectionProps {
  inputs: GradingInputs;
  setInputs: React.Dispatch<React.SetStateAction<GradingInputs>>;
  activeTab: TabOption;
  setActiveTab: (tab: TabOption) => void;
  isEvaluating: boolean;
  onEvaluate: () => void;
  students: Student[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  currentExerciseName: string;
}

const InputSection: React.FC<InputSectionProps> = ({
  inputs,
  setInputs,
  activeTab,
  setActiveTab,
  isEvaluating,
  onEvaluate,
  students,
  selectedStudentId,
  setSelectedStudentId,
  currentExerciseName
}) => {
  const handleChange = (field: keyof GradingInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const getActiveValue = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return inputs.question;
      case TabOption.SOLUTION: return inputs.masterSolution;
      case TabOption.RUBRIC: return inputs.rubric;
      case TabOption.STUDENT_CODE: return inputs.studentCode;
      case TabOption.CUSTOM: return inputs.customInstructions;
      default: return '';
    }
  };

  const setActiveValue = (value: string) => {
    switch (activeTab) {
      case TabOption.QUESTION: handleChange('question', value); break;
      case TabOption.SOLUTION: handleChange('masterSolution', value); break;
      case TabOption.RUBRIC: handleChange('rubric', value); break;
      case TabOption.STUDENT_CODE: handleChange('studentCode', value); break;
      case TabOption.CUSTOM: handleChange('customInstructions', value); break;
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
      case TabOption.QUESTION: return 'Write here the question...';
      case TabOption.SOLUTION: return 'Write here the master solution...';
      case TabOption.RUBRIC: return 'Write here the rubric...';
      case TabOption.STUDENT_CODE: return 'Write here the student code...';
      case TabOption.CUSTOM: return 'Write here the custom instructions...';
      default: return 'Write here...';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full border border-gray-100 overflow-hidden">
      {/* Student Selector Header */}
      <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
        <label className="text-sm font-semibold text-indigo-900 flex items-center">
          <span className="mr-2">🎓</span> Grading for:
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
        <div className="ml-4 text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-1 rounded">
          Target: {currentExerciseName}
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