
import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import CourseManager from './components/CourseManager';
import StudentManagement from './components/StudentManagement';
import { apiService } from './services/apiService';
import { GradingResult, TabOption, GradeBookState, User, Course, Student } from './types';
import { INITIAL_GRADEBOOK_STATE } from './constants';

type ViewMode = 'EVALUATION' | 'SHEETS' | 'STUDENTS' | 'COURSES';

const Icons = {
  Evaluation: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Gradebook: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Courses: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Students: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Theme: (isDark: boolean) => isDark ? 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
};

const LecturerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('COURSES');
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.QUESTION);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(INITIAL_GRADEBOOK_STATE);
  const [studentCode, setStudentCode] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    const root = document.documentElement;
    darkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    apiService.getCourses().then(setCourses);
  }, []);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    try {
      const ex = gradeBookState.exercises[0];
      const res = await apiService.evaluate({ ...ex, studentCode });
      setResult(res);
    } catch (e) { 
      setError(e.message || "AI Evaluation failed.");
    } finally { 
      setIsEvaluating(false); 
    }
  };

  const navItems = [
    { id: 'COURSES', label: 'Dashboard', icon: <Icons.Courses /> },
    { id: 'STUDENTS', label: 'Waitlist', icon: <Icons.Students /> },
    { id: 'EVALUATION', label: 'Grader', icon: <Icons.Evaluation /> },
    { id: 'SHEETS', label: 'Book', icon: <Icons.Gradebook /> }
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-slate-900 flex font-sans transition-colors duration-500 overflow-hidden">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col group">
        <div className="h-16 flex items-center px-5 border-b border-zinc-100 dark:border-slate-800">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">ST</div>
        </div>
        <div className="flex-grow py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setViewMode(item.id as ViewMode)} 
              className={`w-full flex items-center p-3 rounded-xl transition-all ${viewMode === item.id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800'}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t dark:border-slate-800">
           <button onClick={() => window.location.href="/api/auth/logout"} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:text-rose-500">
             <Icons.SignOut />
             <span className="ml-4 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Sign Out</span>
           </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{viewMode}</h2>
            {courses.length > 0 && (
              <select 
                value={activeCourse?.id || ''} 
                onChange={e => setActiveCourse(courses.find(c => c.id === e.target.value) || null)}
                className="bg-zinc-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1"
              >
                <option value="">Select Course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
            {Icons.Theme(darkMode)}
          </button>
        </header>

        <main className="flex-grow p-8 overflow-hidden relative">
          {viewMode === 'COURSES' && (
            <CourseManager 
              courses={courses} 
              onCourseUpdate={() => apiService.getCourses().then(setCourses)} 
              onSelectCourse={setActiveCourse}
            />
          )}
          {viewMode === 'STUDENTS' && activeCourse && (
            <StudentManagement courseId={activeCourse.id} />
          )}
          {viewMode === 'EVALUATION' && (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 h-full">
               <section className="xl:col-span-3 h-full">
                 <ResultSection result={result} error={error} isEvaluating={isEvaluating} />
               </section>
               <section className="xl:col-span-7 h-full">
                 <InputSection 
                   activeExercise={gradeBookState.exercises[0]} 
                   studentCode={studentCode}
                   setStudentCode={setStudentCode}
                   onEvaluate={handleEvaluate}
                   isEvaluating={isEvaluating}
                   activeTab={activeTab}
                   setActiveTab={setActiveTab}
                   onUpdateExerciseData={() => {}}
                   students={[]}
                   selectedStudentId=""
                   setSelectedStudentId={() => {}}
                   exercises={gradeBookState.exercises}
                   setActiveExerciseId={() => {}}
                   onAddExercise={() => {}}
                 />
               </section>
            </div>
          )}
          {viewMode === 'SHEETS' && (
             <GradeBook state={gradeBookState} onUpdateStudentName={() => {}} onUpdateMaxScore={() => {}} onUpdateEntry={() => {}} onAddExercise={() => {}} onAddStudent={() => {}} onResetSystem={() => {}} isResetting={false} />
          )}
        </main>
      </div>
      <ChatBot darkMode={darkMode} />
    </div>
  );
};

export default LecturerDashboard;
