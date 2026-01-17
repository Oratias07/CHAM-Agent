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
  const { students, exercises } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDownloadCSV = () => {
    const BOM = "\uFEFF"; 
    const escapeCsv = (field: any): string => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const headerRow = ["Student Name"];
    exercises.forEach(ex => {
      headerRow.push(`${ex.name} Score`);
      headerRow.push(`${ex.name} Feedback`);
    });

    const rows = students.map(student => {
      const rowData: (string | number)[] = [student.name];
      exercises.forEach(ex => {
        const entry = ex.entries[student.id] || { score: 0, feedback: "" };
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
    link.download = `grades_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full transition-colors duration-300">
      <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center uppercase tracking-tighter">
              <span className="mr-3 text-2xl">📊</span> Class Data Grid
            </h2>
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm p-1">
                <button onClick={() => handleScroll('left')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                <button onClick={() => handleScroll('right')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
            </div>
        </div>

        <div className="flex items-center space-x-4">
           <button onClick={onResetSystem} disabled={isResetting} className="flex items-center space-x-2 px-4 py-2 border-2 border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-black rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all uppercase tracking-widest disabled:opacity-30">
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             <span>Restart System</span>
           </button>
           <button onClick={handleDownloadCSV} className="flex items-center space-x-2 px-6 py-2 bg-emerald-600 dark:bg-emerald-700 text-white text-xs font-black rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             <span>Export CSV</span>
           </button>
        </div>
      </div>
      
      <div ref={scrollContainerRef} className="flex-grow overflow-auto custom-scrollbar p-0 pb-24">
        <table className="divide-y divide-slate-200 dark:divide-slate-800 border-collapse table-auto w-full">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-40 min-w-[180px] z-30 sticky left-0">Exercise Stream</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-32 min-w-[140px] z-30 sticky left-[180px]">Metric</th>
              {students.map((student) => (
                <th key={student.id} scope="col" className="px-4 py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-w-[220px]">
                  <input type="text" value={student.name} onChange={(e) => onUpdateStudentName(student.id, e.target.value)} className="w-full bg-transparent text-center focus:bg-slate-50 dark:focus:bg-slate-800 focus:ring-1 focus:ring-brand-500 rounded-lg px-2 py-1 outline-none transition-all font-black" />
                </th>
              ))}
              <th scope="col" className="px-6 py-4 bg-slate-50 dark:bg-slate-800 min-w-[150px]">
                 <button onClick={onAddStudent} className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-500 transition-all text-[10px] font-black uppercase tracking-widest">
                   + Add Student
                 </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {exercises.map((exercise) => (
              <React.Fragment key={exercise.id}>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition-colors">
                  <td rowSpan={2} className="px-6 py-6 whitespace-nowrap text-sm font-black text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky left-0 z-10 transition-colors">{exercise.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase border-r border-slate-200 dark:border-slate-700 bg-brand-50/20 dark:bg-brand-950/20 sticky left-[180px] z-10 backdrop-blur-sm transition-colors">
                    <div className="flex items-center space-x-2"><span>Score /</span><input type="number" value={exercise.maxScore} onChange={(e) => onUpdateMaxScore(exercise.id, Number(e.target.value))} className="w-12 bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-900/50 rounded-lg px-2 py-1 text-center font-black focus:ring-2 focus:ring-brand-500 outline-none shadow-sm" /></div>
                  </td>
                  {students.map((student) => {
                    const entry = exercise.entries[student.id] || { score: 0, feedback: '' };
                    const percentage = (entry.score / exercise.maxScore) * 100;
                    let scoreClass = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30';
                    if (percentage >= 90) scoreClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
                    else if (percentage >= 70) scoreClass = 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900/40';
                    else if (percentage >= 50) scoreClass = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
                    return (
                      <td key={`${exercise.id}-${student.id}-score`} className="px-4 py-4 text-center border-r border-slate-200 dark:border-slate-800">
                        <input type="number" value={entry.score} onChange={(e) => onUpdateEntry(exercise.id, student.id, 'score', Number(e.target.value))} className={`w-20 text-center text-sm font-black border rounded-xl py-2 outline-none focus:ring-4 focus:ring-brand-500/20 transition-all shadow-sm ${scoreClass}`} />
                      </td>
                    );
                  })}
                  <td className="bg-slate-50/30 dark:bg-slate-800/30"></td>
                </tr>
                <tr className="bg-slate-50/20 dark:bg-slate-800/10">
                  <td className="px-4 py-4 whitespace-nowrap text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase border-r border-slate-200 dark:border-slate-700 sticky left-[180px] z-10 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md transition-colors">Hebrew Feedback</td>
                  {students.map((student) => {
                    const entry = exercise.entries[student.id] || { score: 0, feedback: '' };
                    return (
                      <td key={`${exercise.id}-${student.id}-feedback`} className="px-3 py-3 text-right text-xs border-r border-slate-200 dark:border-slate-800 align-top" dir="rtl">
                        <textarea value={entry.feedback} onChange={(e) => onUpdateEntry(exercise.id, student.id, 'feedback', e.target.value)} className="w-full h-24 p-4 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl resize-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 outline-none custom-scrollbar shadow-inner text-slate-700 dark:text-slate-300 transition-all" placeholder="סיכום הערכה..." />
                      </td>
                    );
                  })}
                   <td className="bg-slate-50/30 dark:bg-slate-800/30"></td>
                </tr>
                <tr className="h-6 bg-slate-100 dark:bg-slate-950"><td colSpan={students.length + 3}></td></tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center space-x-6 shadow-2xl z-40 transition-all hover:scale-105 group">
        <div className="px-4 border-r border-white/10 hidden md:block">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
           <div className="text-xs font-bold text-emerald-400 uppercase tracking-tight">Synced</div>
        </div>
        <button onClick={onAddExercise} className="flex items-center space-x-3 px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-brand-500/30 active:scale-95">
          <span className="text-lg">📂</span>
          <span>New Exercise</span>
        </button>
        <div className="text-white/30 text-xs font-medium pr-4 hidden lg:block">Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">ESC</kbd> to return</div>
      </div>
    </div>
  );
};

export default GradeBook;