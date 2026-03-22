
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
    switch (activeTab) {
      case TabOption.QUESTION:
        onUpdateExerciseData('question', 'Design a function to determine if a linked list has a cycle. Your solution should use O(1) extra space.');
        break;
      case TabOption.SOLUTION:
        onUpdateExerciseData('masterSolution', '/**\n * Definition for singly-linked list.\n * function ListNode(val) {\n *     this.val = val;\n *     this.next = null;\n * }\n */\n\n/**\n * @param {ListNode} head\n * @return {boolean}\n */\nvar hasCycle = function(head) {\n    if (!head || !head.next) return false;\n    let slow = head;\n    let fast = head.next;\n    while (slow !== fast) {\n        if (!fast || !fast.next) return false;\n        slow = slow.next;\n        fast = fast.next.next;\n    }\n    return true;\n};');
        break;
      case TabOption.RUBRIC:
        onUpdateExerciseData('rubric', `### GRADING CRITERIA
1. **Algorithm Choice (40%)**: Uses Floyd's Cycle-Finding algorithm (Slow/Fast pointers).
2. **Space Complexity (30%)**: Strictly O(1) auxiliary space.
3. **Edge Cases (20%)**: Handles empty list, single node, and no-cycle lists correctly.
4. **Code Quality (10%)**: Clean logic and readable pointer manipulation.`);
        break;
      case TabOption.CUSTOM:
        onUpdateExerciseData('customInstructions', 'Evaluate the student\'s understanding of pointer-based data structures. If they use a Hash Set, penalize the space complexity score but acknowledge the functional correctness.');
        break;
    }
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
    { id: TabOption.QUESTION, label: 'שאלה', sub: 'תיאור המשימה', icon: <Icons.Problem /> },
    { id: TabOption.SOLUTION, label: 'פתרון', sub: 'פתרון מרצה', icon: <Icons.Solution /> },
    { id: TabOption.RUBRIC, label: 'רובריקה', sub: 'קריטריונים', icon: <Icons.Rubric /> },
    { id: TabOption.STUDENT_ANSWER, label: 'הגשה', sub: 'קוד סטודנט', icon: <Icons.Submission /> },
    { id: TabOption.CUSTOM, label: 'מתקדם', sub: 'הגדרות AI', icon: <Icons.Advanced /> },
  ];

  const lineCount = currentVal.split('\n').length;

  return (
    <div className="bg-white dark:bg-slate-850 rounded-[2.5rem] shadow-2xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500">
      <div className="bg-zinc-50/50 dark:bg-slate-900/40 px-10 py-6 flex items-center justify-between border-b dark:border-slate-800">
        <div className="flex items-center space-x-6">
          <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-lg shadow-brand-500/20 shrink-0">ST</div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1" dir="rtl">הקשר פעיל</span>
            <select 
              value={activeExercise.id} 
              onChange={(e) => setActiveExerciseId(e.target.value)} 
              className="bg-transparent font-black text-xl text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-brand-600 transition-colors appearance-none"
            >
              {exercises.map(ex => <option key={ex.id} value={ex.id} className="dark:bg-slate-800 font-sans text-base">{ex.name}</option>)}
            </select>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
          <button onClick={onAddExercise} className="group flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors" dir="rtl">
            <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">+</span>
            <span>תרגיל חדש</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="flex flex-col items-end">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1" dir="rtl">מצב עבודה</span>
             <label className="flex items-center space-x-3 cursor-pointer group" dir="rtl">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">מעבר אוטומטי</span>
               <div className="relative">
                 <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} className="sr-only" />
                 <div className={`w-10 h-5 rounded-full transition-colors ${autoAdvance ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                 <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${autoAdvance ? 'translate-x-5' : ''}`}></div>
               </div>
             </label>
          </div>
        </div>
      </div>

      <div className="px-10 py-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-850">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
               <Icons.Submission />
            </div>
            <select 
              value={selectedStudentId} 
              onChange={(e) => setSelectedStudentId(e.target.value)} 
              className="text-xs font-black py-2.5 px-5 bg-zinc-50 dark:bg-slate-800/50 border border-zinc-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 dark:text-slate-200 min-w-[220px] uppercase tracking-wider"
            >
              {students.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-800">{s.name}</option>)}
            </select>
          </div>
          <button onClick={handleNextStudent} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-xl border border-transparent hover:border-brand-100 transition-all" title="Next Student">
            <Icons.ChevronRight />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {activeTab !== TabOption.STUDENT_ANSWER && (
            <button 
              onClick={handleLoadExample}
              className="flex items-center space-x-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-2.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm active:scale-95"
            >
              <Icons.Light />
              <span dir="rtl">טען דוגמה: {tabs.find(t => t.id === activeTab)?.label}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b dark:border-slate-800 bg-zinc-50/10 dark:bg-slate-900/10 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-10 py-6 flex flex-col items-start border-b-2 transition-all shrink-0 relative ${
              activeTab === tab.id 
                ? 'border-slate-600 dark:border-slate-400 text-slate-900 dark:text-white bg-white dark:bg-slate-850' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center space-x-3 mb-1">
              <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 text-slate-900 dark:text-white' : 'text-slate-400'}`}>{tab.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 ml-7">{tab.sub}</span>
            {activeTab === tab.id && <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-900/5 dark:bg-white/5 blur-sm"></div>}
          </button>
        ))}
      </div>

      <div className="flex-grow relative flex overflow-hidden border-b dark:border-slate-800">
        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-10 text-sm font-mono bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 outline-none resize-none overflow-y-auto custom-scrollbar selection:bg-brand-100 dark:selection:bg-brand-900/50 placeholder:text-slate-300 dark:placeholder:text-slate-700 whitespace-pre-wrap break-words" 
          style={{ lineHeight: '1.8rem', minHeight: '18rem' }}
          value={currentVal} 
          onChange={(e) => handleChange(e.target.value)} 
          placeholder={`הכנס ${tabs.find(t => t.id === activeTab)?.label} כאן...`}
          rows={10}
        />
      </div>

      <div className="px-10 py-6 bg-zinc-50/30 dark:bg-slate-900/20 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-6">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1" dir="rtl">סטטוס עורך</span>
            <div className="flex items-center space-x-2 space-x-reverse" dir="rtl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">סנכרון פעיל</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1" dir="rtl">שורות</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{lineCount}</span>
          </div>
        </div>

        <button 
          onClick={onEvaluate} 
          disabled={isEvaluating || !studentCode.trim()} 
          className="group relative px-12 py-5 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl font-black uppercase tracking-[0.25em] text-xs shadow-xl hover:bg-black dark:hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            {isEvaluating ? (
              <>
                <svg className="animate-spin -ml-1 mr-4 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                מעריך...
              </>
            ) : (
              <>
                <Icons.Light />
                <span className="ml-4" dir="rtl">הפעל הערכה</span>
              </>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
        </button>
      </div>
    </div>
  );
};

export default InputSection;
