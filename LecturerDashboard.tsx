
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

// Professional SVG Icons
const Icons = {
  Evaluation: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Gradebook: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Courses: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Students: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Archives: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Theme: (isDark: boolean) => isDark ? 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
};

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
    { id: 'SINGLE', label: 'Evaluation', icon: <Icons.Evaluation /> },
    { id: 'SHEETS', label: 'Gradebook', icon: <Icons.Gradebook /> },
    { id: 'COURSES', label: 'Courses', icon: <Icons.Courses /> },
    { id: 'STUDENTS', label: 'Students', icon: <Icons.Students /> },
    { id: 'HISTORY', label: 'Archives', icon: <Icons.Archives /> }
  ];

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-slate-900 flex font-sans transition-colors duration-500 overflow-hidden">
      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col group">
        <div className="h-16 flex items-center px-5 border-b border-zinc-100 dark:border-slate-800">
          <STLogo expanded={false} />
        </div>
        <div className="flex-grow py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id as ViewMode)} className={`w-full flex items-center p-3 rounded-xl transition-all ${viewMode === item.id ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="p-3 border-t border-zinc-100 dark:border-slate-800">
           <div className="flex items-center space-x-3 p-2 rounded-xl bg-zinc-50 dark:bg-slate-800/50">
             <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-lg shrink-0" alt="Avatar" />
             <div className="flex-grow min-w-0 opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
               <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
               <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Lecturer</p>
             </div>
             <button 
                onClick={handleLogout}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-brand-500"
                title="Sign Out"
              >
               <Icons.SignOut />
             </button>
           </div>
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewMode}</h2>
            {courses.length > 0 && (
              <select value={activeCourseId} onChange={e => setActiveCourseId(e.target.value)} className="bg-zinc-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-lg text-xs font-bold px-3 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
            {Icons.Theme(darkMode)}
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
          ) : <div className="flex items-center justify-center h-full text-slate-400 uppercase tracking-[0.3em] font-bold text-xs">Module Partially Implemented</div>}
        </main>
      </div>
      <ChatBot darkMode={darkMode} context={{ ...currentExercise, studentCode }} />
    </div>
  );
};

export default LecturerDashboard;
