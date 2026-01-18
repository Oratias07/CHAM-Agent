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
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  
  // Undo/Redo Logic for Student Code
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isInternalUpdate = useRef(false);

  // Initialize history when student or exercise changes
  useEffect(() => {
    isInternalUpdate.current = true;
    setCodeHistory([studentCode]);
    setHistoryIndex(0);
    setTimeout(() => { isInternalUpdate.current = false; }, 0);
  }, [selectedStudentId, activeExercise.id]);

  // Sync scroll between textarea and gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCodeChange = (newCode: string) => {
    setStudentCode(newCode);
    
    if (!isInternalUpdate.current) {
      const newHistory = codeHistory.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      
      // Limit history to 100 entries
      const finalHistory = newHistory.length > 100 ? newHistory.slice(1) : newHistory;
      
      setCodeHistory(finalHistory);
      setHistoryIndex(finalHistory.length - 1);
    }
  };

  const undoCode = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevCode = codeHistory[prevIndex];
      isInternalUpdate.current = true;
      setStudentCode(prevCode);
      setHistoryIndex(prevIndex);
      setTimeout(() => { isInternalUpdate.current = false; }, 0);
    }
  };

  const redoCode = () => {
    if (historyIndex < codeHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextCode = codeHistory[nextIndex];
      isInternalUpdate.current = true;
      setStudentCode(nextCode);
      setHistoryIndex(nextIndex);
      setTimeout(() => { isInternalUpdate.current = false; }, 0);
    }
  };

  // Shortcut support for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === TabOption.STUDENT_ANSWER && (e.metaKey || e.ctrlKey)) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redoCode();
          else undoCode();
        } else if (e.key === 'y') {
          e.preventDefault();
          redoCode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, codeHistory, activeTab]);

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

  const setActiveValue = (value: string) => {
    switch (activeTab) {
      case TabOption.QUESTION: onUpdateExerciseData('question', value); break;
      case TabOption.SOLUTION: onUpdateExerciseData('masterSolution', value); break;
      case TabOption.RUBRIC: onUpdateExerciseData('rubric', value); break;
      case TabOption.STUDENT_ANSWER: handleCodeChange(value); break;
      case TabOption.CUSTOM: onUpdateExerciseData('customInstructions', value); break;
    }
  };

  const currentVal = getActiveValue();
  const lineCount = currentVal.split('\n').length;

  const tabs = [
    { id: TabOption.QUESTION, label: 'Question', icon: '❓' },
    { id: TabOption.SOLUTION, label: 'Master Solution', icon: '🔑' },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: '📋' },
    { id: TabOption.STUDENT_ANSWER, label: 'Student Answer', icon: '🧑‍💻' },
    { id: TabOption.CUSTOM, label: 'Custom Instr.', icon: '⚙️' },
  ];

  const getPlaceholder = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return 'Paste instructions...';
      case TabOption.SOLUTION: return 'Drop a .c file or paste solution...';
      case TabOption.RUBRIC: return 'Define criteria...';
      case TabOption.STUDENT_ANSWER: return 'Paste student code...';
      case TabOption.CUSTOM: return 'Special constraints...';
      default: return 'Type here...';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeTab !== TabOption.STUDENT_ANSWER && activeTab !== TabOption.SOLUTION) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith('.c') || file.name.endsWith('.txt') || file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => setActiveValue(event.target?.result as string);
      reader.readAsText(file);
    }
  }, [activeTab, activeExercise, studentCode]);

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
                {exercises.map(ex => <option key={ex.id} value={ex.id} className="dark:bg-slate-900">{ex.name}</option>)}
              </select>
              <input type="text" value={activeExercise.name} onChange={(e) => onUpdateExerciseData('name', e.target.value)} className="bg-brand-50/50 dark:bg-slate-950/40 text-brand-700 dark:text-brand-400 text-xs font-black border border-transparent hover:border-brand-200 rounded-lg px-2.5 py-1 outline-none" />
            </div>
          </div>
        </div>
        <button onClick={onAddExercise} className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border-2 border-brand-100 dark:border-brand-900/50 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl hover:bg-brand-600 hover:text-white transition-all">
          + New Exercise
        </button>
      </div>

      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center bg-white dark:bg-slate-900/50">
        <div className="flex items-center space-x-4 flex-grow">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target:</span>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-grow max-w-[320px] bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 py-2.5 px-4">
            <option value="">Select student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 px-6 pt-4 flex space-x-2 overflow-x-auto transition-all">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-[10px] font-black rounded-t-2xl transition-all whitespace-nowrap flex items-center space-x-2 border-b-2 uppercase tracking-widest ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 border-brand-500 dark:border-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 border-transparent'}`}>
            <span className="text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={`flex-grow relative group flex overflow-hidden ${isDragging ? 'bg-brand-50/10' : ''}`} onDrop={handleDrop} onDragOver={(e) => {e.preventDefault(); setIsDragging(true);}} onDragLeave={() => setIsDragging(false)}>
        {/* Undo/Redo Controls */}
        {activeTab === TabOption.STUDENT_ANSWER && (
          <div className="absolute top-4 right-8 flex items-center space-x-1 z-20">
            <button 
              onClick={undoCode} 
              disabled={historyIndex <= 0} 
              className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-slate-500 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors shadow-sm"
              title="Undo (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button 
              onClick={redoCode} 
              disabled={historyIndex >= codeHistory.length - 1} 
              className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-slate-500 hover:text-brand-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors shadow-sm"
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Numbered Gutter */}
        <div 
          ref={gutterRef}
          className="w-12 bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-400 dark:text-slate-500 py-8 px-2 text-right select-none overflow-hidden"
          style={{ lineHeight: '1.625rem' }}
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Editor Area */}
        <textarea 
          ref={textareaRef}
          onScroll={handleScroll}
          className="flex-grow p-8 text-sm font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-none outline-none resize-none custom-scrollbar transition-all whitespace-pre overflow-y-auto" 
          style={{ lineHeight: '1.625rem' }}
          value={currentVal} 
          onChange={(e) => setActiveValue(e.target.value)} 
          placeholder={getPlaceholder()} 
        />
        
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-brand-500/5 backdrop-blur-[2px] z-10">
             <div className="bg-white dark:bg-slate-800 px-10 py-8 rounded-[2.5rem] border-4 border-brand-500 border-dashed flex flex-col items-center animate-pulse">
                <span className="text-6xl mb-4">📄</span>
                <span className="text-sm font-black text-brand-600 uppercase tracking-widest">Drop File</span>
             </div>
          </div>
        )}

        <div className="absolute bottom-10 right-10 flex flex-col items-end space-y-4">
           <button onClick={onEvaluate} disabled={isEvaluating} className={`flex items-center space-x-4 px-12 py-5 rounded-3xl font-black text-white shadow-2xl transition-all transform hover:scale-[1.04] active:scale-95 ${isEvaluating ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-brand-500 to-indigo-700'}`}>
            {isEvaluating ? <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div><span className="uppercase tracking-widest text-xs">Processing...</span></> : <><span className="text-xl">✨</span><span className="uppercase tracking-widest text-xs">Evaluate</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;