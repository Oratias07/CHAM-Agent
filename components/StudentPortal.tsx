
import React, { useState, useEffect, useRef } from 'react';
import { User, Material } from '../types';
import { apiService } from '../services/apiService';

interface StudentPortalProps {
  user: User;
}

const Icons = {
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  Material: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Chat: () => <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Logout: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Theme: (isDark: boolean) => isDark ? 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : 
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
};

const STLogo = () => (
  <div className="flex items-center group/logo overflow-hidden">
    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-sm border border-brand-500/20">
      ST
    </div>
    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white uppercase overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-2">
      System
    </span>
  </div>
);

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  const [workspace, setWorkspace] = useState<{ shared: Material[], privateNotes: Material[] }>({ shared: [], privateNotes: [] });
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === null ? true : saved === 'dark';
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    try {
      const data = await apiService.getStudentWorkspace();
      setWorkspace(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async () => {
    if (!joinCode) return;
    try {
      await apiService.joinCourse(joinCode);
      setJoinCode('');
      fetchWorkspace();
      alert("Successfully joined course!");
    } catch (e) {
      alert("Invalid code or connection error.");
    }
  };

  const handleChat = async (task?: string, customInput?: string) => {
    const msg = customInput || input;
    if (!msg.trim() && !task && !loading) return;
    if (msg.trim()) setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const allSources = [...workspace.shared, ...workspace.privateNotes];
      const res = await apiService.studentChat(msg, allSources, task);
      setMessages(prev => [...prev, { role: 'model', text: res.text }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="h-screen flex bg-zinc-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased">
      <aside className="w-80 border-r border-zinc-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-850 shadow-xl z-20 group">
        <div className="p-8 border-b border-zinc-200 dark:border-slate-800">
          <STLogo />
          <div className="mt-10">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Enroll in Stream</label>
            <div className="flex space-x-2">
              <input 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                placeholder="Access Code" 
                className="w-full text-[10px] font-black uppercase tracking-widest p-3 bg-zinc-50 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-brand-500" 
              />
              <button onClick={handleJoin} className="bg-brand-600 text-white px-4 rounded-xl shadow-md hover:bg-brand-500 transition-colors"><Icons.Plus /></button>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Academic Repository</h3>
            {workspace.shared.length > 0 ? workspace.shared.map(s => (
              <div key={s.id} className="p-4 bg-zinc-50 dark:bg-slate-800/40 rounded-xl mb-3 border border-zinc-100 dark:border-slate-800 hover:border-brand-500 transition-all cursor-pointer group/item">
                <div className="flex items-start space-x-3">
                  <span className="text-slate-400 group-hover/item:text-brand-500 shrink-0"><Icons.Material /></span>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{s.title}</p>
                </div>
              </div>
            )) : <p className="text-[10px] text-slate-400 px-2 italic font-bold">No verified materials synced.</p>}
          </section>
        </div>
        
        <div className="p-6 border-t border-zinc-200 dark:border-slate-800">
           <div className="flex items-center space-x-4 p-2 bg-zinc-50 dark:bg-slate-800/50 rounded-2xl">
             <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-xl" alt="Avatar" />
             <div className="flex-grow min-w-0">
               <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enrolled Student</p>
             </div>
             <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-brand-500" title="Sign Out">
                <Icons.Logout />
             </button>
           </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative bg-zinc-100 dark:bg-slate-900">
        <header className="h-16 border-b border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center px-10 shrink-0 justify-between">
           <div className="flex items-center space-x-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assistant Engine Online</span>
           </div>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors">
             {Icons.Theme(darkMode)}
           </button>
        </header>

        <div className="flex-grow overflow-y-auto p-12 space-y-12 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 text-brand-500 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                 <Icons.Chat />
              </div>
              <h2 className="text-2xl font-black tracking-tighter mb-2 uppercase">How can I assist you today?</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md font-bold text-sm">Ask complex questions about course materials or request logic summaries from synced resources.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-8 rounded-[2rem] max-w-[80%] shadow-sm leading-relaxed border ${m.role === 'user' ? 'bg-slate-900 dark:bg-brand-600 text-white border-transparent' : 'bg-white dark:bg-slate-850 border-zinc-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'}`}>
                <p className="text-sm font-bold whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="p-8 bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 rounded-[2rem] animate-pulse">
                  <div className="flex space-x-2">
                     <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-10 border-t bg-white/50 dark:bg-slate-850/50 backdrop-blur-xl border-zinc-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-zinc-200 dark:border-slate-800 shadow-2xl">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Query Repository Intelligence..." 
              className="flex-grow bg-transparent border-none outline-none py-2 text-sm font-bold resize-none custom-scrollbar text-slate-800 dark:text-slate-200" 
              rows={1}
            />
            <button 
              onClick={() => handleChat()} 
              disabled={loading || !input.trim()}
              className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-30 flex items-center space-x-3"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Execute</span>
              <Icons.Send />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
