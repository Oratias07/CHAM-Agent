
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

const Icons = {
  Problem: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Solution: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  Rubric: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Submission: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  Advanced: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Light: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
};

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

  const handleLoadExample = () => {
    onUpdateExerciseData('rubric', `קריטריוני ניתוח והערכה (Grade Rubric)
- בדיקה פונקציונלית: עמידה בדרישות המשתנים, הקצאת ערכים וביצוע הדפסה נכונה.
- בדיקת תקינות סינטקס: הקוד נקי משגיאות קומפילציה ורץ ללא קריסות.
- קריאות קוד: שמות משתנים משמעותיים ומבנה קוד סדור.
- תיעוד: חובה לכלול הערות קוד שמסבירות את הלוגיקה.`);
    onUpdateExerciseData('question', 'כתבו תוכנית הקולטת מספר ובודקת אם הוא זוגי בטווח 1-1000.');
    onUpdateExerciseData('masterSolution', '#include <stdio.h>\nint main() {\n  int num;\n  scanf("%d", &num);\n  if(num % 2 == 0 && num >= 1 && num <= 1000) printf("Valid");\n  return 0;\n}');
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
    { id: TabOption.QUESTION, label: 'Problem', icon: <Icons.Problem /> },
    { id: TabOption.SOLUTION, label: 'Standard', icon: <Icons.Solution /> },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: <Icons.Rubric /> },
    { id: TabOption.STUDENT_ANSWER, label: 'Submission', icon: <Icons.Submission /> },
    { id: TabOption.CUSTOM, label: 'Advanced', icon: <Icons.Advanced /> },
  ];

  const lineCount = currentVal.split('\n').length;

  return (
    <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-slate-800/60 px-8 py-6 flex items-center justify-between border-b dark:border-slate-800">
        <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none">
          {exercises.map(ex => <option key={ex.id} value={ex.id} className="dark:bg-slate-800">{ex.name}</option>)}
        </select>
        <button onClick={onAddExercise} className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:underline">+ New Exercise</button>
      </div>

      <div className="px-8 py-4 border-b dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student:</span>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="text-xs font-bold py-2 bg-zinc-100 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-brand-500 outline-none text-slate-700 dark:text-slate-200">
            {students.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-800">{s.name}</option>)}
          </select>
        </div>
        {activeTab === TabOption.RUBRIC && (
          <button 
            onClick={handleLoadExample}
            className="flex items-center space-x-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Icons.Light />
            <span>Load Example Case</span>
          </button>
        )}
      </div>

      <div className="flex border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 flex items-center text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-brand-500 text-brand-600 bg-white dark:bg-slate-850' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <span className="mr-3 shrink-0">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow relative flex overflow-hidden">
        <div ref={gutterRef} className="w-12 bg-zinc-50 dark:bg-slate-800/40 border-r dark:border-slate-800 text-[10px] font-mono text-slate-400 py-10 text-right pr-2 overflow-hidden select-none" style={{ lineHeight: '1.75rem' }}>
          {Array.from({ length: lineCount }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-10 text-sm font-mono bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 outline-none resize-none overflow-y-auto custom-scrollbar" 
          style={{ lineHeight: '1.75rem' }}
          value={currentVal} 
          onChange={(e) => handleChange(e.target.value)} 
          placeholder="Enter content here..." 
        />
        <button onClick={onEvaluate} disabled={isEvaluating} className="absolute bottom-10 right-10 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50">
          {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
        </button>
      </div>
    </div>
  );
};

export default InputSection;
