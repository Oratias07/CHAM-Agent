import React, { useState, useEffect } from 'react';
import { Assignment, Submission, Course } from '../types';
import { apiService } from '../services/apiService';

interface StudentAssignmentsProps {
  course: Course;
}

const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ course }) => {
  const [data, setData] = useState<{ assignments: Assignment[], submissions: Submission[] }>({ assignments: [], submissions: [] });
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [course.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getStudentAssignments(course.id);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !studentCode.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiService.submitAssignment(selectedAssignment.id, studentCode);
      alert("Submission successful and evaluated!");
      setStudentCode('');
      setSelectedAssignment(null);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmission = (assignmentId: string) => {
    return data.submissions.find(s => s.assignmentId === assignmentId);
  };

  const isLocked = (a: Assignment) => {
    const now = new Date();
    const openDate = new Date(a.openDate);
    const submission = getSubmission(a.id);
    const dueDate = submission?.extensionUntil ? new Date(submission.extensionUntil) : new Date(a.dueDate);
    
    if (now < openDate) return { locked: true, reason: 'Not yet open' };
    if (now > dueDate) return { locked: true, reason: 'Deadline passed' };
    return { locked: false };
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Retrieving Assignments</span>
      </div>
    );
  }

  return (
    <div className="p-12 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12">
        <header>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Course Evaluations</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Submit your work for automatic AI grading</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            {data.assignments.map(a => {
              const submission = getSubmission(a.id);
              const lockStatus = isLocked(a);
              
              return (
                <div key={a.id} className={`bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border transition-all ${selectedAssignment?.id === a.id ? 'border-brand-500 shadow-2xl ring-4 ring-brand-500/10' : 'border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-xl'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{a.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${submission ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {submission ? 'Submitted' : 'Pending'}
                        </span>
                        {lockStatus.locked && (
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                            {lockStatus.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</p>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100">{new Date(submission?.extensionUntil || a.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {submission && (
                    <div className="mb-6 p-4 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border border-zinc-100 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Evaluation</span>
                        <span className="text-sm font-black text-brand-600">{submission.score}%</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold italic line-clamp-2">"{submission.feedback}"</p>
                    </div>
                  )}

                  <button 
                    disabled={lockStatus.locked && !submission}
                    onClick={() => setSelectedAssignment(a)}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                      selectedAssignment?.id === a.id 
                        ? 'bg-brand-600 text-white shadow-lg' 
                        : (lockStatus.locked && !submission) ? 'bg-zinc-100 text-slate-300 cursor-not-allowed' : 'bg-zinc-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white'
                    }`}
                  >
                    {submission ? 'Update Submission' : 'Start Submission'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-850 rounded-[3rem] border border-zinc-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[600px] sticky top-12">
            {selectedAssignment ? (
              <>
                <header className="p-8 border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{selectedAssignment.title}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Submit your code below</p>
                </header>
                <div className="p-8 space-y-6 flex-grow flex flex-col">
                  <div className="bg-zinc-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-zinc-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">Task Description</h4>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{selectedAssignment.question}</p>
                  </div>
                  <div className="flex-grow flex flex-col space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Solution</label>
                    <textarea 
                      value={studentCode}
                      onChange={e => setStudentCode(e.target.value)}
                      className="flex-grow w-full p-6 bg-zinc-50 dark:bg-slate-900/60 rounded-[2rem] border border-zinc-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-brand-500/10 font-mono text-xs dark:text-white resize-none"
                      placeholder="Paste your code here..."
                    />
                  </div>
                  <button 
                    disabled={!studentCode.trim() || submitting}
                    onClick={handleSubmit}
                    className="w-full py-6 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'AI Evaluating...' : 'Submit for Grading'}
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-zinc-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Ready to Submit?</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Select an assignment from the list to begin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;
