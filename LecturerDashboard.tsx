
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

export const STLogo = ({ expanded = false }) => (
  <div className="flex items-center group/logo overflow-hidden">
    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-sm border border-brand-500/20">
      ST
    </div>
    <span className={`font-extrabold text-lg tracking-tight text-slate-900 dark:text-white uppercase overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out ${expanded ? 'max-w-[120px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}>
      System
    </span>
  </div>
);

const LecturerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('SINGLE');
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.QUESTION);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [archives, setArchives] = useState<ArchiveSession[]>([]);
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(() => JSON.parse(JSON.stringify(INITIAL_GRADEBOOK_STATE)));
  const [selectedStudentId, setSelectedStudentId] = useState<string>(INITIAL_GRADEBOOK_STATE.students[0].id);
  const [activeExerciseId, setActiveExerciseId] = useState<string>(INITIAL_GRADEBOOK_STATE.exercises[0].id);
  const [studentCode, setStudentCode] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  const syncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    darkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      try {
        const [courseList, arch] = await Promise.all([apiService.getCourses(), apiService.getArchives()]);
        setCourses(courseList);
        setArchives(arch);
        if (courseList.length) setActiveCourseId(courseList[0].id);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (!activeCourseId) return;
    (async () => {
      try {
        const exs = await apiService.getExercises(activeCourseId);
        if (exs.length) {
          setGradeBookState(prev => ({ ...prev, exercises: exs }));
          setActiveExerciseId(exs[0].id);
        }
      } catch (e) { console.error(e); }
    })();
  }, [activeCourseId]);

  useEffect(() => {
    if (!activeCourseId) return;
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      apiService.syncExercises(gradeBookState.exercises, activeCourseId);
    }, 2000);
  }, [gradeBookState.exercises, activeCourseId]);

  const currentExercise = useMemo(() => 
    gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0],
  [gradeBookState.exercises, activeExerciseId]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    try {
      const evaluation = await apiService.evaluate({
        ...currentExercise,
        studentCode
      });
      setResult(evaluation);
      
      const entries = { ...currentExercise.entries, [selectedStudentId]: evaluation };
      setGradeBookState(prev => ({
        ...prev,
        exercises: prev.exercises.map(ex => ex.id === activeExerciseId ? { ...ex, entries } : ex)
      }));

      await apiService.saveGrade(activeExerciseId, selectedStudentId, evaluation, activeCourseId);

      const nextIndex = gradeBookState.students.findIndex(s => s.id === selectedStudentId) + 1;
      if (nextIndex < gradeBookState.students.length) {
        setTimeout(() => {
          setSelectedStudentId(gradeBookState.students[nextIndex].id);
          setStudentCode('');
          setResult(null);
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const navItems = [
    { id: 'SINGLE', label: 'Evaluation', icon: '⚡' },
    { id: 'SHEETS', label: 'Gradebook', icon: '📊' },
    { id: 'COURSES', label: 'Courses', icon: '📚' },
    { id: 'STUDENTS', label: 'Students', icon: '👥' },
    { id: 'HISTORY', label: 'Archives', icon: '📦' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-500 overflow-hidden">
      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col group">
        <div className="h-16 flex items-center px-5 border-b border-slate-100 dark:border-slate-800">
          <STLogo expanded={false} />
        </div>
        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id as ViewMode)} className={`w-full flex items-center p-3 rounded-xl transition-all ${viewMode === item.id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <span className="text-xl shrink-0">{item.icon}</span>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
           <img src={user.picture} className="w-8 h-8 rounded-lg" alt="Avatar" />
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{viewMode}</h2>
            {courses.length > 0 && (
              <select value={activeCourseId} onChange={e => setActiveCourseId(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold px-3 py-1">
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </header>

        <main className="flex-grow p-8 overflow-hidden relative">
          {viewMode === 'SINGLE' ? (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 h-full">
              <section className="xl:col-span-3 h-full"><ResultSection result={result} error={error} isEvaluating={isEvaluating} /></section>
              <section className="xl:col-span-7 h-full">
                <InputSection 
                  activeExercise={currentExercise}
                  onUpdateExerciseData={(f, v) => setGradeBookState(p => ({ ...p, exercises: p.exercises.map(ex => ex.id === activeExerciseId ? { ...ex, [f]: v } : ex) }))}
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
          ) : viewMode === 'COURSES' ? (
            <CourseManager 
              courses={courses} 
              onCourseCreated={c => setCourses([...courses, c])} 
              onCourseUpdated={c => setCourses(courses.map(old => old.id === c.id ? c : old))}
              onCourseDeleted={id => setCourses(courses.filter(c => c.id !== id))}
            />
          ) : <div>View Mode: {viewMode} Partially Implemented</div>}
        </main>
      </div>
      <ChatBot darkMode={darkMode} context={{ ...currentExercise, studentCode }} />
    </div>
  );
};

export default LecturerDashboard;
