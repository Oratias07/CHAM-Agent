
import React, { useState, useEffect, useRef } from 'react';
import { User, Material } from '../types';
import { apiService } from '../services/apiService';
import DirectChat from './DirectChat';
import StudentAssignments from './StudentAssignments';

interface StudentPortalProps {
  user: User;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  onSignOut: () => void;
}

type ViewMode = 'AI_CHAT' | 'DIRECT_CHAT' | 'MATERIALS' | 'ASSIGNMENTS';

const Icons = {
  Send: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Material: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Chat: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Robot: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Theme: (isDark: boolean) => isDark ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  SignOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Book: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
};

const StudentPortal: React.FC<StudentPortalProps> = ({ user, darkMode, setDarkMode, onSignOut }) => {
  const [localUser, setLocalUser] = useState<User>(user);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('MATERIALS');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const course = localUser.activeCourse;

  useEffect(() => {
    if (course) apiService.getMaterials(course.id).then(list => setMaterials(list.filter(m => m.isVisible)));
  }, [course?.id]);

  const handleSwitchCourse = async (courseId: string) => {
    try {
      const updated = await apiService.switchCourse(courseId);
      setLocalUser(updated);
    } catch (e) {
      alert("Failed to switch course");
    }
  };

  const handleJoinCourse = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await apiService.joinCourseRequest(joinCode);
      alert(res.message);
      setJoinCode('');
      setShowJoinModal(false);
      // Refresh user data to show pending courses if needed
      const updated = await apiService.getCurrentUser();
      if (updated) setLocalUser(updated);
    } catch (e: any) {
      alert(e.message);
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
      setMessages(prev => [...prev, { role: 'model', text: res.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Logic core unavailable." }]);
    } finally { setLoading(false); }
  };

  const openMaterial = async (m: Material) => {
    setActiveMaterial(m);
    // Fixed: replaced _id with id to match Material interface
    await apiService.markMaterialViewed(m.id);
  };

  return (
    <div className="h-screen flex bg-zinc-100 dark:bg-slate-900 transition-colors overflow-hidden">
      <aside className="w-80 border-r dark:border-slate-800 flex flex-col bg-white dark:bg-slate-850 shadow-xl z-20 transition-colors">
        <div className="p-8 border-b dark:border-slate-800 flex flex-col space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Knowledge Vault</h3>
          {localUser.enrolledCourseIds && localUser.enrolledCourseIds.length > 1 && (
            <select 
              value={course?.id} 
              onChange={(e) => handleSwitchCourse(e.target.value)}
              className="w-full p-2 bg-zinc-50 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border-none outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            >
              {/* Note: We'd ideally need the course names here, but for now we'll use IDs or fetch names */}
              {localUser.enrolledCourseIds.map(id => (
                <option key={id} value={id}>{id === course?.id ? course.name : `Course ${id.substring(0, 5)}...`}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowJoinModal(true)}
            className="text-[9px] font-black uppercase tracking-widest text-brand-600 hover:underline text-left"
          >
            + Join Another Course
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button onClick={() => setViewMode('MATERIALS')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'MATERIALS' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Book /> <span className="text-xs font-black uppercase tracking-widest">Documents</span></button>
          <button onClick={() => setViewMode('ASSIGNMENTS')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'ASSIGNMENTS' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Material /> <span className="text-xs font-black uppercase tracking-widest">Assignments</span></button>
          <button onClick={() => setViewMode('AI_CHAT')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'AI_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Robot /> <span className="text-xs font-black uppercase tracking-widest">Strict Assistant</span></button>
          <button onClick={() => setViewMode('DIRECT_CHAT')} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'DIRECT_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}><Icons.Chat /> <span className="text-xs font-black uppercase tracking-widest">Direct Line</span></button>
        </div>
        <div className="mt-auto border-t dark:border-slate-800 p-4 space-y-2">
           <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center space-x-3 p-4 rounded-2xl text-slate-500 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors">{Icons.Theme(darkMode)} <span className="text-[10px] font-black uppercase tracking-widest">Toggle Theme</span></button>
           <button onClick={onSignOut} className="w-full flex items-center space-x-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"><Icons.SignOut /> <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span></button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative">
        <header className="h-16 border-b dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center px-10 justify-between transition-colors">
           <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0">ST</div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{course?.name} / {viewMode}</span>
           </div>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col">
          {viewMode === 'MATERIALS' && (
             <div className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto custom-scrollbar">
                {materials.map(m => (
                  // Fixed: replaced _id with id for key mapping
                  <button key={m.id} onClick={() => openMaterial(m)} className="bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 text-left hover:shadow-2xl transition-all">
                    <div className="w-10 h-10 bg-brand-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-500 mb-6"><Icons.Material /></div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{m.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Vault Stored Object</p>
                  </button>
                ))}
                {activeMaterial && (
                  <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="w-full max-w-4xl h-[80vh] bg-white dark:bg-slate-850 rounded-[3rem] flex flex-col overflow-hidden border border-white/5 shadow-2xl">
                      <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center"><h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{activeMaterial.title}</h3><button onClick={() => setActiveMaterial(null)} className="p-2 text-slate-400 hover:text-white transition-colors">Exit Reader</button></div>
                      <div className="flex-grow p-12 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-200 font-bold text-lg leading-relaxed whitespace-pre-wrap">{activeMaterial.content}</div>
                    </div>
                  </div>
                )}
             </div>
          )}
          {viewMode === 'ASSIGNMENTS' && (
            <div className="flex-grow overflow-hidden">{course ? <StudentAssignments course={course} /> : <div className="h-full flex items-center justify-center font-black uppercase text-slate-400 tracking-widest text-[10px]">Vault locked</div>}</div>
          )}
          {viewMode === 'AI_CHAT' && (
            <>
              <div className="flex-grow overflow-y-auto p-12 space-y-8 custom-scrollbar">
                 <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 p-6 rounded-3xl text-center mb-10"><p className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest">Strict Context Mode: Assistant can only reason using Course Documents.</p></div>
                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`p-6 rounded-[2rem] max-w-[80%] shadow-sm border ${m.role === 'user' ? 'bg-slate-900 dark:bg-brand-600 text-white border-transparent' : 'bg-white dark:bg-slate-850 border-zinc-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold'}`}>
                       <p className="text-sm">{m.text}</p>
                     </div>
                   </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>
              <div className="p-10 border-t dark:border-slate-800">
                 <div className="max-w-4xl mx-auto flex space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-2xl">
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask strictly grounded questions..." className="flex-grow bg-transparent border-none outline-none py-2 text-sm font-bold dark:text-white" />
                    <button onClick={handleChat} disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95"><Icons.Send /></button>
                 </div>
              </div>
            </>
          )}
          {viewMode === 'DIRECT_CHAT' && (
            <div className="p-12 h-full"><div className="max-w-4xl mx-auto h-full">{course ? <DirectChat currentUser={localUser} targetUser={{ id: course.lecturerId, name: course.lecturerName, picture: course.lecturerPicture }} /> : <div className="h-full flex items-center justify-center font-black uppercase text-slate-400 tracking-widest text-[10px]">Vault locked</div>}</div></div>
          )}
        </div>

        {showJoinModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] shadow-2xl text-center border dark:border-slate-800 transition-colors">
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-slate-800 dark:text-slate-100">Join Academy</h2>
              <p className="text-slate-500 font-bold mb-8 text-sm">Enter the course code provided by your instructor.</p>
              <input 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Course Code" 
                className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none mb-6 text-center font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-500 dark:text-white" 
                onKeyDown={(e) => e.key === 'Enter' && handleJoinCourse()}
              />
              <div className="flex flex-col space-y-4">
                <button onClick={handleJoinCourse} className="w-full py-4 bg-brand-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all">Submit Request</button>
                <button onClick={() => setShowJoinModal(false)} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:underline">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
