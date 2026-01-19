
import React, { useState, useEffect, useRef } from 'react';
import { User, Material } from '../types';
import { apiService } from '../services/apiService';

interface StudentPortalProps {
  user: User;
}

const STLogo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">ST</div>
    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white uppercase">System</span>
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

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased">
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shadow-xl z-20">
        <div className="p-8 border-b border-slate-200 dark:border-slate-800">
          <STLogo />
          <div className="mt-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Enroll in Course</label>
            <div className="flex space-x-2">
              <input 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                placeholder="Code" 
                className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500" 
              />
              <button onClick={handleJoin} className="bg-brand-600 text-white px-4 rounded-xl text-sm font-bold shadow-lg hover:bg-brand-700 transition-colors">+</button>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Academic Repository</h3>
            {workspace.shared.length > 0 ? workspace.shared.map(s => (
              <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-3 border border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-800 transition-all cursor-pointer">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mb-1">{s.title}</p>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Course Material</span>
                </div>
              </div>
            )) : <p className="text-[10px] text-slate-400 px-2 italic font-bold">No materials synced.</p>}
          </section>
        </div>
        
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
           <div className="flex items-center space-x-4">
             <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-xl" alt="Avatar" />
             <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">{user.name}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolled Student</p>
             </div>
           </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative bg-slate-50 dark:bg-slate-950">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-10 shrink-0 justify-between">
           <div className="flex items-center space-x-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Academic Assistant Online</span>
           </div>
           <div className="flex items-center space-x-4">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-brand-600 transition-colors">
               {darkMode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
             </button>
             <button 
                onClick={() => window.location.href = "/api/auth/logout"}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Sign Out
              </button>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-12 space-y-12 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">How can I assist you today?</h2>
              <p className="text-slate-500 max-w-md font-medium">Ask questions about your course materials or request a quick summary of shared resources.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-8 rounded-3xl max-w-[80%] shadow-sm leading-relaxed ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'}`}>
                <p className="text-sm font-medium whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse">
                  <div className="flex space-x-2">
                     <div className="w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                     <div className="w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                     <div className="w-2 h-2 bg-slate-300 dark:bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-10 border-t bg-white dark:bg-slate-950/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Query study materials..." 
              className="flex-grow bg-transparent border-none outline-none py-2 text-sm font-medium resize-none custom-scrollbar" 
              rows={1}
            />
            <button 
              onClick={() => handleChat()} 
              disabled={loading || !input.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-30 flex items-center space-x-2"
            >
              <span className="text-xs font-bold uppercase tracking-widest">Query</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
