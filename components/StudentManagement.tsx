
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
};

const StudentManagement: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [list, setList] = useState<{ pending: Student[], enrolled: Student[] }>({ pending: [], enrolled: [] });

  const fetchList = () => apiService.getWaitlist(courseId).then(setList);

  useEffect(() => {
    fetchList();
  }, [courseId]);

  const approve = async (sid: string) => {
    await apiService.approveStudent(courseId, sid);
    fetchList();
  };

  const reject = async (sid: string) => {
    await apiService.rejectStudent(courseId, sid);
    fetchList();
  };

  const remove = async (sid: string) => {
    if (confirm("Remove student from course?")) {
      await apiService.removeStudent(courseId, sid);
      fetchList();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <section className="bg-white dark:bg-slate-850 p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 flex flex-col">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Pending Enrollment Logic</h3>
        <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar">
          {list.pending.length === 0 && <p className="text-xs text-slate-500 font-bold">Waiting list is empty.</p>}
          {list.pending.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl">
              <div className="flex items-center space-x-3">
                <img src={s.picture} className="w-8 h-8 rounded-lg" alt="" />
                <span className="text-xs font-bold">{s.name}</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => approve(s.id)} className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-lg hover:scale-110 transition-transform"><Icons.Check /></button>
                <button onClick={() => reject(s.id)} className="p-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-lg hover:scale-110 transition-transform"><Icons.X /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-850 p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 flex flex-col">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Active Node Roster</h3>
        <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar">
          {list.enrolled.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl group">
              <div className="flex items-center space-x-3">
                <img src={s.picture} className="w-8 h-8 rounded-lg" alt="" />
                <span className="text-xs font-bold">{s.name}</span>
              </div>
              <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:scale-110 transition-all"><Icons.X /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StudentManagement;
