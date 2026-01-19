
import React, { useState, useEffect, useRef } from 'react';
import { User, Material } from '../types';
import { apiService } from '../services/apiService';

interface StudentPortalProps {
  user: User;
}

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
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shadow-xl z-20">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-black uppercase tracking-tighter">Notebook</h1>
          <div className="mt-4 flex space-x-2">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Course Code" className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" />
            <button onClick={handleJoin} className="bg-brand-500 text-white px-3 rounded-lg text-xs font-bold">+</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Shared Materials</h3>
            {workspace.shared.map(s => (
              <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 border border-transparent hover:border-brand-200">
                <p className="text-xs font-bold truncate">{s.title}</p>
                <span className="text-[9px] text-slate-400">Course Resource</span>
              </div>
            ))}
          </section>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative bg-white dark:bg-slate-950">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-10 shrink-0 justify-between">
           <span className="text-sm font-black uppercase">Academic Assistant</span>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">{darkMode ? '☀️' : '🌙'}</button>
        </header>

        <div className="flex-grow overflow-y-auto p-10 space-y-12">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-6 rounded-[2rem] max-w-[80%] ${m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-900 border'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-brand-500 animate-pulse font-black uppercase text-xs">Assistant is thinking...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-10 border-t bg-white dark:bg-slate-950">
          <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-3xl border">
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..." className="flex-grow bg-transparent border-none outline-none py-3 text-base resize-none" />
            <button onClick={() => handleChat()} className="bg-brand-500 text-white p-3 rounded-2xl shadow-lg">Send</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
