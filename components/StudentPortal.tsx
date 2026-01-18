
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWorkspace = async () => {
      const data = await apiService.getStudentWorkspace();
      setWorkspace(data);
    };
    fetchWorkspace();
  }, []);

  const handleChat = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const allSources = [...workspace.shared, ...workspace.privateNotes];
      const res = await apiService.studentChat(msg, allSources);
      setMessages(prev => [...prev, { role: 'model', text: res.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Pane 1: Sources (Sidebar Left) */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-black uppercase tracking-tighter">My Notebook</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Grounding Sources</p>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-3">Course Materials</h3>
            {workspace.shared.map(s => (
              <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer border border-transparent hover:border-brand-200 transition-all">
                <p className="text-xs font-bold truncate">{s.title}</p>
                <span className="text-[9px] text-slate-400">Lecturer Shared</span>
              </div>
            ))}
          </section>
          <section>
            <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">My Notes</h3>
            <button className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all text-[10px] font-bold mb-4">
              + Add Private Source
            </button>
            {workspace.privateNotes.map(n => (
              <div key={n.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer">
                <p className="text-xs font-bold truncate">{n.title}</p>
              </div>
            ))}
          </section>
        </div>
      </aside>

      {/* Pane 2: Central Chat */}
      <main className="flex-grow flex flex-col relative">
        <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <span className="text-6xl mb-6">🧠</span>
              <h2 className="text-3xl font-black tracking-tight mb-4 uppercase">Learning Assistant</h2>
              <p className="text-slate-500">I've indexed all your course materials. Ask me to explain a concept, generate a summary, or quiz you on specific topics.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-5 rounded-3xl ${m.role === 'user' ? 'bg-brand-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {loading && <div className="text-slate-500 animate-pulse text-xs font-bold uppercase tracking-widest">Assistant is thinking...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask anything about the course..."
              className="flex-grow bg-transparent border-none outline-none p-4 text-sm"
            />
            <button 
              onClick={handleChat}
              disabled={loading}
              className="bg-brand-500 text-white p-4 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Pane 3: Study Tools (Sidebar Right) */}
      <aside className="w-72 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Study Accelerator</h3>
        <div className="space-y-3">
          <button className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:border-brand-500 transition-all group">
            <span className="text-xl mb-2 block">📝</span>
            <p className="text-xs font-black uppercase tracking-tight">Generate Quiz</p>
            <p className="text-[9px] text-slate-500 mt-1">Test your knowledge from sources.</p>
          </button>
          <button className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:border-brand-500 transition-all group">
            <span className="text-xl mb-2 block">📋</span>
            <p className="text-xs font-black uppercase tracking-tight">Course Summary</p>
            <p className="text-[9px] text-slate-500 mt-1">High-level bullet points.</p>
          </button>
          <button className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:border-brand-500 transition-all group">
            <span className="text-xl mb-2 block">💡</span>
            <p className="text-xs font-black uppercase tracking-tight">Key Concepts</p>
            <p className="text-[9px] text-slate-500 mt-1">Core terminology definitions.</p>
          </button>
        </div>
        
        <div className="mt-auto pt-10">
           <div className="bg-brand-500/10 p-4 rounded-2xl border border-brand-500/20">
              <p className="text-[9px] font-bold text-brand-600 uppercase mb-2">Workspace Insight</p>
              <p className="text-[10px] text-brand-700 leading-relaxed">You have {workspace.shared.length + workspace.privateNotes.length} sources indexed for the current session.</p>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default StudentPortal;
