
import React, { useState, useEffect } from 'react';
import { Course, Material } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Users: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
  Spinner: () => <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>,
};

const InlineError: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="flex items-center space-x-2 text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-4 py-3 text-xs font-bold" dir="rtl">
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span>{msg}</span>
  </div>
);

const CourseManager: React.FC<{ courses: Course[], onCourseUpdate: () => void, onSelectCourse: (c: Course) => void }> = ({ courses, onCourseUpdate, onSelectCourse }) => {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMaterialEditor, setShowMaterialEditor] = useState<Material | Partial<Material> | null>(null);
  const [matError, setMatError] = useState('');
  const [matLoading, setMatLoading] = useState(false);

  useEffect(() => {
    if (editingCourse) apiService.getMaterials(editingCourse.id).then(setMaterials);
  }, [editingCourse]);

  const handleCreate = async () => {
    if (!name.trim()) { setError('יש להזין שם קורס.'); return; }
    setLoading(true); setError('');
    try {
      await apiService.createCourse({ name, description: desc });
      setName(''); setDesc('');
      onCourseUpdate();
    } catch (e: any) {
      setError(e.message || 'שגיאה ביצירת קורס.');
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    if (!name.trim()) { setError('יש להזין שם קורס.'); return; }
    setLoading(true); setError('');
    try {
      await apiService.updateCourse(editingCourse.id, { name, description: desc });
      setEditingCourse(null); setName(''); setDesc('');
      onCourseUpdate();
    } catch (e: any) {
      setError(e.message || 'שגיאה בעדכון קורס.');
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCourse) return;
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await apiService.addMaterial({ courseId: editingCourse.id, title: file.name, content, fileName: file.name, fileType: file.type, fileSize: file.size, isVisible: true });
        const list = await apiService.getMaterials(editingCourse.id);
        setMaterials(list);
      } catch { setError('שגיאה בהעלאת קובץ.'); }
      finally { setUploadLoading(false); e.target.value = ''; }
    };
    reader.readAsText(file);
  };

  const saveMaterial = async () => {
    if (!showMaterialEditor || !editingCourse) return;
    const m = showMaterialEditor as any;
    if (!m.title?.trim()) { setMatError('יש להזין כותרת לחומר.'); return; }
    setMatLoading(true); setMatError('');
    try {
      if (m.id) await apiService.updateMaterial(m.id, m);
      else await apiService.addMaterial({ ...m, courseId: editingCourse.id });
      setShowMaterialEditor(null);
      apiService.getMaterials(editingCourse.id).then(setMaterials);
    } catch { setMatError('שגיאה בשמירת החומר.'); }
    finally { setMatLoading(false); }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('למחוק חומר זה?') || !editingCourse) return;
    try {
      await apiService.deleteMaterial(id);
      apiService.getMaterials(editingCourse.id).then(setMaterials);
    } catch { setError('שגיאה במחיקת חומר.'); }
  };

  return (
    <div className="h-full space-y-8 overflow-y-auto custom-scrollbar pb-32">
      {/* Material Editor Modal */}
      {showMaterialEditor && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-850 rounded-3xl p-8 border border-zinc-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-xl font-black mb-6 uppercase tracking-tighter text-slate-800 dark:text-slate-100" dir="rtl">עריכת חומר לימוד</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2" dir="rtl">כותרת</label>
                <input
                  value={(showMaterialEditor as any).title || ''}
                  onChange={e => setShowMaterialEditor({ ...showMaterialEditor, title: e.target.value })}
                  placeholder="שם החומר"
                  className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-white border border-transparent focus:border-brand-500 transition-colors"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2" dir="rtl">תוכן (לשימוש ה-RAG)</label>
                <textarea
                  value={(showMaterialEditor as any).content || ''}
                  onChange={e => setShowMaterialEditor({ ...showMaterialEditor, content: e.target.value })}
                  placeholder="הדבק כאן את תוכן החומר..."
                  rows={8}
                  className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-white resize-none border border-transparent focus:border-brand-500 transition-colors"
                  dir="rtl"
                />
              </div>
              {matError && <InlineError msg={matError} />}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowMaterialEditor(null); setMatError(''); }} className="px-6 py-3 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-colors">ביטול</button>
              <button onClick={saveMaterial} disabled={matLoading} className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all">
                {matLoading ? <><Icons.Spinner /><span>שומר...</span></> : <span>שמור חומר</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form */}
      <section className="bg-white dark:bg-slate-850 p-8 sm:p-10 rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100 mb-8" dir="rtl">
          {editingCourse ? 'עריכת קורס' : 'יצירת קורס חדש'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2" dir="rtl">שם הקורס *</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                placeholder="למשל: מבני נתונים 101"
                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border border-transparent focus:border-brand-500 outline-none font-bold text-slate-800 dark:text-white transition-colors"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2" dir="rtl">תיאור</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="תיאור הקורס..."
                rows={3}
                className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border border-transparent focus:border-brand-500 outline-none font-bold resize-none text-slate-800 dark:text-white transition-colors"
                dir="rtl"
              />
            </div>
            {error && <InlineError msg={error} />}
          </div>
          <div className="flex flex-col justify-end space-y-3">
            <button
              onClick={editingCourse ? handleUpdate : handleCreate}
              disabled={loading}
              className="flex items-center justify-center space-x-2 w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
            >
              {loading ? <><Icons.Spinner /><span>שומר...</span></> : <span>{editingCourse ? 'עדכן קורס' : 'צור קורס'}</span>}
            </button>
            {editingCourse && (
              <button onClick={() => { setEditingCourse(null); setName(''); setDesc(''); setError(''); }} className="w-full py-3 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-colors">
                ביטול עריכה
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Course Cards */}
      {courses.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-slate-800 rounded-3xl">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-slate-500 font-black text-sm uppercase tracking-widest" dir="rtl">אין קורסים עדיין</p>
          <p className="text-slate-400 text-xs font-medium mt-2" dir="rtl">צור את הקורס הראשון שלך למעלה</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map(c => (
            <div key={c.id} className="group bg-white dark:bg-slate-850 p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-brand-50 dark:bg-brand-950/40 rounded-lg text-[10px] font-black text-brand-600 dark:text-brand-400 tracking-widest">{c.code}</span>
                <button
                  onClick={() => { setEditingCourse(c); setName(c.name); setDesc(c.description || ''); window.scrollTo(0, 0); }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-brand-500 transition-all rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30"
                >
                  <Icons.Edit />
                </button>
              </div>
              <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2" dir="rtl">{c.name}</h4>
              {c.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 font-medium" dir="rtl">{c.description}</p>}

              <div className="mt-6 pt-5 border-t dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <button onClick={() => onSelectCourse(c)} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-brand-500/10">
                  כניסה לקורס
                </button>
                {editingCourse?.id === c.id && (
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setShowMaterialEditor({ isVisible: true, type: 'lecturer_shared' })} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                      + הוסף חומר
                    </button>
                    <label className={`flex items-center space-x-1 text-[10px] font-black text-brand-600 uppercase tracking-widest cursor-pointer hover:underline ${uploadLoading ? 'opacity-50 cursor-wait' : ''}`}>
                      <Icons.Plus />
                      <span>{uploadLoading ? 'מעלה...' : 'העלה קובץ'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />
                    </label>
                  </div>
                )}
              </div>

              {/* Materials list */}
              {editingCourse?.id === c.id && (
                <div className="mt-5 space-y-2">
                  {materials.length === 0 && (
                    <p className="text-xs text-slate-400 font-medium text-center py-4" dir="rtl">אין חומרי לימוד בקורס זה עדיין</p>
                  )}
                  {materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-slate-900 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-slate-700 transition-all">
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200" dir="rtl">{m.title}</span>
                        <div className="flex items-center space-x-1 space-x-reverse text-[9px] font-bold text-slate-400 mt-0.5" dir="rtl">
                          <Icons.Users />
                          <span>{m.viewedBy?.length || 0} סטודנטים צפו</span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => setShowMaterialEditor(m)} className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg transition-colors"><Icons.Edit /></button>
                        <button onClick={() => deleteMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><Icons.Trash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default CourseManager;
