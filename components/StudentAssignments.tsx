import React, { useState, useEffect } from 'react';
import { Assignment, Submission, Course } from '../types';
import { apiService } from '../services/apiService';

interface StudentAssignmentsProps {
  course: Course;
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ course }) => {
  const [data, setData] = useState<{ assignments: Assignment[], submissions: Submission[] }>({ assignments: [], submissions: [] });
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<{ score: number; feedback: string } | null>(null);

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
    setSubmitError('');
    setSubmitSuccess(null);
    try {
      const result = await apiService.submitAssignment(selectedAssignment.id, studentCode);
      // Handle CHAM response
      const cham = (result as any)?.cham;
      if (cham?.status === 'awaiting_review') {
        setSubmitSuccess({
          score: -1, // sentinel: awaiting review
          feedback: 'ההגשה נשמרה ונשלחה לסקירה ע"י המרצה. תקבל ציון בקרוב.',
        });
      } else {
        const score = cham?.final_score ?? result?.score ?? 0;
        const feedback = cham?.feedback ?? result?.feedback ?? 'הוערך בהצלחה';
        setSubmitSuccess({ score, feedback });
      }
      setStudentCode('');
      fetchData();
    } catch (e: any) {
      setSubmitError(e.message || 'שגיאה בהגשה. נסה שוב.');
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

    if (now < openDate) return { locked: true, reason: 'טרם נפתח' };
    if (now > dueDate) return { locked: true, reason: 'הגשה נסגרה' };
    return { locked: false, reason: '' };
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">טוען משימות...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 lg:p-12 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        <header dir="rtl">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">הערכות קוד</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">הגש את הקוד שלך להערכה אוטומטית על ידי AI</p>
        </header>

        {data.assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4" dir="rtl">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl">📋</div>
            <h3 className="text-slate-600 dark:text-slate-300 font-black text-sm uppercase tracking-widest">אין משימות פעילות</h3>
            <p className="text-slate-400 text-xs font-bold">המרצה טרם פרסם משימות לקורס זה</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Assignment list */}
            <div className="space-y-4 sm:space-y-6">
              {data.assignments.map(a => {
                const submission = getSubmission(a.id);
                const lockStatus = isLocked(a);

                return (
                  <div
                    key={a.id}
                    className={`bg-white dark:bg-slate-850 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border transition-all ${selectedAssignment?.id === a.id ? 'border-brand-500 shadow-2xl ring-4 ring-brand-500/10' : 'border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-xl'}`}
                  >
                    <div className="flex justify-between items-start mb-4 sm:mb-6" dir="rtl">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">{a.title}</h3>
                        <div className="flex items-center space-x-2 space-x-reverse mt-1 flex-wrap gap-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${submission ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {submission ? 'הוגש' : 'ממתין להגשה'}
                          </span>
                          {lockStatus.locked && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                              {lockStatus.reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך הגשה</p>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {new Date(submission?.extensionUntil || a.dueDate).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>

                    {submission && (
                      <div className="mb-4 sm:mb-6 p-4 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border border-zinc-100 dark:border-slate-800" dir="rtl">
                        {(submission as any).assessment_status === 'awaiting_review' ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">ממתין לסקירת מרצה</span>
                              {(submission as any).final_score != null && (
                                <span className="text-xs font-bold text-slate-400">ציון ראשוני: {Math.round((submission as any).final_score)}%</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold italic">ההגשה שלך נבדקת. תקבל ציון סופי בקרוב.</p>
                          </>
                        ) : (submission as any).assessment_status === 'testing' || (submission as any).assessment_status === 'semantic_analysis' ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">בתהליך הערכה...</span>
                              <svg className="animate-spin w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">הערכת CHAM</span>
                              <span className="text-sm font-black text-brand-600">{(submission as any).final_score ?? submission.score}%</span>
                            </div>
                            {submission.feedback && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold italic line-clamp-2">"{submission.feedback}"</p>
                            )}
                            {submission.deductions && submission.deductions.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {submission.deductions.slice(0, 3).map((d, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[10px]" style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}>
                                    <span className="text-amber-500 font-black">-{d.pointsLost}</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-bold truncate">{d.requirement}</span>
                                  </div>
                                ))}
                                {submission.deductions.length > 3 && (
                                  <span className="text-[9px] text-slate-400 font-bold">...+{submission.deductions.length - 3} עוד</span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <button
                      disabled={lockStatus.locked && !submission}
                      onClick={() => { setSelectedAssignment(a); setSubmitError(''); setSubmitSuccess(null); }}
                      className={`w-full py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                        selectedAssignment?.id === a.id
                          ? 'bg-brand-600 text-white shadow-lg'
                          : (lockStatus.locked && !submission) ? 'bg-zinc-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed' : 'bg-zinc-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white'
                      }`}
                    >
                      {submission ? 'עדכן הגשה' : 'התחל הגשה'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Submission panel */}
            <div className="bg-white dark:bg-slate-850 rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-[600px] lg:sticky lg:top-12">
              {selectedAssignment ? (
                <>
                  <header className="p-6 sm:p-8 border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20" dir="rtl">
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{selectedAssignment.title}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">הגש את הקוד שלך למטה</p>
                  </header>

                  <div className="p-6 sm:p-8 space-y-4 sm:space-y-6 flex-grow flex flex-col">
                    <div className="bg-zinc-50 dark:bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-zinc-100 dark:border-slate-800" dir="rtl">
                      <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">תיאור המשימה</h4>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{selectedAssignment.question}</p>
                    </div>

                    {submitSuccess && (
                      <div className={`${submitSuccess.score === -1 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30'} border rounded-2xl p-4 space-y-2`} dir="rtl">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${submitSuccess.score === -1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {submitSuccess.score === -1 ? 'נשלח לסקירה' : 'הוגש בהצלחה!'}
                          </span>
                          {submitSuccess.score !== -1 && (
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{submitSuccess.score}%</span>
                          )}
                        </div>
                        <p className={`text-xs font-bold leading-relaxed ${submitSuccess.score === -1 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>"{submitSuccess.feedback}"</p>
                      </div>
                    )}

                    {submitError && (
                      <div className="flex items-center space-x-2 space-x-reverse text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 text-xs font-bold" dir="rtl">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="flex-grow flex flex-col space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400" dir="rtl">הפתרון שלך</label>
                      <textarea
                        value={studentCode}
                        onChange={e => { setStudentCode(e.target.value); setSubmitError(''); }}
                        className="flex-grow w-full p-4 sm:p-6 bg-zinc-50 dark:bg-slate-900/60 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-brand-500/10 font-mono text-xs dark:text-white resize-none min-h-[200px]"
                        placeholder="הדבק את הקוד שלך כאן..."
                      />
                    </div>

                    <button
                      disabled={!studentCode.trim() || submitting}
                      onClick={handleSubmit}
                      className="w-full py-4 sm:py-6 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3 space-x-reverse"
                    >
                      {submitting ? (
                        <>
                          <Spinner />
                          <span>AI מעריך...</span>
                        </>
                      ) : <span>הגש להערכה</span>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-6" dir="rtl">
                  <div className="w-16 sm:w-20 h-16 sm:h-20 bg-zinc-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300">
                    <svg className="w-8 sm:w-10 h-8 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">מוכן להגשה?</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">בחר משימה מהרשימה כדי להתחיל</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;
