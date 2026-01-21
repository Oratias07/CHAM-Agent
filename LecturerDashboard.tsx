
import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import CourseManager from './components/CourseManager';
import StudentManagement from './components/StudentManagement';
import DirectChat from './components/DirectChat';
import ArchiveViewer from './components/ArchiveViewer';
import { apiService } from './services/apiService';
import { GradingResult, TabOption, GradeBookState, User, Course, Student, Exercise, Archive } from './types';
import { INITIAL_GRADEBOOK_STATE } from './constants';

type ViewMode = 'EVALUATION' | 'SHEETS' | 'STUDENTS' | 'COURSES' | 'MESSAGES' | 'ARCHIVES';

const Icons = {
  Evaluation: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Gradebook: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Courses: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Students: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Messages: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Archives: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Theme: (isDark: boolean) => isDark ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
};

const LecturerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('COURSES');
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(INITIAL_GRADEBOOK_STATE);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [chatTarget, setChatTarget] = useState<Student | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [activeExerciseId, setActiveExerciseId] = useState<string>('ex-1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student-1');
  const [studentCode, setStudentCode] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.QUESTION);

  // Optimized: Use consolidated Meta Sync in polling
  useEffect(() => {
    const fetchSync = async () => {
      try {
        const syncData = await apiService.getLecturerSync();
        setPendingCount(syncData.pendingCount);
        setUnreadMessages(syncData.unreadMessages);
      } catch (e) { console.error("Sync error", e); }
    };
    fetchSync();
    const interval = setInterval(fetchSync, 10000); // Polling every 10s is sufficient
    return () => clearInterval(interval);
  }, []);

  // Optimized: Load all initial dashboard data in one call
  useEffect(() => {
    apiService.getLecturerDashboardData().then(data => {
      setCourses(data.courses);
      setArchives(data.archives);
      setPendingCount(data.pendingCount);
      setUnreadMessages(data.unreadMessages);
    }).catch(console.error);
  }, []);

  const activeExercise = gradeBookState.exercises.find(ex => ex.id === activeExerciseId) || gradeBookState.exercises[0];

  // Logic Handlers for Grader and Sheets
  const onUpdateExerciseData = (field: keyof Exercise, value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === activeExerciseId ? { ...ex, [field]: value } : ex)
    }));
  };

  const onAddExercise = () => {
    const newId = `ex-${gradeBookState.exercises.length + 1}`;
    setGradeBookState(prev => ({
      ...prev,
      exercises: [...prev.exercises, { id: newId, name: `Exercise ${prev.exercises.length + 1}`, maxScore: 10, entries: {}, question: '', masterSolution: '', rubric: '', customInstructions: '' }]
    }));
    setActiveExerciseId(newId);
  };

  const onAddStudent = () => {
    const newId = `student-${gradeBookState.students.length + 1}`;
    setGradeBookState(prev => ({
      ...prev,
      students: [...prev.students, { id: newId, name: `New Student ${prev.students.length + 1}` }]
    }));
  };

  const onUpdateStudentName = (id: string, name: string) => {
    setGradeBookState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === id ? { ...s, name } : s)
    }));
  };

  const onUpdateMaxScore = (exerciseId: string, maxScore: number) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === exerciseId ? { ...ex, maxScore } : ex)
    }));
  };

  const onUpdateEntry = (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        const entry = ex.entries[studentId] || { score: 0, feedback: '' };
        return {
          ...ex,
          entries: { ...ex.entries, [studentId]: { ...entry, [field]: value } }
        };
      })
    }));
  };

  const onEvaluate = async () => {
    if (!studentCode || !activeExercise.question || !activeExercise.rubric) {
      setError("Missing context for evaluation.");
      return;
    }
    setIsEvaluating(true);
    setError(null);
    try {
      const res = await apiService.evaluate({
        question: activeExercise.question,
        masterSolution: activeExercise.masterSolution,
        rubric: activeExercise.rubric,
        studentCode,
        customInstructions: activeExercise.customInstructions
      });
      setResult(res);
      // Automatically update entry in gradebook state
      onUpdateEntry(activeExercise.id, selectedStudentId, 'score', res.score);
      onUpdateEntry(activeExercise.id, selectedStudentId, 'feedback', res.feedback);
    } catch (e: any) {
      setError(e.message || "AI Evaluation Core encountered a logic error.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const onResetSystem = async () => {
    const sessionName = prompt("Enter a name for this session to archive it:");
    if (!sessionName) return;

    let totalScore = 0;
    let submissions = 0;
    let dist = { high: 0, mid: 0, low: 0 };

    gradeBookState.exercises.forEach(ex => {
      Object.values(ex.entries).forEach(e => {
        totalScore += e.score;
        submissions++;
        if (e.score >= 8) dist.high++;
        else if (e.score >= 5) dist.mid++;
        else dist.low++;
      });
    });

    const archivePayload = {
      sessionName,
      courseId: activeCourse?.id || 'general',
      data: gradeBookState,
      stats: {
        avgScore: submissions > 0 ? totalScore / submissions : 0,
        totalSubmissions: submissions,
        distribution: dist
      }
    };

    try {
      await apiService.archiveSession(archivePayload);
      setArchives(prev => [archivePayload as any, ...prev]);
      setGradeBookState(INITIAL_GRADEBOOK_STATE);
      alert("Session archived successfully.");
    } catch (e) { alert("Archive failed."); }
  };

  const navItems = [
    { id: 'COURSES', label: 'Dashboard', icon: <Icons.Courses /> },
    { id: 'STUDENTS', label: 'Waitlist', icon: <Icons.Students />, badge: pendingCount },
    { id: 'MESSAGES', label: 'Messages', icon: <Icons.Messages />, badge: unreadMessages, pulsing: true },
    { id: 'ARCHIVES', label: 'Archives', icon: <Icons.Archives /> },
    { id: 'EVALUATION', label: 'Grader', icon: <Icons.Evaluation /> },
    { id: 'SHEETS', label: 'Book', icon: <Icons.Gradebook /> }
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-slate-900 flex font-sans transition-colors duration-500 overflow-hidden">
      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col group">
        <div className="h-16 flex items-center px-5 border-b dark:border-slate-800">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">ST</div>
        </div>
        <div className="flex-grow py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id as ViewMode)} className={`w-full flex items-center p-3 rounded-xl transition-all relative ${viewMode === item.id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ${item.pulsing ? 'animate-pulse' : ''}`}>
                  +{item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-auto border-t dark:border-slate-800 p-3 space-y-1">
          <div className="flex items-center p-2 rounded-xl text-slate-500">
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full shrink-0" />
            <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{user.name}</p>
            </div>
          </div>
          <button onClick={() => window.location.href="/api/auth/logout"} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:text-rose-500 transition-colors">
            <Icons.SignOut />
            <span className="ml-4 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{viewMode}</h2>
          <div className="flex items-center space-x-4">
            {courses.length > 0 && (
              <select value={activeCourse?.id || ''} onChange={e => setActiveCourse(courses.find(c => c.id === e.target.value) || null)} className="bg-zinc-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1 outline-none">
                <option value="">Select Course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
              {Icons.Theme(darkMode)}
            </button>
          </div>
        </header>

        <main className="flex-grow p-8 overflow-hidden relative">
          {viewMode === 'ARCHIVES' && <ArchiveViewer archives={archives} />}
          {viewMode === 'COURSES' && <CourseManager courses={courses} onCourseUpdate={() => apiService.getLecturerDashboardData().then(d => setCourses(d.courses))} onSelectCourse={setActiveCourse} />}
          {viewMode === 'STUDENTS' && activeCourse && <StudentManagement courseId={activeCourse.id} />}
          {viewMode === 'MESSAGES' && (
             <div className="h-full flex space-x-8">
               <div className="w-80 bg-white dark:bg-slate-850 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 p-6 flex flex-col">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Select Recipient</h3>
                  <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                     {gradeBookState.students.map(s => (
                       <button key={s.id} onClick={() => setChatTarget(s)} className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all ${chatTarget?.id === s.id ? 'bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700' : 'hover:bg-zinc-50 dark:hover:bg-slate-800'}`}>
                         <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-slate-800 flex items-center justify-center font-bold text-brand-600 text-[10px]">{s.name.charAt(0)}</div>
                         <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                       </button>
                     ))}
                  </div>
               </div>
               <div className="flex-grow">{chatTarget ? <DirectChat currentUser={user} targetUser={chatTarget} /> : <div className="h-full flex items-center justify-center text-slate-400 font-black text-[10px] uppercase border-2 border-dashed dark:border-slate-800 rounded-[3rem]">Selection required</div>}</div>
             </div>
          )}
          {viewMode === 'EVALUATION' && (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 h-full">
               <section className="xl:col-span-3 h-full"><ResultSection result={result} error={error} isEvaluating={isEvaluating} /></section>
               <section className="xl:col-span-7 h-full">
                 <InputSection 
                   activeExercise={activeExercise} 
                   studentCode={studentCode} setStudentCode={setStudentCode} 
                   onEvaluate={onEvaluate} isEvaluating={isEvaluating} 
                   activeTab={activeTab} setActiveTab={setActiveTab} 
                   onUpdateExerciseData={onUpdateExerciseData} 
                   students={gradeBookState.students} 
                   selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} 
                   exercises={gradeBookState.exercises} setActiveExerciseId={setActiveExerciseId} 
                   onAddExercise={onAddExercise} 
                 />
               </section>
            </div>
          )}
          {viewMode === 'SHEETS' && (
             <GradeBook 
               state={gradeBookState} 
               onUpdateStudentName={onUpdateStudentName} 
               onUpdateMaxScore={onUpdateMaxScore} 
               onUpdateEntry={onUpdateEntry} 
               onAddExercise={onAddExercise} 
               onAddStudent={onAddStudent} 
               onResetSystem={onResetSystem} 
               isResetting={false} 
             />
          )}
        </main>
      </div>
      <ChatBot darkMode={darkMode} />
    </div>
  );
};

export default LecturerDashboard;
