import React, { useState, useEffect } from 'react';
import { Assignment, Course, Submission } from '../types';
import { apiService } from '../services/apiService';

interface AssignmentManagerProps {
  course: Course;
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const InlineError: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="flex items-center space-x-2 space-x-reverse text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-4 py-3 text-xs font-bold" dir="rtl">
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span>{msg}</span>
  </div>
);

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ course }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [expandedDeductions, setExpandedDeductions] = useState<Record<string, boolean>>({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAssignment, setManualAssignment] = useState<Assignment | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualLanguage, setManualLanguage] = useState('javascript');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualStage, setManualStage] = useState('');
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualError, setManualError] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '', question: '', masterSolution: '', rubric: '',
    customInstructions: '', maxScore: 100, openDate: '', dueDate: ''
  });

  useEffect(() => { fetchAssignments(); }, [course.id]);

  const fetchAssignments = async () => {
    try { setAssignments(await apiService.getLecturerAssignments(course.id)); }
    catch { /* silent */ }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) { setFormError('יש להזין כותרת למשימה.'); return; }
    if (!formData.rubric.trim()) { setFormError('יש להזין רובריקה להערכה.'); return; }
    if (!formData.openDate || !formData.dueDate) { setFormError('יש לבחור תאריכי פתיחה וסגירה.'); return; }
    setCreateLoading(true); setFormError('');
    try {
      await apiService.createAssignment({ ...formData, courseId: course.id, openDate: new Date(formData.openDate), dueDate: new Date(formData.dueDate) });
      setShowCreateModal(false);
      setFormData({ title: '', question: '', masterSolution: '', rubric: '', customInstructions: '', maxScore: 100, openDate: '', dueDate: '' });
      fetchAssignments();
    } catch (e: any) {
      setFormError(e.message || 'שגיאה ביצירת משימה.');
    } finally { setCreateLoading(false); }
  };

  const viewSubmissions = async (a: Assignment) => {
    setSelectedAssignment(a);
    setLoading(true);
    try { setSubmissions(await apiService.getAssignmentSubmissions(a.id)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק משימה זו? כל ההגשות יימחקו גם כן.')) return;
    try {
      await apiService.deleteAssignment(id);
      if (selectedAssignment?.id === id) { setSelectedAssignment(null); setSubmissions([]); }
      fetchAssignments();
    } catch { /* silent */ }
  };

  const handleGrantExtension = async (subId: string) => {
    const date = prompt('הזן תאריך הארכה (YYYY-MM-DD):');
    if (!date) return;
    try {
      await apiService.grantExtension(subId, new Date(date));
      if (selectedAssignment) viewSubmissions(selectedAssignment);
    } catch { alert('שגיאה בהארכת מועד.'); }
  };

  const openManualModal = async (a: Assignment) => {
    setManualAssignment(a);
    setShowManualModal(true);
    setManualCode('');
    setManualStudentId('');
    setManualLanguage('javascript');
    setManualResult(null);
    setManualError('');
    setManualStage('');
    try {
      const wl = await apiService.getWaitlist(a.courseId);
      setEnrolledStudents(wl.enrolled || []);
    } catch { setEnrolledStudents([]); }
  };

  const handleManualSubmit = async () => {
    if (!manualAssignment || !manualCode.trim() || !manualStudentId) return;
    setManualSubmitting(true);
    setManualError('');
    setManualResult(null);
    setManualStage('מנתח...');
    try {
      setTimeout(() => setManualStage('מעריך...'), 1500);
      const result = await apiService.submitManual(manualAssignment.id, manualStudentId, manualCode, manualLanguage);
      setManualStage('הושלם');
      setManualResult(result);
      if (selectedAssignment?.id === manualAssignment.id) viewSubmissions(manualAssignment);
    } catch (e: any) {
      setManualError(e.message || 'שגיאה בהגשה ידנית');
      setManualStage('');
    } finally {
      setManualSubmitting(false);
    }
  };

  const field = (label: string, el: React.ReactNode) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block" dir="rtl">{label}</label>
      {el}
    </div>
  );

  return (
    <div className="p-6 sm:p-10 space-y-8 overflow-y-auto custom-scrollbar h-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div dir="rtl">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">ניהול משימות</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">הגדרת הערכות וניהול הגשות</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setFormError(''); }}
          className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 text-xs"
          dir="rtl"
        >
          + משימה חדשה
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-slate-800 rounded-3xl">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-slate-500 font-black text-xs uppercase tracking-widest" dir="rtl">אין משימות בקורס זה</p>
              <p className="text-slate-400 text-xs mt-1" dir="rtl">לחץ על "משימה חדשה" ליצירה</p>
            </div>
          ) : assignments.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div dir="rtl">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{a.title}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {a.id.substring(0, 8)}</p>
                </div>
                <div className="text-right" dir="rtl">
                  <span className="text-[10px] font-black text-emerald-500 block">סגירה: {new Date(a.dueDate).toLocaleDateString('he-IL')}</span>
                  <span className="text-[10px] font-black text-slate-400 block mt-0.5">פתיחה: {new Date(a.openDate).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={() => viewSubmissions(a)}
                  className={`flex-grow py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${selectedAssignment?.id === a.id ? 'bg-brand-600 text-white' : 'bg-zinc-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white'}`}
                  dir="rtl"
                >
                  צפה בהגשות
                </button>
                <button
                  onClick={() => openManualModal(a)}
                  className="py-2.5 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all"
                  dir="rtl"
                >
                  הגשה ידנית
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Submissions Panel */}
        <div className="bg-white dark:bg-slate-850 rounded-3xl border border-zinc-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[400px]">
          <header className="p-6 border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100" dir="rtl">
              {selectedAssignment ? `הגשות: ${selectedAssignment.title}` : 'בחר משימה לצפייה בהגשות'}
            </h3>
          </header>
          <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="h-40 flex items-center justify-center space-x-3 text-slate-400">
                <Spinner /><span className="text-xs font-black uppercase tracking-widest" dir="rtl">טוען הגשות...</span>
              </div>
            ) : !selectedAssignment ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest" dir="rtl">בחר משימה מהרשימה</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center space-y-2">
                <div className="text-3xl">📭</div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest" dir="rtl">אין הגשות עדיין</p>
              </div>
            ) : submissions.map(s => (
              <div key={s.id} className="p-5 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border border-zinc-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-black text-[10px]">{s.studentName.charAt(0)}</div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">{s.studentName}</span>
                  </div>
                  <span className={`text-sm font-black ${s.score !== undefined && s.score >= 80 ? 'text-emerald-500' : s.score !== undefined && s.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {s.score !== undefined ? `${s.score}%` : '—'}
                  </span>
                </div>
                {s.feedback && (
                  <p className="text-[10px] text-slate-500 font-bold line-clamp-2 mb-3 italic leading-relaxed text-right" dir="rtl">"{s.feedback}"</p>
                )}
                {s.deductions && s.deductions.length > 0 && (
                  <div className="mb-3" dir="rtl">
                    <button
                      onClick={() => setExpandedDeductions(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="text-[9px] font-black text-amber-500 uppercase tracking-widest hover:underline mb-2 flex items-center gap-1"
                    >
                      ניכויים ({s.deductions.length})
                      <span className="text-[8px]">{expandedDeductions[s.id] ? '▲' : '▼'}</span>
                    </button>
                    {(expandedDeductions[s.id] ? s.deductions : s.deductions.slice(0, 2)).map((d, i) => (
                      <div key={i} className="text-[10px] py-1" style={{ borderRight: '3px solid #FF9800', paddingRight: '8px', marginBottom: '4px' }}>
                        <span className="text-amber-500 font-black">-{d.pointsLost}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">{d.requirement}</span>
                      </div>
                    ))}
                    {!expandedDeductions[s.id] && s.deductions.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold">...+{s.deductions.length - 2} עוד</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.timestamp).toLocaleString('he-IL')}</span>
                  <button onClick={() => handleGrantExtension(s.id)} className="text-[9px] font-black text-brand-600 uppercase tracking-widest hover:underline" dir="rtl">
                    הארך מועד
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-850 rounded-3xl shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]">
            <header className="p-6 sm:p-8 border-b dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-900/20">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white" dir="rtl">יצירת משימה חדשה</h2>
              <button onClick={() => { setShowCreateModal(false); setFormError(''); }} className="text-slate-400 hover:text-rose-500 transition-colors text-xs font-black uppercase tracking-widest">סגור</button>
            </header>
            <div className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field('כותרת *', <input value={formData.title} onChange={e => { setFormData({ ...formData, title: e.target.value }); setFormError(''); }} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors" placeholder="שם המשימה" dir="rtl" />)}
                {field('ציון מקסימלי', <input type="number" value={formData.maxScore} onChange={e => setFormData({ ...formData, maxScore: parseInt(e.target.value) })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors" />)}
                {field('תאריך פתיחה *', <input type="date" value={formData.openDate} onChange={e => setFormData({ ...formData, openDate: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors" />)}
                {field('תאריך סגירה *', <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors" />)}
              </div>
              {field('שאלה / הנחיות', <textarea rows={3} value={formData.question} onChange={e => setFormData({ ...formData, question: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white resize-none transition-colors" placeholder="תאר את המשימה..." dir="rtl" />)}
              {field('פתרון מאסטר', <textarea rows={4} value={formData.masterSolution} onChange={e => setFormData({ ...formData, masterSolution: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-mono text-xs dark:text-white resize-none transition-colors" placeholder="הדבק כאן את הפתרון האידיאלי..." />)}
              {field('רובריקה להערכה *', <textarea rows={4} value={formData.rubric} onChange={e => { setFormData({ ...formData, rubric: e.target.value }); setFormError(''); }} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white resize-none transition-colors" placeholder="הגדר קריטריוני ציון..." dir="rtl" />)}
              {field('הוראות מיוחדות ל-AI (אופציונלי)', <textarea rows={2} value={formData.customInstructions} onChange={e => setFormData({ ...formData, customInstructions: e.target.value })} className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white resize-none transition-colors" dir="rtl" />)}
              {formError && <InlineError msg={formError} />}
            </div>
            <footer className="p-6 sm:p-8 border-t dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20 flex justify-end space-x-3 space-x-reverse">
              <button onClick={() => { setShowCreateModal(false); setFormError(''); }} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors" dir="rtl">ביטול</button>
              <button onClick={handleCreate} disabled={createLoading} className="flex items-center space-x-2 px-8 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95">
                {createLoading ? <><Spinner /><span>יוצר...</span></> : <span dir="rtl">צור משימה</span>}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Manual Submission Modal */}
      {showManualModal && manualAssignment && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-850 rounded-3xl shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]">
            <header className="p-6 sm:p-8 border-b dark:border-slate-800 flex justify-between items-center bg-zinc-50/50 dark:bg-slate-900/20">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white" dir="rtl">הגשה ידנית: {manualAssignment.title}</h2>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors text-xs font-black uppercase tracking-widest">סגור</button>
            </header>
            <div className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field('סטודנט *',
                  <select
                    value={manualStudentId}
                    onChange={e => setManualStudentId(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors"
                    dir="rtl"
                  >
                    <option value="">בחר סטודנט</option>
                    {enrolledStudents.map((s: any) => (
                      <option key={s.googleId || s._id} value={s.googleId || s._id}>{s.name || s.email}</option>
                    ))}
                  </select>
                )}
                {field('שפת תכנות',
                  <select
                    value={manualLanguage}
                    onChange={e => setManualLanguage(e.target.value)}
                    className="w-full p-3 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm dark:text-white transition-colors"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                  </select>
                )}
              </div>
              {field('קוד *',
                <textarea
                  rows={12}
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-xl border border-transparent focus:border-brand-500 outline-none font-mono text-xs dark:text-white resize-none transition-colors"
                  placeholder="הדבק את קוד הסטודנט כאן..."
                  dir="ltr"
                />
              )}

              {/* Progress */}
              {manualSubmitting && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl">
                  <Spinner />
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest" dir="rtl">{manualStage}</span>
                </div>
              )}

              {/* Error */}
              {manualError && (
                <div className="space-y-3">
                  <InlineError msg={manualError} />
                  <button
                    onClick={handleManualSubmit}
                    className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline" dir="rtl"
                  >
                    נסה שוב
                  </button>
                </div>
              )}

              {/* Result */}
              {manualResult && (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-3" dir="rtl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">הערכה הושלמה</span>
                    <span className="text-2xl font-black text-emerald-600">{manualResult.score}%</span>
                  </div>
                  <div className={`text-xs font-black uppercase tracking-widest ${manualResult.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {manualResult.passed ? 'עבר' : 'לא עבר'}
                  </div>
                  {manualResult.feedback && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed line-clamp-4">"{manualResult.feedback}"</p>
                  )}
                  {manualResult.deductions?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {manualResult.deductions.slice(0, 3).map((d: any, i: number) => (
                        <div key={i} className="text-[10px] py-1" style={{ borderRight: '3px solid #FF9800', paddingRight: '8px' }}>
                          <span className="text-amber-500 font-black">-{d.pointsLost}</span>
                          <span className="text-slate-500 font-bold mr-2">{d.requirement}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <footer className="p-6 sm:p-8 border-t dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20 flex justify-end space-x-3 space-x-reverse">
              <button onClick={() => setShowManualModal(false)} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors" dir="rtl">סגור</button>
              <button
                onClick={handleManualSubmit}
                disabled={manualSubmitting || !manualCode.trim() || !manualStudentId}
                className="flex items-center space-x-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95"
              >
                {manualSubmitting ? <><Spinner /><span>מעריך...</span></> : <span dir="rtl">הגש והערך</span>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;
