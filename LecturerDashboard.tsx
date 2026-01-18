import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  const validateState = (state: any): GradeBookState => {
    const defaultState = JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE));
    if (!state) return defaultState;
    const s = { ...state };
    if (!Array.isArray(s.exercises) || s.exercises.length === 0) s.exercises = defaultState.exercises;
    if (!Array.isArray(s.students) || s.students.length === 0) s.students = defaultState.students;
    return s as GradeBookState;
  };

  const pushToHistory = useCallback((newState: GradeBookState) => {
    setHistoryStack(prev => [JSON.parse(JSON.stringify(newState)), ...prev].slice(0, 15));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const history = await apiService.getGradebook();
        if (history) {
          const valid = validateState(history);
          setGradeBookState(valid);
          if (valid.exercises.length > 0) setActiveExerciseId(valid.exercises[0].id);
          if (valid.students.length > 0) setSelectedStudentId(valid.students[0].id);
        }
        const arch = await apiService.getArchives();
        setArchives(arch.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
        const currentEntry = ex.entries[studentId] || { score: 0, feedback: '' };
        return { ...ex, entries: { ...ex.entries, [studentId]: { ...currentEntry, [field]: value } } };
      })
    }));
  };

  const handleReset = async () => {
    if (window.confirm("Archive current session and wipe data?")) {
      setIsResetting(true);
      try {
        await apiService.archiveSession(gradeBookState);
        await apiService.clearAllData();
        const fresh = JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE));
        setGradeBookState(fresh);
        setStudentCode('');
        setResult(null);
        setViewMode('SINGLE');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleAddExercise = () => {
    pushToHistory(gradeBookState);
    const newId = `ex-${Date.now()}`;
    const newEx: Exercise = { ...gradeBookState.exercises[0], id: newId, name: `Ex ${gradeBookState.exercises.length + 1}`, entries: {}, question: '', masterSolution: '' };
    setGradeBookState(prev => ({ ...prev, exercises: [...prev.exercises, newEx] }));
    setActiveExerciseId(newId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
      <header className="glass border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl">AI</div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">Lecturer Hub</h1>
              <span className="text-[9px] uppercase font-black text-brand-500">ID: {user.id}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex">
              <button onClick={() => setViewMode('SINGLE')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${viewMode === 'SINGLE' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-500'}`}>Grader</button>
              <button onClick={() => setViewMode('SHEETS')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${viewMode === 'SHEETS' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-500'}`}>Sheets</button>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <img src={user.picture} className="w-8 h-8 rounded-full border-2 border-brand-500 shadow-sm" alt="Avatar" />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 w-full z-10 overflow-hidden">
        {viewMode === 'SINGLE' ? (
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 h-[calc(100vh-10rem)] min-h-[600px]">
            <section className="xl:col-span-3 h-full"><ResultSection result={result} error={error} isEvaluating={isEvaluating} /></section>
            <section className="xl:col-span-7 h-full">
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
              />
            </section>
          </div>
        ) : (
          <GradeBook 
            state={gradeBookState}
            onUpdateStudentName={(id, name) => setGradeBookState(prev => ({ ...prev, students: prev.students.map(s => s.id === id ? { ...s, name } : s) }))}
            onUpdateMaxScore={(id, max) => setGradeBookState(prev => ({ ...prev, exercises: prev.exercises.map(ex => ex.id === id ? { ...ex, maxScore: max } : ex) }))}
            onUpdateEntry={handleUpdateEntry}
            onAddExercise={handleAddExercise}
            onAddStudent={() => setGradeBookState(prev => ({ ...prev, students: [...prev.students, { id: `s-${Date.now()}`, name: `Student ${prev.students.length + 1}` }] }))}
            onResetSystem={handleReset}
            isResetting={isResetting}
          />
        )}
      </main>
      <ChatBot darkMode={darkMode} />
    </div>
  );
};

export default LecturerDashboard;