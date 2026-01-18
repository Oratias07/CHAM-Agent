
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchWorkspace = async () => {
    try {
      const data = await apiService.getStudentWorkspace();
      setWorkspace(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChat = async (task?: 'quiz' | 'summary' | 'concepts', customInput?: string) => {
    const msg = customInput || input;
    if (!msg.trim() && !task && !loading) return;
    
    if (msg.trim()) {
      setMessages(prev => [...prev, { role: 'user', text: msg }]);
      setInput('');
    }
    setLoading(true);

    try {
      const allSources = [...workspace.shared, ...workspace.privateNotes];
      const res = await apiService.studentChat(msg, allSources, task);
      setMessages(prev => [...prev, { role: 'model', text: res.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await apiService.uploadMaterial(file.name, content);
        fetchWorkspace();
        alert(`Successfully uploaded ${file.name}`);
      } catch (err) {
        alert("Upload failed.");
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar: Sources & Settings */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shadow-xl z-20">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Notebook</h1>
            <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-1">Grounding Sources</p>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" title="Exit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Lecturer Materials</h3>
            {workspace.shared.length > 0 ? workspace.shared.map(s => (
              <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer border border-transparent hover:border-brand-200 transition-all">
                <p className="text-xs font-bold truncate">{s.title}</p>
                <span className="text-[9px] text-slate-400">Shared Resource</span>
              </div>
            )) : <p className="text-[10px] text-slate-400 px-2 italic">No shared materials.</p>}
          </section>

          <section>
            <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3 px-2 flex justify-between items-center">
              <span>Private Sources</span>
              <button onClick={() => fileInputRef.current?.click()} className="text-brand-500 hover:text-brand-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </h3>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.c,.cpp,.h,.md" />
            
            {workspace.privateNotes.length > 0 ? workspace.privateNotes.map(n => (
              <div key={n.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl mb-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer border border-transparent">
                <p className="text-xs font-bold truncate">{n.title}</p>
                <span className="text-[9px] text-slate-400">Added by you</span>
              </div>
            )) : (
              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 mb-2">Drag and drop files to index them for AI grounding.</p>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-black text-brand-500 uppercase">Upload File</button>
              </div>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-brand-500/10 p-4 rounded-2xl border border-brand-500/20">
            <p className="text-[9px] font-bold text-brand-600 uppercase mb-1">Status</p>
            <p className="text-[11px] text-brand-700 dark:text-brand-400 leading-tight">
              {workspace.shared.length + workspace.privateNotes.length} sources synchronized in workspace.
            </p>
          </div>
        </div>
      </aside>

      {/* Main: Gemini-style Chat */}
      <main className="flex-grow flex flex-col relative bg-white dark:bg-slate-950">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-10 shrink-0 justify-between">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-black text-xs">ST</div>
             <span className="text-sm font-black uppercase tracking-tight">Academic Assistant</span>
           </div>
           <div className="flex items-center space-x-4">
              <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">Pro Model Active</span>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-10 space-y-12 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-12">
            {messages.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center">
                <h1 className="text-5xl font-black tracking-tighter mb-6 bg-gradient-to-r from-brand-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Hello, {user.name.split(' ')[0]}</h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
                  I'm your integrated study notebook. Ask me questions about your course materials, generate custom quizzes, or summarize complex topics.
                </p>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <button onClick={() => handleChat('quiz', 'Create a quiz')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📝</span>
                    <h4 className="font-black text-xs uppercase tracking-widest mb-1">Generate Quiz</h4>
                    <p className="text-[10px] text-slate-500 leading-snug">Self-assess your knowledge with AI-generated questions.</p>
                  </button>
                  <button onClick={() => handleChat('summary', 'Summarize sources')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">📋</span>
                    <h4 className="font-black text-xs uppercase tracking-widest mb-1">Course Summary</h4>
                    <p className="text-[10px] text-slate-500 leading-snug">Get a high-level overview of all synced materials.</p>
                  </button>
                  <button onClick={() => handleChat('concepts', 'Extract concepts')} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group">
                    <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">💡</span>
                    <h4 className="font-black text-xs uppercase tracking-widest mb-1">Key Concepts</h4>
                    <p className="text-[10px] text-slate-500 leading-snug">Deep dive into core terminology and definitions.</p>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm ${m.role === 'user' ? 'ml-4 bg-brand-500 text-white' : 'mr-4 bg-slate-100 dark:bg-slate-800 text-brand-500'}`}>
                      {m.role === 'user' ? user.name[0] : 'ST'}
                    </div>
                    <div className={`p-6 rounded-[2rem] text-base leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' 
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-100'
                    }`}>
                       <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap font-medium">
                         {m.text}
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 mr-4 flex items-center justify-center text-brand-500">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] w-64 h-16"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-10 shrink-0 bg-gradient-to-t from-white dark:from-slate-950 via-white dark:via-slate-950 to-transparent">
          <div className="max-w-4xl mx-auto flex items-center space-x-4 bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 group focus-within:border-brand-500 transition-all">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-brand-500 rounded-2xl transition-all"
              title="Upload source"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </button>
            <textarea 
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              placeholder="Message your academic assistant..."
              className="flex-grow bg-transparent border-none outline-none py-3 text-base resize-none custom-scrollbar"
              style={{ maxHeight: '200px' }}
            />
            <button 
              onClick={() => handleChat()}
              disabled={loading || !input.trim()}
              className={`p-3 rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                !input.trim() ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-brand-500 text-white shadow-brand-500/30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">Powered by ST System Core v2.0 • Responses grounded in workspace sources</p>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
