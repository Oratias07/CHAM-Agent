
import React, { useRef } from 'react';
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
  onAddExercise,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) gutterRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  const currentVal = (() => {
    switch (activeTab) {
      case TabOption.QUESTION: return activeExercise.question || '';
      case TabOption.SOLUTION: return activeExercise.masterSolution || '';
      case TabOption.RUBRIC: return activeExercise.rubric || '';
      case TabOption.STUDENT_ANSWER: return studentCode || '';
      case TabOption.CUSTOM: return activeExercise.customInstructions || '';
      default: return '';
    }
  })();

  const handleChange = (val: string) => {
    switch (activeTab) {
      case TabOption.QUESTION: onUpdateExerciseData('question', val); break;
      case TabOption.SOLUTION: onUpdateExerciseData('masterSolution', val); break;
      case TabOption.RUBRIC: onUpdateExerciseData('rubric', val); break;
      case TabOption.STUDENT_ANSWER: setStudentCode(val); break;
      case TabOption.CUSTOM: onUpdateExerciseData('customInstructions', val); break;
    }
  };

  const tabs = [
    { id: TabOption.QUESTION, label: 'Problem', icon: '❓' },
    { id: TabOption.SOLUTION, label: 'Standard', icon: '🔑' },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: '📝' },
    { id: TabOption.STUDENT_ANSWER, label: 'Submission', icon: '💻' },
    { id: TabOption.CUSTOM, label: 'Advanced', icon: '⚙️' },
  ];

  const lineCount = currentVal.split('\n').length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-8 py-6 flex items-center justify-between border-b dark:border-slate-800">
        <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent font-bold">
          {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <button onClick={onAddExercise} className="text-xs font-bold text-brand-600">+ New Exercise</button>
      </div>

      <div className="px-8 py-4 border-b dark:border-slate-800 flex items-center justify-between">
        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="text-xs font-bold py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-brand-500 text-brand-600 bg-white dark:bg-slate-900' : 'border-transparent text-slate-400'}`}>
            <span className="mr-2">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow relative flex overflow-hidden">
        <div ref={gutterRef} className="w-12 bg-slate-50 dark:bg-slate-800/40 border-r dark:border-slate-800 text-[10px] font-mono text-slate-400 py-10 text-right pr-2 overflow-hidden" style={{ lineHeight: '1.75rem' }}>
          {Array.from({ length: lineCount }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-10 text-sm font-mono bg-white dark:bg-slate-900 outline-none resize-none overflow-y-auto" 
          style={{ lineHeight: '1.75rem' }}
          value={currentVal} 
          onChange={(e) => handleChange(e.target.value)} 
          placeholder="Enter content here..." 
        />
        <button onClick={onEvaluate} disabled={isEvaluating} className="absolute bottom-10 right-10 px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all">
          {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
        </button>
      </div>
    </div>
  );
};

export default InputSection;
