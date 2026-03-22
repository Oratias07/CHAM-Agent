
import React, { useRef } from 'react';
import { GradeBookState } from '../types';

interface GradeBookProps {
  state: GradeBookState;
  onUpdateStudentName: (id: string, name: string) => void;
  onUpdateMaxScore: (exerciseId: string, maxScore: number) => void;
  onUpdateEntry: (exerciseId: string, studentId: string, field: 'score' | 'feedback', value: any) => void;
  onAddExercise: () => void;
  onAddStudent: () => void;
  onResetSystem: () => void;
  isResetting: boolean;
}

const Icons = {
  Grid: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  ChevronLeft: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>,
  Reset: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Export: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
};

const GradeBook: React.FC<GradeBookProps> = ({
  state,
  onUpdateStudentName,
  onUpdateMaxScore,
  onUpdateEntry,
  onAddExercise,
  onAddStudent,
  onResetSystem,
  isResetting
}) => {
  const { students = [], exercises = [] } = state || {};
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  const handleDownloadCSV = () => {
    const BOM = "\uFEFF";
    const escapeCsv = (field: any): string => {
      if (field === null || field === undefined) return '';
      const s = String(field);
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headerRow = ["שם סטודנט"];
    exercises.forEach(ex => {
      headerRow.push(`${ex.name} - ציון`);
      headerRow.push(`${ex.name} - משוב`);
    });

    const rows = students.map(student => {
      const rowData: (string | number)[] = [student.name];
      exercises.forEach(ex => {
        const entry = ex.entries ? (ex.entries[student.id] || { score: 0, feedback: "" }) : { score: 0, feedback: "" };
        rowData.push(entry.score);
        rowData.push(entry.feedback);
      });
      return rowData.map(escapeCsv).join(",");
    });

    const csvContent = BOM + headerRow.map(escapeCsv).join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ציונים_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col h-full transition-colors duration-300">
      {/* Toolbar */}
      <div className="bg-zinc-50 dark:bg-slate-800/80 border-b border-zinc-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center space-x-3 sm:space-x-6">
          <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center space-x-2 uppercase tracking-tighter" dir="rtl">
            <span className="text-brand-500"><Icons.Grid /></span>
            <span>רשימת ציונים</span>
          </h2>
          <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-zinc-200 dark:border-slate-700 shadow-sm p-0.5">
            <button onClick={() => handleScroll('left')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-brand-500 transition-colors"><Icons.ChevronLeft /></button>
            <button onClick={() => handleScroll('right')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-brand-500 transition-colors"><Icons.ChevronRight /></button>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onResetSystem}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 border border-zinc-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:border-rose-200 text-[9px] sm:text-[10px] font-black rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all uppercase tracking-widest disabled:opacity-30"
            dir="rtl"
          >
            <span className={isResetting ? 'animate-spin' : ''}><Icons.Reset /></span>
            <span>נקה הכל</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-1.5 px-3 sm:px-5 py-2 bg-slate-900 dark:bg-brand-600 text-white text-[9px] sm:text-[10px] font-black rounded-xl hover:bg-black dark:hover:bg-brand-500 transition-all shadow-md uppercase tracking-widest"
            dir="rtl"
          >
            <Icons.Export />
            <span>ייצא CSV</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {exercises.length === 0 && (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4 p-12" dir="rtl">
          <div className="text-5xl">📊</div>
          <h3 className="text-slate-600 dark:text-slate-300 font-black text-sm uppercase tracking-widest">אין תרגילים עדיין</h3>
          <p className="text-slate-400 text-xs font-bold">לחץ על "הוסף תרגיל" כדי להתחיל</p>
        </div>
      )}

      {/* Table */}
      {exercises.length > 0 && (
        <div ref={scrollContainerRef} className="flex-grow overflow-auto custom-scrollbar pb-24">
          <table className="divide-y divide-zinc-200 dark:divide-slate-800 border-collapse table-auto w-full">
            <thead className="bg-zinc-50 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 w-40 min-w-[160px] z-30 sticky left-0" dir="rtl">תרגיל</th>
                <th className="px-4 sm:px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 w-32 min-w-[130px] z-30 sticky left-[160px]" dir="rtl">מדד</th>
                {students.map(student => (
                  <th key={student.id} className="px-4 py-4 text-center text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider border-r border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-w-[200px]">
                    <input
                      type="text"
                      value={student.name}
                      onChange={e => onUpdateStudentName(student.id, e.target.value)}
                      className="w-full bg-transparent text-center focus:bg-zinc-50 dark:focus:bg-slate-800 focus:ring-1 focus:ring-brand-500 rounded-lg px-2 py-1 outline-none transition-all font-black text-slate-800 dark:text-slate-100"
                      dir="rtl"
                    />
                  </th>
                ))}
                <th className="px-4 sm:px-6 py-4 bg-zinc-50 dark:bg-slate-800 min-w-[140px]">
                  <button
                    onClick={onAddStudent}
                    className="w-full px-3 py-2 border border-dashed border-zinc-300 dark:border-slate-700 rounded-xl text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all text-[9px] font-black uppercase tracking-widest"
                    dir="rtl"
                  >
                    + הוסף סטודנט
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-zinc-100 dark:divide-slate-800">
              {exercises.map(exercise => (
                <React.Fragment key={exercise.id}>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td rowSpan={2} className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs font-black text-slate-800 dark:text-slate-200 border-r border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 sticky left-0 z-10 text-right" dir="rtl">{exercise.name}</td>
                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase border-r border-zinc-200 dark:border-slate-700 bg-brand-50/20 dark:bg-brand-950/20 sticky left-[160px] z-10">
                      <div className="flex items-center space-x-2 space-x-reverse" dir="rtl">
                        <span>ציון /</span>
                        <input
                          type="number"
                          value={exercise.maxScore}
                          onChange={e => onUpdateMaxScore(exercise.id, Number(e.target.value))}
                          className="w-10 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-900/50 rounded-md px-1 py-1 text-center font-black focus:ring-1 focus:ring-brand-500 outline-none text-xs"
                        />
                      </div>
                    </td>
                    {students.map(student => {
                      const entry = (exercise.entries || {})[student.id] || { score: 0, feedback: '' };
                      const pct = (entry.score / (exercise.maxScore || 10)) * 100;
                      let cls = 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30';
                      if (pct >= 90) cls = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
                      else if (pct >= 70) cls = 'text-brand-600 bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900/40';
                      else if (pct >= 50) cls = 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
                      return (
                        <td key={`${exercise.id}-${student.id}-score`} className="px-4 py-4 text-center border-r border-zinc-200 dark:border-slate-800">
                          <input
                            type="number"
                            value={entry.score}
                            onChange={e => onUpdateEntry(exercise.id, student.id, 'score', Number(e.target.value))}
                            className={`w-16 text-center text-xs font-black border rounded-lg py-2 outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${cls}`}
                          />
                        </td>
                      );
                    })}
                    <td className="bg-zinc-50/30 dark:bg-slate-800/30" />
                  </tr>
                  <tr className="bg-zinc-50/20 dark:bg-slate-800/10">
                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-[9px] font-black text-slate-400 uppercase border-r border-zinc-200 dark:border-slate-700 sticky left-[160px] z-10 bg-zinc-50/80 dark:bg-slate-800/80 backdrop-blur-md" dir="rtl">משוב</td>
                    {students.map(student => {
                      const entry = (exercise.entries || {})[student.id] || { score: 0, feedback: '' };
                      return (
                        <td key={`${exercise.id}-${student.id}-feedback`} className="px-3 py-3 text-right text-xs border-r border-zinc-200 dark:border-slate-800 align-top" dir="rtl">
                          <textarea
                            value={entry.feedback}
                            onChange={e => onUpdateEntry(exercise.id, student.id, 'feedback', e.target.value)}
                            className="w-full h-20 p-3 text-[11px] font-bold bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-xl resize-none focus:ring-1 focus:ring-brand-500 outline-none custom-scrollbar text-slate-700 dark:text-slate-200"
                            placeholder="סיכום הערכה..."
                          />
                        </td>
                      );
                    })}
                    <td className="bg-zinc-50/30 dark:bg-slate-800/30" />
                  </tr>
                  <tr className="h-3 bg-zinc-100 dark:bg-slate-900"><td colSpan={students.length + 3} /></tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating action */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center space-x-4 shadow-2xl z-40 hover:scale-105 transition-transform">
        <button
          onClick={onAddExercise}
          className="flex items-center space-x-2 space-x-reverse px-4 sm:px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
          dir="rtl"
        >
          <Icons.Plus />
          <span>הוסף תרגיל</span>
        </button>
      </div>
    </div>
  );
};

export default GradeBook;
