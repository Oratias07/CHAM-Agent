
import React, { useState, useEffect, useMemo } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import { apiService } from './services/apiService';
import { GradingInputs, GradingResult, TabOption, GradeBookState, Exercise, User, ArchiveSession } from './types';
import { INITIAL_GRADEBOOK_STATE } from './constants';

type ViewMode = 'SINGLE' | 'SHEETS' | 'HISTORY';

interface LecturerDashboardProps {
  user: User;
}

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user }) => {
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
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(() => JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE)));
  
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const gradesFromDb = await apiService.getGradebook();
        if (gradesFromDb && Array.isArray(gradesFromDb)) {
          setGradeBookState(prev => {
            const newState = { ...prev };
            gradesFromDb.forEach((grade: any) => {
              const exercise = newState.exercises.find(ex => ex.id === grade.exerciseId);
              if (exercise) {
                if (!exercise.entries) exercise.entries = {};
                exercise.entries[grade.studentId] = { score: grade.score, feedback: grade.feedback };
              }
            });
            return { ...newState };
          });
        }
        const arch = await apiService.getArchives();
        setArchives(arch);
      } catch (e) {
        console.error("Data load failed", e);
      }
    };
    loadData();
  }, []);

  const currentExercise = useMemo(() => {
    return gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0];
  }, [gradeBookState.exercises, activeExerciseId]);

  const handleUpdateExerciseData = (field: keyof Exercise, value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === activeExerciseId ? { ...ex, [field]: value } : ex)
    }));
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    setResult(null);
    const inputs: GradingInputs = {
      question: currentExercise.question,
      masterSolution: currentExercise.masterSolution,
      rubric: currentExercise.rubric,
      customInstructions: currentExercise.customInstructions,
      studentCode
    };
    try {
      const evaluation = await apiService.evaluate(inputs);
      setResult(evaluation);
      if (selectedStudentId) {
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'score', evaluation.score);
        handleUpdateEntry(activeExerciseId, selectedStudentId, 'feedback', evaluation.feedback);
        await apiService.saveGrade(activeExerciseId, selectedStudentId, evaluation);
        
        const currentIndex = gradeBookState.students.findIndex(s => s.id === selectedStudentId);
        if (currentIndex !== -1 && currentIndex < gradeBookState.students.length - 1) {
          setSelectedStudentId(gradeBookState.students[currentIndex + 1].id);
          setStudentCode('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateEntry = (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const currentEntries = ex.entries || {};
        const currentEntry = currentEntries[studentId] || { score: 0, feedback: '' };
        return { ...ex, entries: { ...currentEntries, [studentId]: { ...currentEntry, [field]: value } } };
      })
    }));
  };

  const handleReset = async () => {
    if (window.confirm("Archive current session and wipe data?")) {
      setIsResetting(true);
      try {
        await apiService.archiveSession(gradeBookState);
        await apiService.clearAllData();
        setGradeBookState(JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE)));
        setStudentCode('');
        setResult(null);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const navItems = [
    { id: 'SINGLE' as ViewMode, label: 'Grader Core', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    )},
    { id: 'SHEETS' as ViewMode, label: 'Class Sheets', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
    )},
    { id: 'HISTORY' as ViewMode, label: 'Archives', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )}
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-500 overflow-hidden">
      
      {/* Google-Style Collapsible Sidebar */}
      <nav className="group fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-80">
        
        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center px-4 overflow-hidden shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-brand-500/20">
            ST
          </div>
          <span className="ml-4 font-black text-slate-800 dark:text-white uppercase tracking-tighter text-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            System <span className="text-brand-500 text-xs">Lecturer</span>
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`w-full flex items-center p-3 rounded-2xl transition-all duration-200 group/item ${
                viewMode === item.id 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="shrink-0 group-hover/item:scale-110 transition-transform">{item.icon}</div>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {item.label}
              </span>
              {viewMode === item.id && (
                 <div className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full group-hover:block hidden"></div>
              )}
            </button>
          ))}
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center p-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <div className="shrink-0">{darkMode ? '☀️' : '🌙'}</div>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </div>

        {/* User Profile / Logout Section */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-xl border-2 border-brand-500 shrink-0" alt="Avatar" />
            <div className="ml-3 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user.name}</p>
              <button 
                onClick={() => window.location.href = "/api/auth/logout"}
                className="text-[10px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-400 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col ml-[72px] transition-all duration-300 h-screen overflow-hidden">
        
        {/* Contextual Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Active Task</span>
            <div className="h-6 w-[2px] bg-slate-200 dark:border-slate-700"></div>
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              {viewMode === 'SINGLE' ? `Evaluating: ${currentExercise.name}` : 'Class Overview'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/30">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-3"></span>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">System Online</span>
            </div>
          </div>
        </header>

        <main className="flex-grow p-6 overflow-hidden relative">
          {viewMode === 'SINGLE' ? (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 h-full">
              <section className="xl:col-span-3 h-full overflow-hidden">
                <ResultSection result={result} error={error} isEvaluating={isEvaluating} />
              </section>
              <section className="xl:col-span-7 h-full overflow-hidden">
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
                  onAddExercise={() => {}}
                />
              </section>
            </div>
          ) : viewMode === 'SHEETS' ? (
            <GradeBook 
              state={gradeBookState}
              onUpdateStudentName={() => {}}
              onUpdateMaxScore={() => {}}
              onUpdateEntry={handleUpdateEntry}
              onAddExercise={() => {}}
              onAddStudent={() => {}}
              onResetSystem={handleReset}
              isResetting={isResetting}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mb-6">📦</div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Archive Explorer</h3>
              <p className="text-slate-500 max-w-md">Browse previous grading sessions and snapshots. Select a date from the list to restore context.</p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {archives.length > 0 ? archives.map(arch => (
                   <div key={arch._id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-brand-500 transition-all text-left">
                     <p className="font-bold text-sm">{new Date(arch.timestamp).toLocaleDateString()}</p>
                     <p className="text-xs text-slate-500">{arch.state.exercises.length} Exercises indexed</p>
                   </div>
                )) : <div className="col-span-2 text-slate-400 font-bold">No archives found yet.</div>}
              </div>
            </div>
          )}
        </main>
      </div>

      <ChatBot darkMode={darkMode} context={{ ...currentExercise, studentCode }} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default LecturerDashboard;
