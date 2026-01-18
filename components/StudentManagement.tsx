
import React, { useState, useEffect } from 'react';
import { Student, Exercise, Material } from '../types';
import { apiService } from '../services/apiService';

interface StudentManagementProps {
  students: Student[];
  exercises: Exercise[];
  courseId: string;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ students, exercises, courseId }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentMaterials, setStudentMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const fetchStudentSpecifics = async (student: Student) => {
    setLoading(true);
    setSelectedStudent(student);
    try {
      // We assume an endpoint for specific student files exists or reuse general logic
      // For now we simulate/use shared if none found
      const data = await apiService.getStudentWorkspace(); // This gets logged-in user's, we need a lecturer-side fetch
      setStudentMaterials([]); // In real app, fetch /api/lecturer/student/:id/materials
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFile = async () => {
    if (!selectedStudent || !newFileTitle || !newFileContent) return;
    try {
      // apiService.uploadStudentSpecific(selectedStudent.id, newFileTitle, newFileContent)
      alert(`Simulated: Uploaded "${newFileTitle}" for ${selectedStudent.name}`);
      setNewFileTitle('');
      setNewFileContent('');
    } catch (e) {
      alert("Failed to add file.");
    }
  };

  const calculateAnalytics = (studentId: string) => {
    let totalScore = 0;
    let gradedCount = 0;
    exercises.forEach(ex => {
      const entry = ex.entries?.[studentId];
      if (entry) {
        totalScore += entry.score;
        gradedCount++;
      }
    });
    return {
      average: gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : 'N/A',
      completed: gradedCount,
      total: exercises.length
    };
  };

  return (
    <div className="h-full flex space-x-6 overflow-hidden">
      {/* Student List */}
      <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Student Directory</h3>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {students.map(s => (
            <button
              key={s.id}
              onClick={() => fetchStudentSpecifics(s)}
              className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
                selectedStudent?.id === s.id 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div>
                <p className="font-bold text-sm">{s.name}</p>
                <p className={`text-[10px] ${selectedStudent?.id === s.id ? 'text-white/70' : 'text-slate-400'}`}>ID: {s.id}</p>
              </div>
              <div className={`h-2 w-2 rounded-full ${selectedStudent?.id === s.id ? 'bg-white animate-pulse' : 'bg-slate-300'}`}></div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
           <button className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase rounded-2xl hover:border-brand-500 hover:text-brand-500 transition-all">
             + Provision New ID
           </button>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
        {selectedStudent ? (
          <div className="flex flex-col h-full overflow-hidden">
            <header className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/30">
               <div className="flex items-center space-x-6">
                 <div className="w-20 h-20 rounded-3xl bg-brand-500 flex items-center justify-center text-white text-3xl font-black">
                   {selectedStudent.name[0]}
                 </div>
                 <div>
                   <h2 className="text-3xl font-black uppercase tracking-tight text-slate-800 dark:text-white">{selectedStudent.name}</h2>
                   <div className="flex items-center space-x-3 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email: {selectedStudent.email || 'N/A'}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[10px] font-black uppercase text-brand-500 tracking-widest">Enrolled since Sept 2024</span>
                   </div>
                 </div>
               </div>
               
               <div className="flex space-x-6">
                 {(() => {
                   const stats = calculateAnalytics(selectedStudent.id);
                   return (
                     <>
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg. Score</p>
                         <p className="text-2xl font-black text-brand-600 dark:text-brand-400">{stats.average}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Submission Rate</p>
                         <p className="text-2xl font-black text-emerald-600">{Math.round((stats.completed / stats.total) * 100)}%</p>
                       </div>
                     </>
                   );
                 })()}
               </div>
            </header>

            <div className="flex-grow overflow-y-auto p-10 grid grid-cols-2 gap-10 custom-scrollbar">
              {/* Analytics Graph Placeholder */}
              <section className="col-span-1 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Exercise performance</h4>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 h-80 flex flex-col justify-end space-y-4">
                   <div className="flex items-end justify-between h-full px-4">
                     {exercises.slice(0, 8).map(ex => {
                       const score = ex.entries?.[selectedStudent.id]?.score || 0;
                       const height = (score / 10) * 100;
                       return (
                         <div key={ex.id} className="flex flex-col items-center group">
                            <div className="w-6 bg-brand-500/20 dark:bg-brand-500/10 rounded-t-lg relative h-full flex items-end">
                               <div 
                                 className="w-full bg-brand-500 rounded-t-lg transition-all duration-1000 group-hover:bg-brand-400" 
                                 style={{ height: `${height}%` }}
                               ></div>
                            </div>
                            <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-tighter truncate w-10 text-center">{ex.name}</span>
                         </div>
                       );
                     })}
                   </div>
                </div>
              </section>

              {/* Data & Files */}
              <section className="col-span-1 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Study Resources</h4>
                <div className="space-y-4 h-80 overflow-y-auto custom-scrollbar">
                   <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-brand-500">Add Targeted Resource</h5>
                      <input 
                        type="text" 
                        placeholder="File Title" 
                        value={newFileTitle}
                        onChange={e => setNewFileTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none outline-none p-4 rounded-2xl text-sm font-bold shadow-sm"
                      />
                      <textarea 
                        placeholder="Content or URL to sync..." 
                        rows={3}
                        value={newFileContent}
                        onChange={e => setNewFileContent(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none outline-none p-4 rounded-2xl text-sm font-bold shadow-sm resize-none"
                      />
                      <button 
                        onClick={handleAddFile}
                        className="w-full py-4 bg-slate-900 dark:bg-brand-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all"
                      >
                        Push to Student Workspace
                      </button>
                   </div>
                   
                   <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Synced Items</p>
                     <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex justify-between items-center group">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">📄</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Study_Plan_v1.txt</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Uploaded by system</span>
                     </div>
                   </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20">
             <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-6xl mb-10 shadow-inner animate-pulse">👥</div>
             <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Select a student</h3>
             <p className="text-slate-500 max-w-sm leading-relaxed">Choose a student from the directory to manage their specific academic profile, view targeted analytics, and provision custom resources.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
