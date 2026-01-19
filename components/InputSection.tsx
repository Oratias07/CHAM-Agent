
import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  darkMode?: boolean;
}

interface HistoryState {
  stack: string[];
  pointer: number;
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
  darkMode
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tabHistories, setTabHistories] = useState<Record<TabOption, HistoryState>>({
    [TabOption.QUESTION]: { stack: [activeExercise.question || ''], pointer: 0 },
    [TabOption.SOLUTION]: { stack: [activeExercise.masterSolution || ''], pointer: 0 },
    [TabOption.RUBRIC]: { stack: [activeExercise.rubric || ''], pointer: 0 },
    [TabOption.STUDENT_ANSWER]: { stack: [studentCode || ''], pointer: 0 },
    [TabOption.CUSTOM]: { stack: [activeExercise.customInstructions || ''], pointer: 0 },
  });

  const skipHistoryRef = useRef(false);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTabHistories({
      [TabOption.QUESTION]: { stack: [activeExercise.question || ''], pointer: 0 },
      [TabOption.SOLUTION]: { stack: [activeExercise.masterSolution || ''], pointer: 0 },
      [TabOption.RUBRIC]: { stack: [activeExercise.rubric || ''], pointer: 0 },
      [TabOption.STUDENT_ANSWER]: { stack: [studentCode || ''], pointer: 0 },
      [TabOption.CUSTOM]: { stack: [activeExercise.customInstructions || ''], pointer: 0 },
    });
  }, [activeExercise.id, selectedStudentId]);

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const getActiveValue = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return activeExercise.question || '';
      case TabOption.SOLUTION: return activeExercise.masterSolution || '';
      case TabOption.RUBRIC: return activeExercise.rubric || '';
      case TabOption.STUDENT_ANSWER: return studentCode || '';
      case TabOption.CUSTOM: return activeExercise.customInstructions || '';
      default: return '';
    }
  };

  const pushToHistory = (tab: TabOption, newVal: string) => {
    if (skipHistoryRef.current) return;
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => {
      setTabHistories(prev => {
        const current = prev[tab];
        if (current.stack[current.pointer] === newVal) return prev;
        const newStack = current.stack.slice(0, current.pointer + 1);
        newStack.push(newVal);
        if (newStack.length > 50) newStack.shift();
        return { ...prev, [tab]: { stack: newStack, pointer: newStack.length - 1 } };
      });
    }, 400);
  };

  const undo = () => {
    const hist = tabHistories[activeTab];
    if (hist.pointer > 0) {
      skipHistoryRef.current = true;
      const prevVal = hist.stack[hist.pointer - 1];
      setTabHistories(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], pointer: hist.pointer - 1 } }));
      applyValue(prevVal);
      setTimeout(() => { skipHistoryRef.current = false; }, 50);
    }
  };

  const redo = () => {
    const hist = tabHistories[activeTab];
    if (hist.pointer < hist.stack.length - 1) {
      skipHistoryRef.current = true;
      const nextVal = hist.stack[hist.pointer + 1];
      setTabHistories(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], pointer: hist.pointer + 1 } }));
      applyValue(nextVal);
      setTimeout(() => { skipHistoryRef.current = false; }, 50);
    }
  };

  const applyValue = (val: string) => {
    switch (activeTab) {
      case TabOption.QUESTION: onUpdateExerciseData('question', val); break;
      case TabOption.SOLUTION: onUpdateExerciseData('masterSolution', val); break;
      case TabOption.RUBRIC: onUpdateExerciseData('rubric', val); break;
      case TabOption.STUDENT_ANSWER: setStudentCode(val); break;
      case TabOption.CUSTOM: onUpdateExerciseData('customInstructions', val); break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    applyValue(newVal);
    pushToHistory(activeTab, newVal);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const val = ev.target?.result as string;
        applyValue(val);
        pushToHistory(activeTab, val);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [tabHistories, activeTab]);

  const currentVal = getActiveValue();
  const lineCount = currentVal.split('\n').length;

  const tabs = [
    { id: TabOption.QUESTION, label: 'Problem', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { id: TabOption.SOLUTION, label: 'Standard', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
    )},
    { id: TabOption.RUBRIC, label: 'Rubric', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )},
    { id: TabOption.STUDENT_ANSWER, label: 'Submission', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    )},
    { id: TabOption.CUSTOM, label: 'Advanced', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 4a2 2 0 100-4m0 4a2 2 0 110-4m-6 0a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m-6-2v2m-6-2v2" /></svg>
    )},
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-8 py-6 flex flex-wrap items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-6 flex-grow min-w-[300px]">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Definition</label>
            <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent text-slate-900 dark:text-slate-100 text-sm font-bold border-none p-0 focus:ring-0 cursor-pointer">
              {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={onAddExercise} className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 bg-white dark:bg-slate-900 px-6 py-3 rounded-xl hover:bg-brand-600 hover:text-white transition-all shadow-sm">
          + New Exercise
        </button>
      </div>

      <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800/40 flex items-center bg-white dark:bg-slate-900/50 justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Entity</label>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 py-2 px-4 focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="">Choose student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex space-x-2">
           <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
            title="Import File"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
           </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 px-8 pt-4 flex space-x-1 overflow-x-auto transition-all">
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-6 py-4 text-[10px] font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center space-x-3 border-b-2 uppercase tracking-widest ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 border-brand-500' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-grow relative flex overflow-hidden">
        <div className="absolute top-6 right-8 flex space-x-3 z-20">
          <button 
            onClick={undo} 
            disabled={tabHistories[activeTab].pointer <= 0} 
            className="p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button 
            onClick={redo} 
            disabled={tabHistories[activeTab].pointer >= tabHistories[activeTab].stack.length - 1} 
            className="p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
          </button>
        </div>

        <div ref={gutterRef} className="w-14 bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-300 dark:text-slate-600 py-10 px-2 text-right select-none overflow-hidden" style={{ lineHeight: '1.75rem' }}>
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>

        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-10 text-sm font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-none outline-none resize-none custom-scrollbar transition-all whitespace-pre overflow-y-auto" 
          style={{ lineHeight: '1.75rem' }}
          value={currentVal} 
          onChange={handleInputChange} 
          placeholder="Enter context data or code here..." 
        />
        
        <div className="absolute bottom-10 right-10">
           <button 
            onClick={onEvaluate} 
            disabled={isEvaluating} 
            className={`flex items-center space-x-3 px-10 py-5 rounded-2xl font-bold text-white shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isEvaluating ? 'bg-slate-400' : 'bg-brand-600 hover:bg-brand-700'}`}
           >
            {isEvaluating ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="uppercase tracking-widest text-xs">Run Evaluation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
