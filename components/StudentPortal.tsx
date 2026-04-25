
import React, { useState, useEffect, useRef } from 'react';
import { User, Material } from '../types';
import { apiService } from '../services/apiService';
import DirectChat from './DirectChat';
import StudentAssignments from './StudentAssignments';
import ChatBot from './ChatBot';

interface StudentPortalProps {
  user: User;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  onSignOut: () => void;
}

type ViewMode = 'AI_CHAT' | 'DIRECT_CHAT' | 'MATERIALS' | 'ASSIGNMENTS' | 'INBOX' | 'LIBRARY';

const Icons = {
  Send: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Material: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Chat: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Robot: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Theme: (isDark: boolean) => isDark ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Book: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Library: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>,
  Waitlist: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
};

const StudentPortal: React.FC<StudentPortalProps> = ({ user, darkMode, setDarkMode, onSignOut }) => {
  const [localUser, setLocalUser] = useState<User>(user);
  const [courseNames, setCourseNames] = useState<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    if (user.activeCourse) names[user.activeCourse.id] = user.activeCourse.name;
    return names;
  });
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, type?: string }[]>([]);
  const [input, setInput] = useState('');
  const [materials, setMaterials] = useState<{ lecturerMaterials: Material[], studentMaterials: Material[] }>({ lecturerMaterials: [], studentMaterials: [] });
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('ASSIGNMENTS');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [contacts, setContacts] = useState<{ lecturer: User, students: User[] } | null>(null);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageAlert, setMessageAlert] = useState<{ text: string, senderId: string } | null>(null);
  const dismissedAlertRef = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [openingMaterialId, setOpeningMaterialId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const course = localUser.activeCourse;

  useEffect(() => {
    if (course) {
      apiService.getStudentMaterials(course.id).then(setMaterials).catch(() => {});
      apiService.getCourseContacts(course.id).then(setContacts).catch(() => {});
    }
  }, [course?.id, localUser.id]);

  useEffect(() => {
    let active = true;
    const fetchSync = async () => {
      try {
        const sync = await apiService.getStudentSync();
        if (!active) return;
        setUnreadMessages(sync.unreadMessages);
        if (sync.alert && sync.alert.text !== dismissedAlertRef.current) {
          setMessageAlert(sync.alert);
        }
      } catch (e) {}
    };
    fetchSync();
    const interval = setInterval(fetchSync, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (viewMode === 'LIBRARY') {
      apiService.getStudentSubmissions().then(setSubmissions).catch(() => {});
    }
  }, [viewMode]);

  const handleSwitchCourse = async (courseId: string) => {
    try {
      const updated = await apiService.switchCourse(courseId);
      setLocalUser(updated);
      if (updated.activeCourse) {
        setCourseNames(prev => ({ ...prev, [updated.activeCourse!.id]: updated.activeCourse!.name }));
      }
    } catch (e) {
      console.error("Failed to switch course", e);
    }
  };

  const handleJoinCourse = async () => {
    if (!joinCode.trim()) return;
    setJoinError('');
    setJoinSuccess('');
    try {
      const res = await apiService.joinCourseRequest(joinCode);
      setJoinSuccess(res.message || 'בקשתך נשלחה בהצלחה');
      setJoinCode('');
      const updated = await apiService.getCurrentUser();
      if (updated) setLocalUser(updated);
    } catch (e: any) {
      setJoinError(e.message || 'שגיאה בהצטרפות לקורס');
    }
  };

  const handleChat = async () => {
    if (!input.trim() || !course || loading) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      // Fixed: replaced _id with id to match Course interface
      const res = await apiService.studentChat(course.id, msg);
      setMessages(prev => [...prev, { role: 'model', text: res.text, type: res.type }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'שגיאה בחיבור לשרת. בדוק את החיבור ונסה שוב.', type: 'error' }]);
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !course) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await apiService.addPrivateMaterial({
          courseId: course.id,
          title: file.name,
          content: content,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
        const updated = await apiService.getStudentMaterials(course.id);
        setMaterials(updated);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const openMaterial = async (m: Material) => {
    setOpeningMaterialId(m.id);
    try {
      await apiService.markMaterialViewed(m.id);
      // Fetch content on demand — not included in list responses
      const { content, fileType } = await apiService.getMaterialContent(m.id);
      const resolvedType = fileType || m.fileType || '';
      if (content && content.startsWith('data:')) {
        const newTab = window.open('', '_blank');
        if (newTab) {
          if (resolvedType.startsWith('image/')) {
            newTab.document.write(`<html><head><title>${m.title}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111"><img src="${content}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
          } else {
            const byteString = atob(content.split(',')[1]);
            const mimeType = resolvedType || content.split(';')[0].split(':')[1];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mimeType });
            const url = URL.createObjectURL(blob);
            newTab.location.href = url;
          }
        }
      } else {
        setActiveMaterial({ ...m, content });
      }
    } finally {
      setOpeningMaterialId(null);
    }
  };

  return (
    <div className="h-screen flex bg-zinc-100 dark:bg-slate-900 transition-colors overflow-hidden">
      {messageAlert && (
        <div className="fixed top-6 right-6 z-[300] w-80 bg-white dark:bg-slate-850 border border-brand-500 rounded-3xl shadow-2xl p-6 animate-in slide-in-from-right duration-500">
           <div className="flex justify-between items-start mb-3">
             <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest" dir="rtl">הודעה חדשה</span>
             <button onClick={() => { dismissedAlertRef.current = messageAlert.text; setMessageAlert(null); }} className="text-slate-400 hover:text-rose-500 transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
           <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 italic">"{messageAlert.text}"</p>
           <button
            onClick={() => {
              dismissedAlertRef.current = messageAlert.text;
              const sender = contacts?.students.find(s => s.id === messageAlert.senderId) || (contacts?.lecturer?.id === messageAlert.senderId ? contacts.lecturer : null);
              if (sender) setSelectedContact(sender);
              setViewMode('DIRECT_CHAT');
              setMessageAlert(null);
            }} 
            className="mt-4 w-full py-2 bg-brand-50 dark:bg-slate-800 text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 dark:hover:bg-slate-700 transition-all"
           >
             פתח שיחה
           </button>
        </div>
      )}
      <aside className="w-80 border-r dark:border-slate-800 flex flex-col bg-white dark:bg-slate-850 shadow-xl z-20 transition-colors">
        <div className="p-8 border-b dark:border-slate-800 flex flex-col space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]" dir="rtl">ארון ידע</h3>
          {localUser.enrolledCourseIds && localUser.enrolledCourseIds.length > 1 && (
            <select 
              value={course?.id} 
              onChange={(e) => handleSwitchCourse(e.target.value)}
              className="w-full p-2 bg-zinc-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border-none outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            >
              {/* Note: We'd ideally need the course names here, but for now we'll use IDs or fetch names */}
              {localUser.enrolledCourseIds.map(id => (
                <option key={id} value={id}>{courseNames[id] || (id === course?.id ? course.name : `Course ${id.substring(0, 6)}`)}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowJoinModal(true)}
            className="text-[9px] font-black uppercase tracking-widest text-brand-600 hover:underline text-right"
            dir="rtl"
          >
            + הצטרף לקורס נוסף
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button onClick={() => setViewMode('MATERIALS')} dir="rtl" className={`w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl transition-all ${viewMode === 'MATERIALS' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Book /> <span className="text-xs font-black uppercase tracking-widest">מסמכים</span></button>
          <button onClick={() => setViewMode('ASSIGNMENTS')} dir="rtl" className={`w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl transition-all ${viewMode === 'ASSIGNMENTS' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Material /> <span className="text-xs font-black uppercase tracking-widest">משימות</span></button>
          <button onClick={() => setViewMode('AI_CHAT')} dir="rtl" className={`w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl transition-all ${viewMode === 'AI_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Robot /> <span className="text-xs font-black uppercase tracking-widest">עוזר AI</span></button>
          <button onClick={() => setViewMode('INBOX')} dir="rtl" className={`w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl transition-all relative ${viewMode === 'INBOX' || viewMode === 'DIRECT_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}>
            <Icons.Chat />
            <span className="text-xs font-black uppercase tracking-widest">הודעות</span>
            {unreadMessages > 0 && (
              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse">
                {unreadMessages}
              </span>
            )}
          </button>
          <button onClick={() => setViewMode('LIBRARY')} dir="rtl" className={`w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl transition-all ${viewMode === 'LIBRARY' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Library /> <span className="text-xs font-black uppercase tracking-widest">ספרייה</span></button>
        </div>
        <div className="mt-auto border-t dark:border-slate-800 p-4 space-y-2">
           <button onClick={() => setDarkMode(!darkMode)} dir="rtl" className="w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl text-slate-500 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors">{Icons.Theme(darkMode)} <span className="text-[10px] font-black uppercase tracking-widest">שנה ערכת נושא</span></button>
           <button onClick={onSignOut} dir="rtl" className="w-full flex items-center space-x-3 space-x-reverse p-4 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"><Icons.SignOut /> <span className="text-[10px] font-black uppercase tracking-widest">התנתק</span></button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative">
        <header className="h-16 border-b dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center px-10 justify-between transition-colors">
           <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="CHAM" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{course?.name} / {viewMode}</span>
           </div>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col">
          {!course && viewMode !== 'AI_CHAT' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6" dir="rtl">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl">🎓</div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">אין קורס פעיל</h3>
              <p className="text-slate-400 font-bold text-sm max-w-md">הצטרף לקורס באמצעות קוד הקורס כדי לגשת לחומרים, משימות והודעות.</p>
              <button onClick={() => setShowJoinModal(true)} className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all">
                הצטרף לקורס
              </button>
            </div>
          )}
          {viewMode === 'MATERIALS' && course && (
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2" dir="rtl">חומרי לימוד</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium" dir="rtl">גישה לחומרי הקורס ולמחקר הפרטי שלך</p>
                  </div>
                  <div className="flex space-x-4">
                    <label className={`flex items-center space-x-2 px-6 py-3 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:scale-105 transition-all cursor-pointer ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                      <Icons.Plus />
                      <span dir="rtl">{isUploading ? 'מעלה...' : 'העלה קובץ'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>

                <div className="space-y-12">
                  {/* Lecturer Materials */}
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6 flex items-center">
                      <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mr-4"></span>
                      חומרי מרצה
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {materials.lecturerMaterials.map((material) => (
                        <div key={material.id} className="group bg-white dark:bg-slate-850 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-brand-500/30 transition-all shadow-sm hover:shadow-xl">
                          <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600">
                              <Icons.Book />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{material.folder || 'General'}</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{material.title}</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6">{material.fileName ? `${material.fileType || 'File'} — ${material.fileName}` : 'מסמך טקסט'}</p>
                          <button
                            onClick={() => openMaterial(material)}
                            disabled={openingMaterialId === material.id}
                            className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 rounded-xl group-hover:bg-brand-600 group-hover:text-white transition-all disabled:opacity-50 disabled:cursor-wait"
                          >
                            {openingMaterialId === material.id ? 'טוען...' : 'צפה במסמך'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Private Materials */}
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6 flex items-center">
                      <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mr-4"></span>
                      חומרים פרטיים
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {materials.studentMaterials.map((material) => (
                        <div key={material.id} className="group bg-white dark:bg-slate-850 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-xl">
                          <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600">
                              <Icons.Material />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Private</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{material.title}</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6">{material.fileName ? `${material.fileType || 'File'} — ${material.fileName}` : 'מסמך טקסט'}</p>
                          <button
                            onClick={() => openMaterial(material)}
                            disabled={openingMaterialId === material.id}
                            className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all disabled:opacity-50 disabled:cursor-wait"
                          >
                            {openingMaterialId === material.id ? 'טוען...' : 'צפה במסמך'}
                          </button>
                        </div>
                      ))}
                      {materials.studentMaterials.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl" dir="rtl">
                          <p className="text-slate-400 font-medium">אין מסמכים פרטיים עדיין. העלה קבצים להרחבת הידע של העוזר.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {activeMaterial && (
                  <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl h-[80vh] bg-white dark:bg-slate-850 rounded-[3rem] flex flex-col overflow-hidden border border-white/5 shadow-2xl">
                      <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center"><h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{activeMaterial.title}</h3><button onClick={() => setActiveMaterial(null)} className="p-2 text-slate-400 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest">סגור</button></div>
                      <div className="flex-grow p-12 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-200 font-bold text-lg leading-relaxed whitespace-pre-wrap">{activeMaterial.content}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {viewMode === 'ASSIGNMENTS' && (
            <div className="flex-grow overflow-hidden">{course ? <StudentAssignments course={course} /> : <div className="h-full flex items-center justify-center font-black uppercase text-slate-400 tracking-widest text-[10px]">Vault locked</div>}</div>
          )}
          {viewMode === 'AI_CHAT' && (
            <>
              <div className="flex-grow overflow-y-auto p-12 space-y-8 custom-scrollbar">
                 <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 p-6 rounded-3xl text-center mb-10"><p className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest">מצב הקשר מוגבל: העוזר יכול להשתמש רק בחומרי הקורס.</p></div>
                 {messages.map((m, i) => {
                   const isSystemMsg = m.role === 'model' && (m.type === 'quota_error' || m.type === 'no_materials' || m.type === 'error');
                   return (
                     <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {isSystemMsg ? (
                         <div className={`p-5 rounded-[2rem] max-w-[80%] border flex items-start gap-3 ${
                           m.type === 'quota_error' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                           : m.type === 'no_materials' ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200'
                           : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                         }`} dir="rtl">
                           {m.type === 'quota_error' && <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                           {m.type === 'no_materials' && <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                           {m.type === 'error' && <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                           <p className="text-sm font-bold">{m.text}</p>
                         </div>
                       ) : (
                         <div className={`p-6 rounded-[2rem] max-w-[80%] shadow-sm border ${m.role === 'user' ? 'bg-slate-900 dark:bg-brand-600 text-white border-transparent' : 'bg-white dark:bg-slate-850 border-zinc-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold'}`}>
                           <p className="text-sm">{m.text}</p>
                         </div>
                       )}
                     </div>
                   );
                 })}
                 <div ref={chatEndRef} />
              </div>
              <div className="p-10 border-t dark:border-slate-800">
                 <div className="max-w-4xl mx-auto flex space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-2xl">
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="שאל שאלה מבוססת חומרי קורס..." className="flex-grow bg-transparent border-none outline-none py-2 text-sm font-bold dark:text-white" />
                    <button onClick={handleChat} disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"><Icons.Send /></button>
                 </div>
              </div>
            </>
          )}
          {viewMode === 'INBOX' && (
            <div className="p-12 overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100 mb-10" dir="rtl">תיבת הודעות</h2>
              <div className="space-y-4 max-w-4xl">
                {contacts?.lecturer && (
                  <button 
                    onClick={() => { setSelectedContact(contacts.lecturer); setViewMode('DIRECT_CHAT'); }}
                    className="w-full flex items-center justify-between p-6 bg-white dark:bg-slate-850 rounded-3xl border border-zinc-200 dark:border-slate-800 hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center font-black text-white">L</div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{contacts.lecturer.name}</h4>
                        <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest">מרצה הקורס</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-slate-800 text-slate-400 group-hover:text-brand-600 transition-colors"><Icons.Chat /></div>
                  </button>
                )}
                {contacts?.students.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => { setSelectedContact(s); setViewMode('DIRECT_CHAT'); }}
                    className="w-full flex items-center justify-between p-6 bg-white dark:bg-slate-850 rounded-3xl border border-zinc-200 dark:border-slate-800 hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-zinc-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-500">S</div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{s.name}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">סטודנט</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-slate-800 text-slate-400 group-hover:text-brand-600 transition-colors"><Icons.Chat /></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {viewMode === 'DIRECT_CHAT' && (
            <div className="p-12 h-full">
              <div className="max-w-4xl mx-auto h-full">
                {selectedContact ? (
                  <DirectChat currentUser={localUser} targetUser={{ id: selectedContact.id, name: selectedContact.name, picture: selectedContact.picture }} onClose={() => setViewMode('INBOX')} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-400"><Icons.Chat /></div>
                    <p className="font-black uppercase text-slate-400 tracking-widest text-[10px]" dir="rtl">בחר איש קשר להתחלת שיחה</p>
                    <button onClick={() => setViewMode('INBOX')} className="px-6 py-2 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest" dir="rtl">פתח אנשי קשר</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {viewMode === 'LIBRARY' && (
            <div className="p-12 overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100 mb-10" dir="rtl">ספריית הערכות</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {submissions.filter(s => s.score !== undefined).map(s => (
                  <div key={s.id} className="bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl flex items-center justify-center text-emerald-600"><Icons.Material /></div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-emerald-600">{s.score}</span>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest" dir="rtl">ציון סופי</p>
                      </div>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter mb-2">Assignment #{s.assignmentId?.substring(0, 6) || '—'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-6" dir="rtl">הוערך ב-{new Date(s.timestamp).toLocaleDateString('he-IL')}</p>
                    <div className="p-4 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border border-zinc-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2" dir="rtl">משוב</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-bold italic leading-relaxed text-right" dir="rtl">{s.feedback || 'No feedback provided.'}</p>
                    </div>
                  </div>
                ))}
                {submissions.filter(s => s.score !== undefined).length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <p className="font-black uppercase text-slate-400 tracking-widest text-[10px]" dir="rtl">לא נמצאו הערכות בספרייה</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showJoinModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] shadow-2xl text-center border dark:border-slate-800 transition-colors">
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-slate-800 dark:text-slate-100" dir="rtl">הצטרף לקורס</h2>
              <p className="text-slate-500 font-bold mb-8 text-sm" dir="rtl">הכנס את קוד הקורס שסיפק לך המרצה</p>
              <input
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value); setJoinError(''); setJoinSuccess(''); }}
                placeholder="קוד קורס"
                className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none mb-4 text-center font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinCourse()}
                dir="rtl"
              />
              {joinError && <p className="text-rose-500 text-xs font-bold mb-4" dir="rtl">{joinError}</p>}
              {joinSuccess && <p className="text-emerald-600 text-xs font-bold mb-4" dir="rtl">{joinSuccess}</p>}
              <div className="flex flex-col space-y-4">
                <button onClick={handleJoinCourse} className="w-full py-4 bg-brand-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all" dir="rtl">שלח בקשה</button>
                <button onClick={() => { setShowJoinModal(false); setJoinError(''); setJoinSuccess(''); }} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:underline" dir="rtl">ביטול</button>
              </div>
            </div>
          </div>
        )}
      </main>
      {course && <ChatBot mode="student" courseId={course.id} />}
    </div>
  );
};

export default StudentPortal;
