
import React, { useState, useEffect, useRef } from 'react';
import InputSection from './components/InputSection';
import ResultSection from './components/ResultSection';
import GradeBook from './components/GradeBook';
import ChatBot from './components/ChatBot';
import CourseManager from './components/CourseManager';
import StudentManagement from './components/StudentManagement';
import DirectChat from './components/DirectChat';
import ArchiveViewer from './components/ArchiveViewer';
import AssignmentManager from './components/AssignmentManager';
import ReviewQueue from './components/ReviewQueue';
import { apiService } from './services/apiService';
import { GradingResult, TabOption, GradeBookState, User, Course, Student, Exercise, Archive, GradeEntry, Submission } from './types';
import { INITIAL_GRADEBOOK_STATE } from './constants';

interface LecturerDashboardProps {
  user: User;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  onSignOut: () => void;
}

type ViewMode = 'EVALUATION' | 'SHEETS' | 'STUDENTS' | 'COURSES' | 'MESSAGES' | 'ARCHIVES' | 'ASSIGNMENTS' | 'SNAPSHOTS' | 'LIBRARY' | 'REVIEW_QUEUE';

const Icons = {
  Evaluation: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Gradebook: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Courses: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Students: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Messages: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Archives: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Solution: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Database: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Theme: (isDark: boolean) => isDark ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  Close: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
  Library: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
};

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user, darkMode, setDarkMode, onSignOut }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('EVALUATION');
  const [gradeBookState, setGradeBookState] = useState<GradeBookState>(INITIAL_GRADEBOOK_STATE);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewQueueCount, setReviewQueueCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageAlert, setMessageAlert] = useState<{ text: string, senderId: string } | null>(null);
  const dismissedAlertRef = useRef<string | null>(null);
  const [chatTarget, setChatTarget] = useState<Student | null>(null);
  const [allUsers, setAllUsers] = useState<Student[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);

  const [activeExerciseId, setActiveExerciseId] = useState<string>('ex-1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student-1');
  const [studentCode, setStudentCode] = useState('');
  const [result, setResult] = useState<GradingResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.QUESTION);
  // Audit #7: replaces prompt() in onResetSystem — null = hidden, '' = open but empty
  const [archiveNameInput, setArchiveNameInput] = useState<string | null>(null);

  useEffect(() => {
    apiService.getLecturerDashboardData().then(d => {
      setCourses(d.courses);
      setArchives(d.archives);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchSync = async () => {
      try {
        const sync = await apiService.getLecturerSync();
        setPendingCount(sync.pendingCount);
        setUnreadMessages(sync.unreadMessages);
        if (sync.alert && sync.alert.text !== dismissedAlertRef.current) {
          setMessageAlert(sync.alert);
        }
        // CHAM: fetch review queue count
        try {
          const rqStats = await apiService.getReviewQueueStats();
          setReviewQueueCount(rqStats.pending);
        } catch {};
      } catch (e) {}
    };
    fetchSync();
    const interval = setInterval(fetchSync, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode === 'ARCHIVES') {
      apiService.getLecturerDashboardData().then(data => setArchives(data.archives));
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'MESSAGES') {
      apiService.getAllUsers().then(setAllUsers);
    }
    if (viewMode === 'ARCHIVES' && activeCourse) {
      apiService.getLecturerAllSubmissions(activeCourse.id).then(setAllSubmissions);
    }
  }, [viewMode, activeCourse]);

  useEffect(() => {
    if (activeCourse) {
      const syncGradebook = async () => {
        try {
          const assignments = await apiService.getLecturerAssignments(activeCourse.id);
          const { enrolled } = await apiService.getWaitlist(activeCourse.id);
          
          const students: Student[] = enrolled.map((u: any) => ({
            id: u.googleId,
            name: u.name,
            email: u.email,
            picture: u.picture,
            status: 'enrolled'
          }));

          const exercises: Exercise[] = await Promise.all(assignments.map(async (a) => {
            const subs = await apiService.getAssignmentSubmissions(a.id);
            const entries: { [studentId: string]: GradeEntry } = {};
            subs.forEach(s => {
              if (s.score !== undefined) {
                entries[s.studentId] = {
                  score: s.score,
                  feedback: s.feedback || ''
                };
              }
            });

            return {
              id: a.id,
              name: a.title,
              maxScore: a.maxScore,
              entries,
              question: a.question,
              masterSolution: a.masterSolution,
              rubric: a.rubric,
              customInstructions: a.customInstructions || ''
            };
          }));

          setGradeBookState({ students, exercises });
          if (exercises.length > 0) setActiveExerciseId(exercises[0].id);
        } catch (e) {
          console.error("Failed to sync gradebook:", e);
        }
      };
      syncGradebook();
    }
  }, [activeCourse]);

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
    setGradeBookState(prev => ({ ...prev, students: prev.students.map(s => s.id === id ? { ...s, name } : s) }));
  };

  const onUpdateMaxScore = (exId: string, ms: number) => {
    setGradeBookState(prev => ({ ...prev, exercises: prev.exercises.map(ex => ex.id === exId ? { ...ex, maxScore: ms } : ex) }));
  };

  const onUpdateEntry = async (exId: string, sid: string, field: 'score' | 'feedback', val: any) => {
    setGradeBookState(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => {
        if (ex.id !== exId) return ex;
        const entry = ex.entries[sid] || { score: 0, feedback: '' };
        return { ...ex, entries: { ...ex.entries, [sid]: { ...entry, [field]: val } } };
      })
    }));

    // Save to database
    try {
      const activeEx = gradeBookState.exercises.find(e => e.id === exId);
      const entry = activeEx?.entries[sid] || { score: 0, feedback: '' };
      await apiService.saveGrade({
        exerciseId: exId,
        studentId: sid,
        score: field === 'score' ? val : entry.score,
        feedback: field === 'feedback' ? val : entry.feedback
      });
    } catch (e) {
      console.error("Failed to save grade:", e);
    }
  };

  const onEvaluate = async () => {
    const activeEx = gradeBookState.exercises.find(e => e.id === activeExerciseId);
    if (!activeEx || !studentCode.trim()) return;
    setIsEvaluating(true); 
    setError(null);
    setIsSaved(false);
    try {
      const res = await apiService.evaluate({ 
        question: activeEx.question, 
        masterSolution: activeEx.masterSolution, 
        rubric: activeEx.rubric, 
        studentCode, 
        customInstructions: activeEx.customInstructions 
      });
      setResult(res);
      await onUpdateEntry(activeExerciseId, selectedStudentId, 'score', res.score);
      await onUpdateEntry(activeExerciseId, selectedStudentId, 'feedback', res.feedback);
      
      setIsSaved(true);

      // Auto-advance logic
      if (autoAdvance) {
        const currentIndex = gradeBookState.students.findIndex(s => s.id === selectedStudentId);
        if (currentIndex !== -1 && currentIndex < gradeBookState.students.length - 1) {
          const nextStudent = gradeBookState.students[currentIndex + 1];
          // Small delay for visual feedback before switching
          setTimeout(() => {
            setSelectedStudentId(nextStudent.id);
            setStudentCode(''); // Clear code for next student
            setResult(null);    // Clear result for next student
            setIsSaved(false);
            setActiveTab(TabOption.STUDENT_ANSWER); // Switch to submission tab for next student
          }, 2000);
        }
      }
    } catch (e: any) { 
      setError(e.message); 
    } finally { 
      setIsEvaluating(false); 
    }
  };

  // Audit #7: replaced prompt() — first opens inline modal, doArchive executes on confirm
  const onResetSystem = () => { setArchiveNameInput(''); };

  const doArchive = async () => {
    if (!archiveNameInput?.trim()) return;
    const sessionName = archiveNameInput.trim();
    setArchiveNameInput(null);
    let total = 0, count = 0, dist = { high: 0, mid: 0, low: 0 };
    gradeBookState.exercises.forEach(ex => Object.values(ex.entries).forEach(e => {
      total += e.score; count++;
      if (e.score >= 8) dist.high++; else if (e.score >= 5) dist.mid++; else dist.low++;
    }));
    const payload = { sessionName, courseId: activeCourse?.id || 'gen', data: gradeBookState, stats: { avgScore: count ? total / count : 0, totalSubmissions: count, distribution: dist } };
    await apiService.archiveSession(payload);
    setGradeBookState(INITIAL_GRADEBOOK_STATE);
    apiService.getLecturerDashboardData().then(d => setArchives(d.archives));
  };

  const onRestoreArchive = (archive: Archive) => {
    setGradeBookState(archive.data);
    setViewMode('SHEETS');
  };

  const navItems = [
    { id: 'COURSES', label: 'Nodes', icon: <Icons.Courses /> },
    { id: 'STUDENTS', label: 'Waitlist', icon: <Icons.Students />, badge: pendingCount },
    { id: 'MESSAGES', label: 'Inbox', icon: <Icons.Messages />, badge: unreadMessages, pulsing: true },
    { id: 'ASSIGNMENTS', label: 'Tasks', icon: <Icons.Solution /> },
    { id: 'REVIEW_QUEUE', label: 'Review Queue', icon: <Icons.Evaluation />, badge: reviewQueueCount },
    { id: 'LIBRARY', label: 'Library Zone', icon: <Icons.Library /> },
    { id: 'ARCHIVES', label: 'Snapshot Zone', icon: <Icons.Archives /> },
    { id: 'SNAPSHOTS', label: 'Gradebook Snapshots', icon: <Icons.Solution /> },
    { id: 'EVALUATION', label: 'Core', icon: <Icons.Evaluation /> },
    { id: 'SHEETS', label: 'Grid', icon: <Icons.Gradebook /> }
  ];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-slate-900 flex font-sans transition-colors duration-500 overflow-hidden">
      {messageAlert && (
        <div className="fixed top-6 right-6 z-[100] w-80 bg-white dark:bg-slate-800 border border-brand-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right duration-500">
           <div className="flex justify-between items-start mb-2">
             <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">New Message Arrival</span>
             <button onClick={() => { dismissedAlertRef.current = messageAlert.text; setMessageAlert(null); }}><Icons.Close /></button>
           </div>
           <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 italic">"{messageAlert.text}"</p>
           <button onClick={() => { dismissedAlertRef.current = messageAlert.text; setMessageAlert(null); setViewMode('MESSAGES'); }} className="mt-4 text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 hover:underline">View Inbox</button>
        </div>
      )}

      <nav className="fixed left-0 top-0 h-full w-[72px] hover:w-64 bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col group">
        <div className="h-16 flex items-center px-5 border-b dark:border-slate-800"><img src="/logo.png" alt="CHAM" className="w-8 h-8 rounded-lg shrink-0 object-cover" /></div>
        <div className="flex-grow py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id as ViewMode)} className={`w-full flex items-center p-3 rounded-xl transition-all relative ${viewMode === item.id ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-zinc-100 dark:hover:bg-slate-800'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="ml-4 font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && <span className={`absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ${item.pulsing ? 'animate-pulse' : ''}`}>+{item.badge}</span>}
            </button>
          ))}
        </div>
        <div className="mt-auto border-t dark:border-slate-800 p-3 space-y-1">
          <div className="flex items-center p-2 rounded-xl text-slate-500">
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full shrink-0" />
            <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"><p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{user.name}</p></div>
          </div>
          <button onClick={onSignOut} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:text-rose-500 transition-colors"><Icons.SignOut /><span className="ml-4 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Sign Out</span></button>
        </div>
      </nav>

      <div className="flex-grow flex flex-col ml-[72px] h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-8 flex items-center justify-between shrink-0 transition-colors">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{viewMode}</h2>
          <div className="flex items-center space-x-4">
            {courses.length > 0 && <select value={activeCourse?.id || ''} onChange={e => setActiveCourse(courses.find(c => c.id === e.target.value) || null)} className="bg-zinc-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1 outline-none text-slate-700 dark:text-white"><option value="">Context Selection...</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">{Icons.Theme(darkMode)}</button>
          </div>
        </header>

        <main className="flex-grow p-8 overflow-y-auto custom-scrollbar relative">
          {viewMode === 'ASSIGNMENTS' && (activeCourse ? <AssignmentManager course={activeCourse} /> : <div className="h-full flex items-center justify-center text-slate-400 font-black text-[10px] uppercase tracking-widest border-2 border-dashed dark:border-slate-800 rounded-[3rem]">Select a course from the header dropdown to manage assignments</div>)}
          {viewMode === 'REVIEW_QUEUE' && <ReviewQueue />}
          {viewMode === 'LIBRARY' && (
            <div className="space-y-12 pb-20">
              <header className="flex justify-between items-end">
                <div>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academy Library</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Comprehensive Course Repository</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map(course => (
                  <div key={course.id} className="bg-white dark:bg-slate-850 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600">
                        <Icons.Courses />
                      </div>
                      <span className="px-4 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[8px] font-black uppercase tracking-widest text-emerald-600">Active Node</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{course.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-3 font-medium leading-relaxed">{course.description || 'No description provided for this node.'}</p>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Units</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{course.enrolledCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stored Objects</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{course.materialsCount || 0}</span>
                      </div>
                    </div>

                      <div className="flex space-x-3">
                        <button 
                          onClick={() => { setActiveCourse(course); setViewMode('COURSES'); }}
                          className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-500/20 hover:bg-brand-500 transition-all"
                        >
                          Manage
                        </button>
                        <button 
                          onClick={() => { setActiveCourse(course); setViewMode('ARCHIVES'); }}
                          className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          History
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {viewMode === 'ARCHIVES' && activeCourse && (
            <div className="space-y-8 overflow-y-auto custom-scrollbar pb-20">
              <header>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Snapshot Zone</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Historical Submissions & Feedback (Archive)</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {allSubmissions.map(s => (
                  <div key={s.id} className="bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-brand-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 font-black text-xs">
                          {s.studentName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{s.studentName}</h4>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(s.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-600">{s.score}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border border-zinc-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Feedback</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold italic leading-relaxed">{s.feedback}</p>
                    </div>
                  </div>
                ))}
                {allSubmissions.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed dark:border-slate-800 rounded-[3rem]">
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No evaluated submissions in library</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {viewMode === 'SNAPSHOTS' && <ArchiveViewer archives={archives} onRestore={onRestoreArchive} />}
          {viewMode === 'COURSES' && <CourseManager courses={courses} onCourseUpdate={() => apiService.getLecturerDashboardData().then(d => { setCourses(d.courses); })} onSelectCourse={(c) => { setActiveCourse(c); }} />}
          {viewMode === 'STUDENTS' && (activeCourse ? <StudentManagement courseId={activeCourse.id} /> : <div className="h-full flex items-center justify-center text-slate-400 font-black text-[10px] uppercase tracking-widest border-2 border-dashed dark:border-slate-800 rounded-[3rem]">Select a course from the header dropdown to manage students</div>)}
          {viewMode === 'MESSAGES' && (
             <div className="h-full min-h-[600px] flex space-x-8">
               <div className="w-80 bg-white dark:bg-slate-850 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 p-6 flex flex-col transition-colors">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Global Roster</h3>
                 <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                   {allUsers.map(s => (
                     <button key={s.id} onClick={() => setChatTarget(s)} className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all ${chatTarget?.id === s.id ? 'bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700' : 'hover:bg-zinc-50 dark:hover:bg-slate-800'}`}>
                       <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-slate-800 flex items-center justify-center font-bold text-brand-600 text-[10px]">
                         {s.picture ? <img src={s.picture} className="w-full h-full rounded-full" /> : s.name.charAt(0)}
                       </div>
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                     </button>
                   ))}
                 </div>
               </div>
               <div className="flex-grow">{chatTarget ? <DirectChat currentUser={user} targetUser={chatTarget} /> : <div className="h-full flex items-center justify-center text-slate-400 font-black text-[10px] uppercase border-2 border-dashed dark:border-slate-800 rounded-[3rem]">Select a channel</div>}</div>
             </div>
          )}
          {viewMode === 'EVALUATION' && (
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 h-full min-h-[800px]">
               <section className="xl:col-span-3 h-full"><ResultSection result={result} error={error} isEvaluating={isEvaluating} isSaved={isSaved} /></section>
               <section className="xl:col-span-7 h-full">
                 <InputSection 
                   activeExercise={gradeBookState.exercises.find(e => e.id === activeExerciseId) || gradeBookState.exercises[0]} 
                   studentCode={studentCode} setStudentCode={setStudentCode} onEvaluate={onEvaluate} isEvaluating={isEvaluating} 
                   activeTab={activeTab} setActiveTab={setActiveTab} onUpdateExerciseData={onUpdateExerciseData} students={gradeBookState.students} 
                   selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} exercises={gradeBookState.exercises} setActiveExerciseId={setActiveExerciseId} onAddExercise={onAddExercise} 
                   autoAdvance={autoAdvance} setAutoAdvance={setAutoAdvance}
                 />
               </section>
            </div>
          )}
          {viewMode === 'SHEETS' && <GradeBook state={gradeBookState} onUpdateStudentName={onUpdateStudentName} onUpdateMaxScore={onUpdateMaxScore} onUpdateEntry={onUpdateEntry} onAddExercise={onAddExercise} onAddStudent={onAddStudent} onResetSystem={onResetSystem} isResetting={false} />}
        </main>
      </div>
      {/* Audit #7: inline archive-name modal replaces prompt() */}
      {archiveNameInput !== null && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white dark:bg-slate-850 rounded-3xl p-8 border border-zinc-200 dark:border-slate-700 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">שמור גרסת ארכיון</h3>
            <input
              autoFocus
              value={archiveNameInput}
              onChange={e => setArchiveNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doArchive()}
              placeholder="שם הסשן..."
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border border-transparent focus:border-brand-500 outline-none font-bold text-slate-800 dark:text-white"
            />
            <div className="flex space-x-3 space-x-reverse justify-end">
              <button onClick={() => setArchiveNameInput(null)} className="px-5 py-2 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-colors">ביטול</button>
              <button onClick={doArchive} disabled={!archiveNameInput?.trim()} className="px-6 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">ארכיון</button>
            </div>
          </div>
        </div>
      )}
      <ChatBot darkMode={darkMode} />
    </div>
  );
};

export default LecturerDashboard;
