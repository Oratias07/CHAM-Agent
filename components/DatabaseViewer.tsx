
import React, { useState, useEffect } from 'react';

interface DBData {
  users: any[];
  grades: any[];
  courses: any[];
  messages: any[];
}

const DatabaseViewer: React.FC = () => {
  const [data, setData] = useState<DBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'grades' | 'courses' | 'messages'>('users');

  useEffect(() => {
    fetch('/api/admin/db')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(setData)
      .catch(err => {
        console.error('DB Load Error:', err);
        // We'll keep data as null which triggers the error UI
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center font-black uppercase tracking-widest text-slate-400">Loading System State...</div>;
  if (!data) return <div className="p-10 text-center text-rose-500 font-black">Failed to load database.</div>;

  const renderTable = (items: any[], columns: string[]) => (
    <div className="overflow-x-auto rounded-[2rem] border border-zinc-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-850 transition-all">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-slate-800/60 border-b dark:border-slate-800">
            {columns.map(col => (
              <th key={col} className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">No records found in this collection.</td>
            </tr>
          ) : items.map((item, i) => (
            <tr key={i} className="hover:bg-brand-50/30 dark:hover:bg-brand-950/10 transition-colors group">
              {columns.map(col => (
                <td key={col} className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[250px] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {typeof item[col] === 'object' ? (
                    <span className="text-[10px] opacity-50 font-mono">{JSON.stringify(item[col]).substring(0, 30)}...</span>
                  ) : String(item[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex space-x-3 bg-white dark:bg-slate-850 p-1.5 rounded-2xl border dark:border-slate-800 shadow-sm w-fit">
          {(['users', 'grades', 'courses', 'messages'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-brand-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
          Live System Sync
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex flex-col">
        {activeTab === 'users' && renderTable(data.users, ['googleId', 'name', 'email', 'role', 'activeCourseId'])}
        {activeTab === 'grades' && renderTable(data.grades, ['userId', 'studentId', 'exerciseId', 'score', 'timestamp'])}
        {activeTab === 'courses' && renderTable(data.courses, ['name', 'code', 'lecturerName', 'enrolledStudents'])}
        {activeTab === 'messages' && renderTable(data.messages, ['senderId', 'receiverId', 'text', 'timestamp', 'isRead'])}
      </div>
    </div>
  );
};

export default DatabaseViewer;
