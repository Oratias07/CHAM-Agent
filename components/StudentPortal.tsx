
import React, { useState, useEffect, useRef } from 'react';
import { User, Material, Course } from '../types';
import { apiService } from '../services/apiService';
import DirectChat from './DirectChat';

type ViewMode = 'AI_CHAT' | 'DIRECT_CHAT';

const Icons = {
  Send: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Material: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Chat: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Robot: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Theme: (isDark: boolean) => isDark ? 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
};

const StudentPortal: React.FC<{ user: User }> = ({ user }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [viewMode, setViewMode] = useState<ViewMode>('AI_CHAT');
  const [showApprovalAlert, setShowApprovalAlert] = useState(user.unseenApprovals ? user.unseenApprovals > 0 : false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const courseId = user.enrolledCourseIds?.[0];

  useEffect(() => {
    const root = document.documentElement;
    darkMode ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (courseId) {
      apiService.getMaterials(courseId).then(list => setMaterials(list.filter(m => m.isVisible)));
    }
  }, [courseId]);

  const handleChat = async () => {
    if (!input.trim() || !courseId || loading) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiService.studentChat(courseId, msg);
      setMessages(prev => [...prev, { role: 'model', text: res.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Assistant error. Try again." }]);
    } finally { setLoading(false); }
  };

  const clearNotifications = async () => {
    await apiService.clearStudentNotifications();
    setShowApprovalAlert(false);
  };

  return (
    <div className="h-screen flex bg-zinc-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors overflow-hidden">
      {/* Sidebar Repository */}
      <aside className="w-80 border-r border-zinc-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-850 shadow-xl z-20">
        <div className="p-8 border-b dark:border-slate-800">
           <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Course Roster</h3>
        </div>
        
        <div className="p-4 space-y-2 border-b dark:border-slate-800">
          <button 
            onClick={() => setViewMode('AI_CHAT')}
            className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'AI_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}
          >
            <Icons.Robot />
            <span className="text-xs font-black uppercase tracking-widest">AI Tutor</span>
          </button>
          <button 
            onClick={() => setViewMode('DIRECT_CHAT')}
            className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${viewMode === 'DIRECT_CHAT' ? 'bg-brand-600 text-white shadow-lg' : 'hover:bg-zinc-50 dark:hover:bg-slate-800 text-slate-500'}`}
          >
            <Icons.Chat />
            <span className="text-xs font-black uppercase tracking-widest">Instructor DM</span>
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-4">
           <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Study Materials</h4>
           {materials.map(m => (
             <div key={m.id} className="p-4 bg-zinc-50 dark:bg-slate-800/40 rounded-xl border border-zinc-100 dark:border-slate-800 flex items-center space-x-3">
               <span className="text-brand-500 shrink-0"><Icons.Material /></span>
               <span className="text-[11px] font-bold truncate leading-tight">{m.title}</span>
             </div>
           ))}
           {materials.length === 0 && <p className="text-xs text-slate-500 font-bold italic px-2">No materials visible.</p>}
        </div>
        
        <div className="p-6 border-t dark:border-slate-800">
           <div className="flex items-center space-x-3 p-3 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl">
              <img src={user.picture} className="w-10 h-10 rounded-xl border dark:border-slate-700" alt="" />
              <div className="flex-grow overflow-hidden">
                <p className="text-xs font-black truncate">{user.name}</p>
                <button onClick={() => window.location.href="/api/auth/logout"} className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Exit Portal</button>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className="flex-grow flex flex-col relative">
        <header className="h-16 border-b border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center px-10 shrink-0 justify-between">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
             {viewMode === 'AI_CHAT' ? 'AI Grounded Assistant' : 'Direct Conversation'}
           </span>
           <div className="flex items-center space-x-4">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
               {Icons.Theme(darkMode)}
             </button>
           </div>
        </header>

        {showApprovalAlert && (
          <div className="bg-emerald-500 text-white px-8 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500">
             <div className="flex items-center space-x-3">
               <span className="text-lg">🎉</span>
               <span className="text-xs font-black uppercase tracking-widest">You have been approved for a new course!</span>
             </div>
             <button onClick={clearNotifications} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Dismiss</button>
          </div>
        )}

        <div className="flex-grow flex flex-col overflow-hidden">
          {viewMode === 'AI_CHAT' ? (
            <>
              <div className="flex-grow overflow-y-auto p-12 space-y-8 custom-scrollbar">
                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`p-6 rounded-[2rem] max-w-[80%] shadow-sm leading-relaxed border ${m.role === 'user' ? 'bg-slate-900 dark:bg-brand-600 text-white border-transparent' : 'bg-white dark:bg-slate-850 border-zinc-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'}`}>
                       <p className="text-sm font-bold">{m.text}</p>
                     </div>
                   </div>
                 ))}
                 {loading && <div className="text-xs font-black text-brand-500 uppercase animate-pulse">Assistant Thinking...</div>}
                 <div ref={chatEndRef} />
              </div>

              <div className="p-10 border-t bg-white/50 dark:bg-slate-850/50 backdrop-blur-xl border-zinc-200 dark:border-slate-800">
                 <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-zinc-200 dark:border-slate-800 shadow-2xl">
                    <input 
                      value={input} 
                      onChange={e => setInput(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleChat()}
                      placeholder="Query grounded knowledge..." 
                      className="flex-grow bg-transparent border-none outline-none py-2 text-sm font-bold"
                    />
                    <button onClick={handleChat} disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95">
                       <Icons.Send />
                    </button>
                 </div>
              </div>
            </>
          ) : (
            <div className="p-12 h-full">
               {/* In a real scenario, the student would fetch their lecturer's ID from the course */}
               {/* For this demo, we assume a static lecturer ID or list */}
               <div className="max-w-4xl mx-auto h-full pb-10">
                 <DirectChat currentUser={user} targetUser={{ id: 'lecturer-id', name: 'Course Instructor' }} />
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
