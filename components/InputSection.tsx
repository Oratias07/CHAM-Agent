
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
  autoAdvance: boolean;
  setAutoAdvance: (val: boolean) => void;
}

const Icons = {
  Problem: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Solution: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  Rubric: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Submission: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  Advanced: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Light: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>,
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
  autoAdvance,
  setAutoAdvance,
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
    onUpdateExerciseData('masterSolution', '#include <stdio.h>\\nint main() {\\n  int num;\\n  scanf("%d", &num);\\n  if(num % 2 == 0 && num >= 1 && num <= 1000) printf("Valid");\\n  return 0;\\n}');
  };

  const handleNextStudent = () => {
    const currentIndex = students.findIndex(s => s.id === selectedStudentId);
    if (currentIndex !== -1 && currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
      setStudentCode('');
    }
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

  const lineCount = currentVal.split('\\n').length;

  return (
    <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-slate-800/60 px-8 py-6 flex items-center justify-between border-b dark:border-slate-800">
        <div className="flex items-center space-x-4">
          <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent font-black text-lg text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-brand-600 transition-colors">
            {exercises.map(ex => <option key={ex.id} value={ex.id} className="dark:bg-slate-800 font-sans">{ex.name}</option>)}
          </select>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
          <button onClick={onAddExercise} className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:underline">+ New Exercise</button>
        </div>
        
        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} className="sr-only" />
              <div className={`w-8 h-4 rounded-full transition-colors ${autoAdvance ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoAdvance ? 'translate-x-4' : ''}`}></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Auto-Advance</span>
          </label>
        </div>
      </div>

      <div className="px-8 py-4 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-850">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Student:</span>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="text-xs font-bold py-2 px-4 bg-zinc-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 dark:text-slate-200 min-w-[180px]">
              {students.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-800">{s.name}</option>)}
            </select>
          </div>
          <button onClick={handleNextStudent} className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-all" title="Next Student">
            <Icons.ChevronRight />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === TabOption.RUBRIC && (
            <button 
              onClick={handleLoadExample}
              className="flex items-center space-x-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Icons.Light />
              <span>Load Template</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b dark:border-slate-800 bg-zinc-50/30 dark:bg-slate-900/50 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-5 flex items-center text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all shrink-0 ${activeTab === tab.id ? 'border-brand-500 text-brand-600 bg-white dark:bg-slate-850 shadow-[inset_0_-2px_0_0_rgba(59,130,246,0.5)]' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <span className={`mr-3 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow relative flex overflow-hidden">
        <div ref={gutterRef} className="w-14 bg-zinc-50 dark:bg-slate-900/50 border-r dark:border-slate-800 text-[10px] font-mono text-slate-400 py-10 text-right pr-4 overflow-hidden select-none" style={{ lineHeight: '1.75rem' }}>
          {Array.from({ length: Math.max(lineCount, 20) }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-10 text-sm font-mono bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 outline-none resize-none overflow-y-auto custom-scrollbar selection:bg-brand-100 dark:selection:bg-brand-900/50" 
          style={{ lineHeight: '1.75rem' }}
          value={currentVal} 
          onChange={(e) => handleChange(e.target.value)} 
          placeholder={`Enter \${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} content here...`} 
        />
        
        <div className="absolute bottom-10 right-10 flex items-center space-x-4">
          <button 
            onClick={onEvaluate} 
            disabled={isEvaluating || !studentCode.trim()} 
            className="group relative px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="relative z-10 flex items-center">
              {isEvaluating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Icons.Light />
                  <span className="ml-3">Execute Core Evaluation</span>
                </>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
