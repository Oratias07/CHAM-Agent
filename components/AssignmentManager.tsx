import React, { useState, useEffect } from 'react';
import { Assignment, Course, Submission } from '../types';
import { apiService } from '../services/apiService';

interface AssignmentManagerProps {
  course: Course;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ course }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    question: '',
    masterSolution: '',
    rubric: '',
    customInstructions: '',
    maxScore: 100,
    openDate: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchAssignments();
  }, [course.id]);

  const fetchAssignments = async () => {
    try {
      const list = await apiService.getLecturerAssignments(course.id);
      setAssignments(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    try {
      await apiService.createAssignment({
        ...formData,
        courseId: course.id,
        openDate: new Date(formData.openDate),
        dueDate: new Date(formData.dueDate)
      });
      setShowCreateModal(false);
      fetchAssignments();
      setFormData({
        title: '',
        question: '',
        masterSolution: '',
        rubric: '',
        customInstructions: '',
        maxScore: 100,
        openDate: '',
        dueDate: ''
      });
    } catch (e) {
      alert("Failed to create assignment");
    }
  };

  const viewSubmissions = async (a: Assignment) => {
    setSelectedAssignment(a);
    setLoading(true);
    try {
      const list = await apiService.getAssignmentSubmissions(a.id);
      setSubmissions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantExtension = async (subId: string) => {
    const date = prompt("Enter extension date (YYYY-MM-DD):");
    if (!date) return;
    try {
      await apiService.grantExtension(subId, new Date(date));
      if (selectedAssignment) viewSubmissions(selectedAssignment);
    } catch (e) {
      alert("Failed to grant extension");
    }
  };

  return (
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Assignments</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manage course evaluations and deadlines</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
        >
          New Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {assignments.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{a.title}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">ID: {a.id.substring(0, 8)}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open: {new Date(a.openDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => viewSubmissions(a)}
                  className="flex-grow py-3 bg-zinc-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-600 hover:text-white transition-all"
                >
                  View Submissions
                </button>
                <button 
                  onClick={() => { if(confirm("Delete assignment?")) apiService.deleteAssignment(a.id).then(fetchAssignments); }}
                  className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px]">
          <header className="p-8 border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
              {selectedAssignment ? `Submissions: ${selectedAssignment.title}` : 'Select an assignment to view submissions'}
            </h3>
          </header>
          <div className="flex-grow overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center animate-pulse text-slate-400 font-black uppercase tracking-widest text-[10px]">Accessing Records...</div>
            ) : submissions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No submissions yet</div>
            ) : (
              submissions.map(s => (
                <div key={s.id} className="p-6 bg-zinc-50 dark:bg-slate-900/40 rounded-3xl border border-zinc-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-black text-[10px]">{s.studentName.charAt(0)}</div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{s.studentName}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${s.score && s.score >= 80 ? 'text-emerald-500' : s.score && s.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {s.score}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold line-clamp-2 mb-4 italic">"{s.feedback}"</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Submitted: {new Date(s.timestamp).toLocaleString()}</span>
                    <button 
                      onClick={() => handleGrantExtension(s.id)}
                      className="text-[8px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                    >
                      Grant Extension
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-850 rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]">
            <header className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-900/20">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Create Assignment</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">Close</button>
            </header>
            <div className="flex-grow overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                  <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white" placeholder="e.g. Final Project" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Score</label>
                  <input type="number" value={formData.maxScore} onChange={e => setFormData({...formData, maxScore: parseInt(e.target.value)})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open Date</label>
                  <input type="date" value={formData.openDate} onChange={e => setFormData({...formData, openDate: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question / Prompt</label>
                <textarea rows={4} value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white resize-none" placeholder="Describe the task..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Solution</label>
                <textarea rows={4} value={formData.masterSolution} onChange={e => setFormData({...formData, masterSolution: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-mono text-xs dark:text-white resize-none" placeholder="Paste the ideal code solution..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grading Rubric</label>
                <textarea rows={4} value={formData.rubric} onChange={e => setFormData({...formData, rubric: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white resize-none" placeholder="Define grading criteria..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom AI Instructions (Optional)</label>
                <textarea rows={2} value={formData.customInstructions} onChange={e => setFormData({...formData, customInstructions: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border-none outline-none font-bold text-sm dark:text-white resize-none" placeholder="Special hints for the AI grader..." />
              </div>
            </div>
            <footer className="p-8 border-t dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20 flex justify-end space-x-4">
              <button onClick={() => setShowCreateModal(false)} className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="px-10 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Create Assignment</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;
