import React, { useState, useEffect, useCallback } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import Login from './components/Login';
import { apiService } from './services/apiService';
import { GradingInputs, GradingResult, TabOption, GradeBookState, Exercise, User, ArchiveSession } from './types';
import { 
  INITIAL_GRADEBOOK_STATE
} from './constants';

type ViewMode = 'SINGLE' | 'SHEETS' | 'HISTORY';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('SINGLE');
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.QUESTION);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  });

  const [archives, setArchives] = useState<ArchiveSession[]>([]);
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(INITIAL_GRADEBOOK_STATE);
  const [historyStack, setHistoryStack] = useState<GradeBookState[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    INITIAL_GRADEBOOK_STATE.students.length > 0 ? INITIAL_GRADEBOOK_STATE.students[0].id : ''
  );
  
  const [activeExerciseId, setActiveExerciseId] = useState<string>(INITIAL_GRADEBOOK_STATE.exercises[0].id);
  const [studentCode, setStudentCode] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const pushToHistory = useCallback((newState: GradeBookState) => {
    setHistoryStack(prev => {
      const newStack = [JSON.parse(JSON.stringify(gradeBookState)), ...prev].slice(0, 10);
      return newStack;
    });
  }, [gradeBookState]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const history = await apiService.getGradebook();
          if (history) setGradeBookState(history);
          const arch = await apiService.getArchives();
          setArchives(arch.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      } catch (e) {
        console.error("Session check failed", e);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDevLogin = async () => {
    localStorage.setItem('ST_DEV_MODE', 'true');
    const mockUser = await apiService.getCurrentUser();
    setUser(mockUser);
    const history = await apiService.getGradebook();
    if (history) setGradeBookState(history);
  };

  const handleLogout = () => {
    localStorage.removeItem('ST_DEV_MODE');
    localStorage.removeItem('ST_MOCK_GRADES');
    window.location.href = "/api/auth/logout";
  };

  const currentExercise = gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0];

  const handleUpdateExerciseData = (field: keyof Exercise, value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === activeExerciseId ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const handleEvaluate = async () => {
    if (!user) return;
    setIsEvaluating(true);
    setError(null);
    setResult(null);

    const inputs: GradingInputs = {
      question: currentExercise.question,
      masterSolution: currentExercise.masterSolution,
      rubric: currentExercise.rubric,
      customInstructions: currentExercise.customInstructions,
      studentCode: studentCode
    };

    try {
      pushToHistory(gradeBookState);
      const evaluation = await apiService.evaluate(inputs);
      setResult(evaluation);

      if (selectedStudentId) {
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'score', evaluation.score);
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'feedback', evaluation.feedback);
        await apiService.saveGrade(activeExerciseId, selectedStudentId, evaluation);
        setStudentCode('');

        const currentIndex = gradeBookState.students.findIndex(s => s.id === selectedStudentId);
        if (currentIndex !== -1 && currentIndex < gradeBookState.students.length - 1) {
          setSelectedStudentId(gradeBookState.students[currentIndex + 1].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateEntry = (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const currentEntry = ex.entries[studentId] || { score: 0, feedback: '' };
        return {
          ...ex,
          entries: { ...ex.entries, [studentId]: { ...currentEntry, [field]: value } }
        };
      })
    }));
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const [lastVersion, ...remaining] = historyStack;
    setGradeBookState(lastVersion);
    setHistoryStack(remaining);
  };

  const handleReset = async () => {
    if (window.confirm("⚠️ RESTART SYSTEM: This will ARCHIVE your current session and COMPLETELY DELETE all current exercises and grades. You will start fresh at Exercise 1. Proceed?")) {
      try {
        setIsResetting(true);
        await apiService.archiveSession(gradeBookState);
        await apiService.clearAllData();
        
        const freshState = JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE));
        setGradeBookState(freshState);
        setStudentCode('');
        setResult(null);
        setError(null);
        setHistoryStack([]);
        setSelectedStudentId(freshState.students[0].id);
        setActiveExerciseId(freshState.exercises[0].id);
        setViewMode('SINGLE');
        setActiveTab(TabOption.QUESTION);
        
        const arch = await apiService.getArchives();
        setArchives(arch.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        
        alert("System Restarted. All data cleared and workspace reset.");
      } catch (e) {
        console.error("Restart failed", e);
        alert("System restart failed. Please check your connection.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleUpdateStudentName = (id: string, newName: string) => {
    setGradeBookState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === id ? { ...s, name: newName } : s)
    }));
  };

  const handleUpdateMaxScore = (exerciseId: string, newMax: number) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === exerciseId ? { ...ex, maxScore: newMax } : ex)
    }));
  };

  const handleAddExercise = () => {
    pushToHistory(gradeBookState);
    const nextNum = gradeBookState.exercises.length + 1;
    const newId = `ex-${nextNum}-${Date.now()}`;
    const lastEx = gradeBookState.exercises[gradeBookState.exercises.length - 1];

    const newExercise: Exercise = {
      id: newId,
      name: `Exercise ${nextNum}`,
      maxScore: 10,
      entries: {},
      question: '',
      masterSolution: '',
      rubric: lastEx ? lastEx.rubric : '',
      customInstructions: lastEx ? lastEx.customInstructions : ''
    };

    setGradeBookState(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));

    setActiveExerciseId(newId);
    setStudentCode('');
    setResult(null);
    setError(null);
    setViewMode('SINGLE');
    setActiveTab(TabOption.QUESTION);
  };

  const handleAddStudent = () => {
    pushToHistory(gradeBookState);
    setGradeBookState(prev => ({
      ...prev,
      students: [
        ...prev.students,
        { id: `student-${prev.students.length + 1}-${Date.now()}`, name: `Student ${prev.students.length + 1}` }
      ]
    }));
  };

  const restoreArchive = async (session: ArchiveSession) => {
    if (window.confirm("Restore this snapshot? Current session data will be overwritten and this state will become the live session.")) {
      try {
        setIsEvaluating(true);
        // Wipe current live data
        await apiService.clearAllData();
        
        // Restore exercises and grades to DB
        for (const exercise of session.state.exercises) {
          for (const studentId of Object.keys(exercise.entries)) {
            const entry = exercise.entries[studentId];
            await apiService.saveGrade(exercise.id, studentId, {
              score: entry.score,
              feedback: entry.feedback
            });
          }
        }
        
        setGradeBookState(session.state);
        setActiveExerciseId(session.state.exercises[0].id);
        setSelectedStudentId(session.state.students[0].id);
        setViewMode('SINGLE');
        alert("Archive restored and synced to cloud.");
      } catch (e) {
        alert("Restore failed during sync.");
      } finally {
        setIsEvaluating(false);
      }
    }
  };

  if (!user) return <Login onLogin={handleLogin} onDevLogin={handleDevLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-40 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[150px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[150px] rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <header className="glass border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">AI</div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 hidden sm:block">CodeGrader Pro</h1>
              <span className="text-[10px] uppercase tracking-tighter text-slate-400 dark:text-slate-500 font-bold leading-none hidden sm:block">Enterprise Assessment Core</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
             <button onClick={handleUndo} disabled={historyStack.length === 0} className="p-2 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-30" title="Undo Last Change">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
             </button>

             <button onClick={() => setViewMode(viewMode === 'HISTORY' ? 'SINGLE' : 'HISTORY')} className={`p-2 rounded-lg transition-all ${viewMode === 'HISTORY' ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="History Timeline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>

             <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {darkMode ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
             </button>

             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

             <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center">
                <button onClick={() => setViewMode('SINGLE')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'SINGLE' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Grader</button>
                <button onClick={() => setViewMode('SHEETS')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${viewMode === 'SHEETS' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Sheets</button>
             </div>

             <div className="flex items-center space-x-2 pl-2 sm:pl-4">
                <button onClick={handleLogout} className="group relative flex items-center">
                  <img src={user.picture} className="w-8 h-8 rounded-full border-2 border-brand-100 dark:border-slate-800 group-hover:border-red-400 transition-all shadow-sm" alt="Avatar" />
                  <div className="absolute inset-0 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold transition-opacity">OFF</div>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 w-full z-10 overflow-hidden">
        {viewMode === 'SINGLE' ? (
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 h-[calc(100vh-10rem)] min-h-[650px] w-full">
            <section className="xl:col-span-3 h-full overflow-hidden order-2 xl:order-1">
              <ResultSection result={result} error={error} isEvaluating={isEvaluating} darkMode={darkMode} />
            </section>
            <section className="xl:col-span-7 h-full overflow-hidden order-1 xl:order-2">
              <InputSection 
                activeExercise={currentExercise}
                onUpdateExerciseData={handleUpdateExerciseData}
                studentCode={studentCode}
                setStudentCode={setStudentCode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isEvaluating={isEvaluating}
                onEvaluate={handleEvaluate}
                students={gradeBookState.students}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                exercises={gradeBookState.exercises}
                setActiveExerciseId={setActiveExerciseId}
                onAddExercise={handleAddExercise}
                darkMode={darkMode}
              />
            </section>
          </div>
        ) : viewMode === 'SHEETS' ? (
          <div className="h-[calc(100vh-10rem)] min-h-[650px] w-full">
            <GradeBook 
              state={gradeBookState}
              onUpdateStudentName={handleUpdateStudentName}
              onUpdateMaxScore={handleUpdateMaxScore}
              onUpdateEntry={handleUpdateEntry}
              onAddExercise={handleAddExercise}
              onAddStudent={handleAddStudent}
              onResetSystem={handleReset}
              isResetting={isResetting}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-10rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 w-full">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-tighter">
                 <span className="mr-4 text-3xl">🕒</span> Session Archive Timeline
               </h2>
               <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{archives.length} snapshots total</span>
             </div>
             <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {archives.length === 0 ? (
                     <div className="col-span-full py-32 text-center">
                        <div className="text-6xl mb-6 opacity-20">📂</div>
                        <div className="text-slate-400 dark:text-slate-500 font-bold text-lg">No sessions archived yet.</div>
                        <p className="text-slate-500 dark:text-slate-600 text-sm mt-2">Previous sessions appear here after a system restart.</p>
                     </div>
                   ) : (
                     archives.map(arch => (
                       <div key={arch._id} className="p-6 border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-800/40 hover:border-brand-300 dark:hover:border-brand-900 transition-all group flex flex-col shadow-sm hover:shadow-md">
                          <div className="flex justify-between items-start mb-6">
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1">{new Date(arch.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                               <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{new Date(arch.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl flex flex-col items-center">
                                <span className="text-lg font-black text-brand-500">{arch.state.exercises.length}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ex</span>
                             </div>
                          </div>
                          <button onClick={() => restoreArchive(arch)} className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950 dark:hover:text-brand-400 transition-all shadow-sm">Restore Snapshot</button>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        )}
      </main>
      <ChatBot darkMode={darkMode} />
    </div>
  );
};

export default App;