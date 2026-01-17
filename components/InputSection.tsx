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
  
  // Undo/Redo Logic for Student Code
  const [codeHistory, setCodeHistory] = useState<string[]>([studentCode]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUpdatingHistory = useRef(false);

  // Sync initial student code into history if it changes from outside (e.g. student switch)
  useEffect(() => {
    if (!isUpdatingHistory.current) {
      setCodeHistory([studentCode]);
      setHistoryIndex(0);
    }
  }, [selectedStudentId, activeExercise.id]);

  const handleCodeChange = (newCode: string) => {
    setStudentCode(newCode);
    
    // Push to local history
    isUpdatingHistory.current = true;
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    // Limit history to 50 items
    if (newHistory.length > 50) newHistory.shift();
    
    setCodeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTimeout(() => { isUpdatingHistory.current = false; }, 0);
  };

  const undoCode = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevCode = codeHistory[prevIndex];
      isUpdatingHistory.current = true;
      setStudentCode(prevCode);
      setHistoryIndex(prevIndex);
      setTimeout(() => { isUpdatingHistory.current = false; }, 0);
    }
  };

  const redoCode = () => {
    if (historyIndex < codeHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextCode = codeHistory[nextIndex];
      isUpdatingHistory.current = true;
      setStudentCode(nextCode);
      setHistoryIndex(nextIndex);
      setTimeout(() => { isUpdatingHistory.current = false; }, 0);
    }
  };

  const getActiveValue = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return activeExercise.question;
      case TabOption.SOLUTION: return activeExercise.masterSolution;
      case TabOption.RUBRIC: return activeExercise.rubric;
      case TabOption.STUDENT_ANSWER: return studentCode;
      case TabOption.CUSTOM: return activeExercise.customInstructions;
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

  const tabs = [
    { id: TabOption.QUESTION, label: 'Question', icon: '❓' },
    { id: TabOption.SOLUTION, label: 'Master Solution', icon: '🔑' },
    { id: TabOption.RUBRIC, label: 'Rubric', icon: '📋' },
    { id: TabOption.STUDENT_ANSWER, label: 'Student Answer', icon: '🧑‍💻' },
    { id: TabOption.CUSTOM, label: 'Custom Instr.', icon: '⚙️' },
  ];

  const getPlaceholder = () => {
    switch (activeTab) {
      case TabOption.QUESTION: return 'Paste the assignment instructions...';
      case TabOption.SOLUTION: return 'Drop a .c or .txt file here or paste the reference solution...';
      case TabOption.RUBRIC: return 'Define evaluation criteria and weights...';
      case TabOption.STUDENT_ANSWER: return 'Drop student source file here or paste their code...';
      case TabOption.CUSTOM: return 'Forbidden keywords, specific bans, or pedagogical focus...';
      default: return 'Type content here...';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (activeTab !== TabOption.STUDENT_ANSWER && activeTab !== TabOption.SOLUTION) {
      return;
    }

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith('.exe')) {
      alert("⚠️ Executables are blocked for security. Please drop source code (.c) or text (.txt) files.");
      return;
    }

    if (file.name.endsWith('.c') || file.name.endsWith('.txt') || file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setActiveValue(text);
      };
      reader.readAsText(file);
    } else {
      alert("❌ Invalid File: Only .c and .txt files are supported.");
    }
  }, [activeTab, activeExercise, studentCode]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeTab === TabOption.STUDENT_ANSWER || activeTab === TabOption.SOLUTION) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
      {/* Exercise Config Header */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-5 flex flex-wrap items-center gap-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-4 flex-grow min-w-[250px]">
          <div className="bg-brand-100 dark:bg-brand-900/40 p-2.5 rounded-2xl text-brand-600 dark:text-brand-400 shadow-sm border border-brand-200 dark:border-brand-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="flex flex-col flex-grow">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Focus Space</span>
            <div className="flex items-center space-x-3">
              <select value={activeExercise.id} onChange={(e) => setActiveExerciseId(e.target.value)} className="bg-transparent text-slate-800 dark:text-slate-100 text-sm font-black border-none p-0 focus:ring-0 cursor-pointer">
                {exercises.map(ex => <option key={ex.id} value={ex.id} className="dark:bg-slate-900">{ex.name}</option>)}
              </select>
              <input 
                type="text" 
                value={activeExercise.name} 
                onChange={(e) => onUpdateExerciseData('name', e.target.value)} 
                className="bg-brand-50/50 dark:bg-slate-950/40 text-brand-700 dark:text-brand-400 text-xs font-black border border-transparent hover:border-brand-200 dark:hover:border-slate-700 rounded-lg px-2.5 py-1 outline-none transition-all focus:bg-white dark:focus:bg-slate-900" 
                placeholder="Rename Exercise"
              />
            </div>
          </div>
        </div>
        <button onClick={onAddExercise} className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 border-2 border-brand-100 dark:border-brand-900/50 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl hover:bg-brand-600 hover:text-white transition-all shadow-sm">
          + New Exercise
        </button>
      </div>

      {/* Target Selector */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/40 flex items-center bg-white dark:bg-slate-900/50">
        <div className="flex items-center space-x-4 flex-grow">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evaluation Target:</span>
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-grow max-w-[320px] bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 py-2.5 px-4 transition-all shadow-sm">
            <option value="">Select student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 px-6 pt-4 flex space-x-2 overflow-x-auto custom-scrollbar transition-all">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-[10px] font-black rounded-t-2xl transition-all whitespace-nowrap flex items-center space-x-2 border-b-2 uppercase tracking-widest ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 border-brand-500 dark:border-brand-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border-transparent hover:bg-white/40 dark:hover:bg-slate-800/40'}`}>
            <span className="text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Editor */}
      <div 
        className={`flex-grow p-6 bg-white dark:bg-slate-900 relative group transition-all duration-300 ${isDragging ? 'bg-brand-50/10' : ''}`} 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Undo/Redo Toolbar specifically for Student Answer */}
        {activeTab === TabOption.STUDENT_ANSWER && (
          <div className="absolute top-8 right-8 flex items-center space-x-1 z-20">
            <button 
              onClick={undoCode} 
              disabled={historyIndex === 0}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-brand-500 disabled:opacity-30 shadow-sm transition-all" 
              title="Undo (Code)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <button 
              onClick={redoCode} 
              disabled={historyIndex === codeHistory.length - 1}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-brand-500 disabled:opacity-30 shadow-sm transition-all" 
              title="Redo (Code)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </button>
          </div>
        )}

        <textarea 
          className={`w-full h-full p-8 text-sm font-mono text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-brand-500/10 dark:focus:ring-brand-400/10 focus:border-brand-300 dark:focus:border-brand-700 outline-none resize-none custom-scrollbar transition-all shadow-inner ${isDragging ? 'ring-2 ring-brand-500' : ''}`} 
          value={getActiveValue()} 
          onChange={(e) => setActiveValue(e.target.value)} 
          placeholder={getPlaceholder()} 
        />
        
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-brand-500/5 backdrop-blur-[2px] rounded-3xl z-10 transition-opacity">
             <div className="bg-white dark:bg-slate-800 px-10 py-8 rounded-[2.5rem] shadow-2xl border-4 border-brand-500 border-dashed flex flex-col items-center animate-pulse">
                <span className="text-6xl mb-4">📄</span>
                <span className="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Drop Source File Here</span>
             </div>
          </div>
        )}

        <div className="absolute bottom-10 right-10 flex flex-col items-end space-y-4">
           { (activeTab === TabOption.STUDENT_ANSWER || activeTab === TabOption.SOLUTION) && !isDragging && (
             <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] bg-white/90 dark:bg-slate-900/90 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all">Support for .c / .txt files</span>
           )}
           <button onClick={onEvaluate} disabled={isEvaluating} className={`flex items-center space-x-4 px-12 py-5 rounded-3xl font-black text-white shadow-2xl transition-all transform hover:scale-[1.04] active:scale-95 shadow-brand-500/30 ${isEvaluating ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70' : 'bg-gradient-to-br from-brand-500 to-indigo-700 hover:shadow-brand-500/50'}`}>
            {isEvaluating ? <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div><span className="uppercase tracking-widest text-xs">AI Assessment Core Running...</span></> : <><span className="text-xl">✨</span><span className="uppercase tracking-widest text-xs">{selectedStudentId ? 'Process & Sync Score' : 'Quick Assessment'}</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;