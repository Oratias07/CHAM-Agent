
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

const STLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">ST</div>
    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white uppercase">System</span>
  </div>
);

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

  const handleRestoreSnapshot = (arch: ArchiveSession) => {
    if (window.confirm("Restore this archive to your active workspace? (This will overwrite current work)")) {
      setGradeBookState(arch.state);
      setViewMode('SHEETS');
      if (arch.state.exercises.length > 0) {
        setActiveExerciseId(arch.state.exercises[0].id);
      }
    }
  };

  const navItems = [
    { id: 'SINGLE' as ViewMode, label: 'Evaluation', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    )},
    { id: 'SHEETS' as ViewMode, label: 'Gradebook', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { id: 'COURSES' as ViewMode, label: 'Courses', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    )},
    { id: 'STUDENTS' as ViewMode, label: 'Students', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )},
    { id: 'HISTORY' as ViewMode, label: 'Archives', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
    )}
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-500 overflow-hidden">
      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-xl overflow-hidden group">
        <div className="h-16 flex items-center px-5 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <STLogo />
        </div>
        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id)} className={`w-full flex items-center p-3 rounded-xl transition-all ${viewMode === item.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}>
              <div className="shrink-0">{item.icon}</div>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
             <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-lg shrink-0" alt="Avatar" />
             <div className="ml-3 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
               <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
             </div>
           </div>
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{viewMode}</h2>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
            {courses.length > 0 && (
              <select value={activeCourseId} onChange={e => setActiveCourseId(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold px-3 py-1 text-slate-700 dark:text-slate-200">
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-brand-600 transition-colors">
              {darkMode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
            <button 
              onClick={() => window.location.href = "/api/auth/logout"}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest border border-slate-200 dark:border-slate-700"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-grow p-8 overflow-hidden relative">
          {viewMode === 'SINGLE' ? (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 h-full">
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
            <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <h3 className="text-2xl font-bold tracking-tight mb-8">System Archives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archives.map(arch => (
                   <div key={arch._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-brand-500 transition-all flex flex-col">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                           <p className="font-bold text-slate-900 dark:text-white">{new Date(arch.timestamp).toLocaleDateString()}</p>
                           <p className="text-xs text-slate-500">{new Date(arch.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500">Course {arch.courseId?.slice(-4) || 'N/A'}</span>
                     </div>
                     <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 flex-grow">Snapshot contains {arch.state.exercises.length} Exercises and {arch.state.students.length} Students.</p>
                     <div className="flex space-x-3">
                        <button 
                          onClick={() => handleRestoreSnapshot(arch)}
                          className="flex-grow px-4 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-brand-700 shadow-md"
                        >
                          View Snapshot
                        </button>
                     </div>
                   </div>
                ))}
                {archives.length === 0 && <div className="col-span-full p-20 text-center text-slate-400 font-bold uppercase tracking-widest border-2 border-dashed rounded-3xl">No archives found.</div>}
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
