
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
};

const StudentManagement: React.FC<{ courseId: string }> = ({ courseId }) => {
  const [list, setList] = useState<{ pending: Student[], enrolled: Student[] }>({ pending: [], enrolled: [] });
  const [history, setHistory] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchList = () => {
    apiService.getWaitlist(courseId).then(setList);
    apiService.getLecturerWaitlistHistory(courseId).then(setHistory);
  };

  useEffect(() => { fetchList(); }, [courseId]);

  const approve = async (sid: string) => {
    await apiService.approveStudent(courseId, sid);
    fetchList();
  };

  const reject = async (sid: string) => {
    await apiService.rejectStudent(courseId, sid);
    fetchList();
  };

  const remove = async (sid: string) => {
    setRemovingId(sid);
  };

  const confirmRemove = async (sid: string) => {
    await apiService.removeStudent(courseId, sid);
    setRemovingId(null);
    fetchList();
  };

  return (
    <div className="space-y-6 sm:space-y-8 h-full overflow-y-auto custom-scrollbar pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Pending */}
        <section className="bg-white dark:bg-slate-850 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6" dir="rtl">ממתינים לאישור</h3>
          <div className="space-y-3 sm:space-y-4">
            {list.pending.length === 0 && (
              <div className="flex flex-col items-center py-8 space-y-2 text-center" dir="rtl">
                <span className="text-2xl">🎉</span>
                <p className="text-xs text-slate-500 font-bold">אין סטודנטים ממתינים</p>
              </div>
            )}
            {list.pending.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl" dir="rtl">
                <div className="flex items-center space-x-3 space-x-reverse">
                  {s.picture
                    ? <img src={s.picture} className="w-8 h-8 rounded-lg" alt="" />
                    : <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-slate-700 flex items-center justify-center font-black text-brand-600 text-[10px]">{s.name.charAt(0)}</div>
                  }
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.name}</span>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <button onClick={() => approve(s.id)} className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-lg hover:scale-110 transition-transform" title="אשר"><Icons.Check /></button>
                  <button onClick={() => reject(s.id)} className="p-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-lg hover:scale-110 transition-transform" title="דחה"><Icons.X /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Enrolled */}
        <section className="bg-white dark:bg-slate-850 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6" dir="rtl">סטודנטים רשומים</h3>
          <div className="space-y-3 sm:space-y-4">
            {list.enrolled.length === 0 && (
              <div className="flex flex-col items-center py-8 space-y-2 text-center" dir="rtl">
                <span className="text-2xl">👥</span>
                <p className="text-xs text-slate-500 font-bold">אין סטודנטים רשומים</p>
              </div>
            )}
            {list.enrolled.map(s => (
              <div key={s.id} dir="rtl">
                {removingId === s.id ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">האם להסיר את {s.name} מהקורס?</p>
                    <div className="flex space-x-2 space-x-reverse">
                      <button onClick={() => confirmRemove(s.id)} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-colors">הסר</button>
                      <button onClick={() => setRemovingId(null)} className="px-4 py-2 bg-zinc-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black rounded-xl uppercase tracking-widest transition-colors">ביטול</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl group">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      {s.picture
                        ? <img src={s.picture} className="w-8 h-8 rounded-lg" alt="" />
                        : <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-[10px]">{s.name.charAt(0)}</div>
                      }
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.name}</span>
                    </div>
                    <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:scale-110 transition-all"><Icons.X /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* History */}
      <section className="bg-white dark:bg-slate-850 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-slate-800">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6" dir="rtl">היסטוריית רשימת המתנה</h3>
        <div className="space-y-3 sm:space-y-4">
          {history.length === 0 && (
            <p className="text-xs text-slate-500 font-bold" dir="rtl">אין רשומות היסטוריה.</p>
          )}
          {history.map(h => (
            <div key={h.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl" dir="rtl">
              <div className="flex items-center space-x-4 space-x-reverse">
                {h.studentPicture
                  ? <img src={h.studentPicture} className="w-10 h-10 rounded-xl" alt="" />
                  : <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-xs">{h.studentName?.charAt(0) || '?'}</div>
                }
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{h.studentName}</h4>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(h.timestamp).toLocaleString('he-IL')}</p>
                </div>
              </div>
              <div className={`px-3 sm:px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${h.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : h.status === 'rejected' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                {h.status === 'approved' ? 'אושר' : h.status === 'rejected' ? 'נדחה' : 'ממתין'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StudentManagement;
