
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
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center font-black uppercase tracking-widest text-slate-400">Loading System State...</div>;
  if (!data) return <div className="p-10 text-center text-rose-500 font-black">Failed to load database.</div>;

  const renderTable = (items: any[], columns: string[]) => (
    <div className="overflow-x-auto rounded-[2rem] border border-zinc-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-850">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-slate-800/60 border-b dark:border-slate-800">
            {columns.map(col => (
              <th key={col} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-slate-800/40 transition-colors">
              {columns.map(col => (
                <td key={col} className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                  {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-8">
      <div className="flex space-x-4 bg-white dark:bg-slate-850 p-2 rounded-2xl border dark:border-slate-800 shadow-sm w-fit">
        {(['users', 'grades', 'courses', 'messages'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-hidden">
        {activeTab === 'users' && renderTable(data.users, ['googleId', 'name', 'email', 'role'])}
        {activeTab === 'grades' && renderTable(data.grades, ['userId', 'studentId', 'exerciseId', 'score', 'feedback'])}
        {activeTab === 'courses' && renderTable(data.courses, ['name', 'code', 'lecturerName', 'enrolledStudents'])}
        {activeTab === 'messages' && renderTable(data.messages, ['senderId', 'receiverId', 'text', 'timestamp'])}
      </div>
    </div>
  );
};

export default DatabaseViewer;
