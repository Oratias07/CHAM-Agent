
import React, { useState, useEffect, useMemo, useRef } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import StudentManagement from './components/StudentManagement';
import CourseManager from './components/CourseManager';
import { apiService } from './services/apiService';
import { GradingInputs, GradingResult, TabOption, GradeBookState, Exercise, User, ArchiveSession, Course } from './types';
import { INITIAL_GRADEBOOK_STATE } from './constants';

type ViewMode = 'SINGLE' | 'SHEETS' | 'STUDENTS' | 'COURSES' | 'HISTORY';

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  
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

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setResult(null);
    setError(null);
  }, [selectedStudentId, activeExerciseId]);

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [courseList, arch] = await Promise.all([
          apiService.getCourses(),
          apiService.getArchives()
        ]);
        setCourses(courseList);
        setArchives(arch);
        if (courseList.length > 0) setActiveCourseId(courseList[0].id);
      } catch (e) {
        console.error("Initial load failed", e);
      }
    };
    loadData();
  }, []);

  // Sync Exercises when active course changes
  useEffect(() => {
    if (!activeCourseId) return;
    const loadExercises = async () => {
      try {
        const exs = await apiService.getExercises(activeCourseId);
        if (exs && exs.length > 0) {
          setGradeBookState(prev => ({ ...prev, exercises: exs }));
          setActiveExerciseId(exs[0].id);
        } else {
          setGradeBookState(JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE)));
          setActiveExerciseId('ex-1');
        }
      } catch (e) {
        console.error("Exercise load failed", e);
      }
    };
    loadExercises();
  }, [activeCourseId]);

  // Auto-sync exercise definitions to DB
  useEffect(() => {
    if (!activeCourseId || isResetting) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      apiService.syncExercises(gradeBookState.exercises, activeCourseId);
    }, 2000);
  }, [gradeBookState.exercises, activeCourseId, isResetting]);

  const currentExercise = useMemo(() => {
    return gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0];
  }, [gradeBookState.exercises, activeExerciseId]);

  const handleUpdateExerciseData = (field: keyof Exercise, value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === activeExerciseId ? { ...ex, [field]: value } : ex)
    }));
  };

  const handleAddExercise = () => {
    const newEx: Exercise = {
      id: `ex-${Date.now()}`,
      name: `New Exercise ${gradeBookState.exercises.length + 1}`,
      maxScore: 10,
      entries: {},
      question: '',
      masterSolution: '',
      rubric: '',
      customInstructions: ''
    };
    setGradeBookState(prev => ({
      ...prev,
      exercises: [...prev.exercises, newEx]
    }));
    setActiveExerciseId(newEx.id);
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
        await apiService.saveGrade(activeExerciseId, selectedStudentId, evaluation, activeCourseId);
        
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
        await apiService.archiveSession(gradeBookState, activeCourseId);
        await apiService.clearAllData(activeCourseId);
        const arch = await apiService.getArchives();
        setArchives(arch);
        setGradeBookState(JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE)));
        setStudentCode('');
        setResult(null);
      } catch (e) {
        alert("Reset failed. Please try again.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  const navItems = [
    { id: 'SINGLE' as ViewMode, label: 'Grader Core', icon: '⚡' },
    { id: 'SHEETS' as ViewMode, label: 'Class Sheets', icon: '📊' },
    { id: 'COURSES' as ViewMode, label: 'Courses', icon: '🏫' },
    { id: 'STUDENTS' as ViewMode, label: 'Students', icon: '👥' },
    { id: 'HISTORY' as ViewMode, label: 'Archives', icon: '📦' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-500 overflow-hidden">
      <nav className="group fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-80">
        <div className="h-16 flex items-center px-4 overflow-hidden shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">ST</div>
        </div>
        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center p-3 rounded-2xl transition-all ${viewMode === item.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <div className="shrink-0 text-xl">{item.icon}</div>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
           <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-xl border-2 border-brand-500 mx-auto" alt="Avatar" />
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{viewMode}</h2>
            {courses.length > 0 && (
              <select value={activeCourseId} onChange={e => setActiveCourseId(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1">
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            {darkMode ? '☀️' : '🌙'}
          </button>
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
                  onAddExercise={handleAddExercise}
                />
              </section>
            </div>
          ) : viewMode === 'SHEETS' ? (
            <GradeBook 
              state={gradeBookState}
              onUpdateStudentName={() => {}}
              onUpdateMaxScore={() => {}}
              onUpdateEntry={handleUpdateEntry}
              onAddExercise={handleAddExercise}
              onAddStudent={() => {}}
              onResetSystem={handleReset}
              isResetting={isResetting}
            />
          ) : viewMode === 'COURSES' ? (
            <CourseManager courses={courses} onCourseCreated={c => setCourses([...courses, c])} />
          ) : viewMode === 'STUDENTS' ? (
            <StudentManagement students={gradeBookState.students} exercises={gradeBookState.exercises} courseId={activeCourseId} />
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-4">
              <h3 className="text-xl font-black uppercase tracking-tight">System Archives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {archives.map(arch => (
                   <div key={arch._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                        <p className="font-black text-slate-800 dark:text-white">{new Date(arch.timestamp).toLocaleString()}</p>
                        <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Course ID: {arch.courseId || 'N/A'}</span>
                     </div>
                     <p className="text-xs text-slate-500 mb-6">{arch.state.exercises.length} Exercises saved at this snapshot.</p>
                     <div className="flex space-x-3">
                        <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">View Snapshot</button>
                        <button className="px-4 py-2 bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Download State</button>
                     </div>
                   </div>
                ))}
                {archives.length === 0 && <div className="col-span-2 p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No archives found.</div>}
              </div>
            </div>
          )}
        </main>
      </div>
      <ChatBot darkMode={darkMode} context={{ ...currentExercise, studentCode }} />
    </div>
  );
};

export default LecturerDashboard;
