
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
  
  // History per tab
  const [tabHistories, setTabHistories] = useState<Record<TabOption, HistoryState>>({
    [TabOption.QUESTION]: { stack: [activeExercise.question || ''], pointer: 0 },
    [TabOption.SOLUTION]: { stack: [activeExercise.masterSolution || ''], pointer: 0 },
    [TabOption.RUBRIC]: { stack: [activeExercise.rubric || ''], pointer: 0 },
    [TabOption.STUDENT_ANSWER]: { stack: [studentCode || ''], pointer: 0 },
    [TabOption.CUSTOM]: { stack: [activeExercise.customInstructions || ''], pointer: 0 },
  });

  const skipHistoryRef = useRef(false);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize history when external state changes (exercise/student switch)
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
        return {
          ...prev,
          [tab]: { stack: newStack, pointer: newStack.length - 1 }
        };
      });
    }, 400);
  };

  const undo = () => {
    const hist = tabHistories[activeTab];
    if (hist.pointer > 0) {
      skipHistoryRef.current = true;
      const prevVal = hist.stack[hist.pointer - 1];
      
      setTabHistories(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], pointer: hist.pointer - 1 }
      }));

      applyValue(prevVal);
      setTimeout(() => { skipHistoryRef.current = false; }, 50);
    }
  };

  const redo = () => {
    const hist = tabHistories[activeTab];
    if (hist.pointer < hist.stack.length - 1) {
      skipHistoryRef.current = true;
      const nextVal = hist.stack[hist.pointer + 1];
      
      setTabHistories(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], pointer: hist.pointer + 1 }
      }));

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
    { id: TabOption.QUESTION, label: 'Question', icon: '❓' },
    { id: TabOption.SOLUTION, label: 'Master Solution', icon: '🔑' },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: '📋' },
    { id: TabOption.STUDENT_ANSWER, label: 'Student Answer', icon: '🧑‍💻' },
    { id: TabOption.CUSTOM, label: 'Custom Instr.', icon: '⚙️' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-5 flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-4 flex-grow min-w-[250px]">
          <div className="bg-brand-100 dark:bg-brand-900/40 p-2.5 rounded-2xl text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="flex flex-col flex-grow">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Focus Space</span>
            <div className="flex items-center space-x-3">
              <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent text-slate-800 dark:text-slate-100 text-sm font-black border-none p-0 focus:ring-0 cursor-pointer">
                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button onClick={onAddExercise} className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border-2 border-brand-100 dark:border-brand-900/50 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl hover:bg-brand-600 hover:text-white transition-all">+ New Exercise</button>
      </div>

      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center bg-white dark:bg-slate-900/50">
        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-4">Target:</span>
        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-grow max-w-[320px] bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 py-2.5 px-4">
          <option value="">Select student...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 px-6 pt-4 flex space-x-2 overflow-x-auto transition-all">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-[10px] font-black rounded-t-2xl transition-all whitespace-nowrap flex items-center space-x-2 border-b-2 uppercase tracking-widest ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 border-brand-500 dark:border-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 border-transparent'}`}>
            <span className="text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={`flex-grow relative flex overflow-hidden`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const val = ev.target?.result as string;
            applyValue(val);
            pushToHistory(activeTab, val);
          };
          reader.readAsText(file);
        }
      }}>
        <div className="absolute top-4 right-8 flex space-x-2 z-20">
          <button 
            onClick={undo} 
            disabled={tabHistories[activeTab].pointer <= 0} 
            title="Undo (Ctrl+Z)"
            className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm text-slate-400 hover:text-brand-500 disabled:opacity-30 transition-all active:scale-95"
          >
            ↩️
          </button>
          <button 
            onClick={redo} 
            disabled={tabHistories[activeTab].pointer >= tabHistories[activeTab].stack.length - 1} 
            title="Redo (Ctrl+Y)"
            className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm text-slate-400 hover:text-brand-500 disabled:opacity-30 transition-all active:scale-95"
          >
            ↪️
          </button>
        </div>

        <div ref={gutterRef} className="w-12 bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-400 dark:text-slate-500 py-8 px-2 text-right select-none overflow-hidden" style={{ lineHeight: '1.625rem' }}>
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>

        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-8 text-sm font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-none outline-none resize-none custom-scrollbar transition-all whitespace-pre overflow-y-auto" 
          style={{ lineHeight: '1.625rem' }}
          value={currentVal} 
          onChange={handleInputChange} 
          placeholder="Paste content here..." 
        />
        
        <div className="absolute bottom-10 right-10 flex flex-col items-end space-y-4">
           <button onClick={onEvaluate} disabled={isEvaluating} className={`flex items-center space-x-4 px-12 py-5 rounded-3xl font-black text-white shadow-2xl transition-all transform hover:scale-[1.04] active:scale-95 ${isEvaluating ? 'bg-slate-400' : 'bg-gradient-to-br from-brand-500 to-indigo-700'}`}>
            {isEvaluating ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <><span className="text-xl">✨</span><span className="uppercase tracking-widest text-xs">Evaluate</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
