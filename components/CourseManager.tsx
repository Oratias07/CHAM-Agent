
import React, { useState, useEffect } from 'react';
import { Course, Material } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Folder: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Users: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

const CourseManager: React.FC<{ courses: Course[], onCourseUpdate: () => void, onSelectCourse: (c: Course) => void }> = ({ courses, onCourseUpdate, onSelectCourse }) => {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMaterialEditor, setShowMaterialEditor] = useState<Material | Partial<Material> | null>(null);

  useEffect(() => {
    // Fixed: replaced editingCourse._id with id
    if (editingCourse) apiService.getMaterials(editingCourse.id).then(setMaterials);
  }, [editingCourse]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try { await apiService.createCourse({ name, description: desc }); setName(''); setDesc(''); onCourseUpdate(); } catch (e:any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    setLoading(true);
    // Fixed: replaced editingCourse._id with id
    try { await apiService.updateCourse(editingCourse.id, { name, description: desc }); setEditingCourse(null); setName(''); setDesc(''); onCourseUpdate(); } catch (e:any) { alert(e.message); } finally { setLoading(false); }
  };

  const saveMaterial = async () => {
    if (!showMaterialEditor || !editingCourse) return;
    const m = showMaterialEditor as any;
    // Fixed: replaced m._id with id
    if (m.id) await apiService.updateMaterial(m.id, m);
    // Fixed: replaced editingCourse._id with id
    else await apiService.addMaterial({ ...m, courseId: editingCourse.id });
    setShowMaterialEditor(null);
    apiService.getMaterials(editingCourse.id).then(setMaterials);
  };

  const deleteMaterial = async (id: string) => {
    if (confirm("Purge object from vault?") && editingCourse) {
      await apiService.deleteMaterial(id);
      // Fixed: replaced editingCourse._id with id
      apiService.getMaterials(editingCourse.id).then(setMaterials);
    }
  };

  return (
    <div className="h-full space-y-12 overflow-y-auto custom-scrollbar pb-32">
      {showMaterialEditor && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 transition-colors">
           <div className="w-full max-w-2xl bg-white dark:bg-slate-850 rounded-[2.5rem] p-10 border border-zinc-200 dark:border-slate-800 shadow-2xl transition-colors">
              <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter text-slate-800 dark:text-slate-100">Knowledge Object Editor</h3>
              <div className="space-y-6">
                <input value={(showMaterialEditor as any).title || ''} onChange={e => setShowMaterialEditor({...showMaterialEditor, title: e.target.value})} placeholder="Object Title" className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-white" />
                <textarea value={(showMaterialEditor as any).content || ''} onChange={e => setShowMaterialEditor({...showMaterialEditor, content: e.target.value})} placeholder="Paste source content for RAG reasoning..." rows={8} className="w-full p-4 bg-zinc-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-white resize-none" />
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button onClick={() => setShowMaterialEditor(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 px-6 py-3">Discard</button>
                <button onClick={saveMaterial} className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:scale-105 transition-all">Save Object</button>
              </div>
           </div>
        </div>
      )}

      <section className="bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-xl relative overflow-hidden transition-colors">
        <div className="relative z-10"><header className="flex items-center space-x-4 mb-10"><div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white"><Icons.Settings /></div><div><h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100">{editingCourse ? 'Node Configuration' : 'Deploy New Node'}</h3></div></header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Workspace Label" className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-800 dark:text-white" />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Node Logic Context..." rows={3} className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border-none outline-none font-bold resize-none text-slate-800 dark:text-white" />
            </div>
            <div className="bg-zinc-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-zinc-100 dark:border-slate-800"><button onClick={editingCourse ? handleUpdate : handleCreate} className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl">{loading ? 'Working...' : 'Commit Workspace'}</button>{editingCourse && <button onClick={() => { setEditingCourse(null); setName(''); setDesc(''); }} className="w-full text-[10px] font-black text-slate-500 uppercase mt-4">Cancel</button>}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {courses.map(c => (
          // Fixed: replaced c._id with id
          <div key={c.id} className="group bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-2xl hover:border-brand-500/50">
            <div className="flex justify-between items-start mb-6"><span className="px-3 py-1 bg-zinc-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-brand-600 dark:text-brand-400">{c.code}</span>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingCourse(c); setName(c.name); setDesc(c.description || ''); window.scrollTo(0,0); }} className="p-2 text-slate-400 hover:text-brand-500"><Icons.Edit /></button></div>
            </div>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{c.name}</h4>
            <div className="mt-8 flex items-center justify-between pt-6 border-t dark:border-slate-800">
               <button onClick={() => onSelectCourse(c)} className="px-6 py-2.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-500/10">Enter Workspace</button>
               {/* Fixed: replaced editingCourse?._id with editingCourse?.id and c._id with c.id */}
               {editingCourse?.id === c.id && <button onClick={() => setShowMaterialEditor({ isVisible: true, type: 'lecturer_shared' })} className="text-[10px] font-black text-emerald-600 uppercase">+ Add Material</button>}
            </div>

            {/* Fixed: replaced editingCourse?._id with editingCourse?.id and c._id with c.id */}
            {editingCourse?.id === c.id && (
              <div className="mt-6 space-y-3">
                {materials.map(m => (
                  // Fixed: replaced m._id with id
                  <div key={m.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-slate-900 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-slate-700 transition-all">
                    <div className="flex flex-col space-y-1">
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">{m.title}</span>
                      <div className="flex items-center space-x-2 text-[8px] font-black text-slate-400 uppercase">
                        <Icons.Users /> <span>{m.viewedBy?.length || 0} Learners saw this</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                       <button onClick={() => setShowMaterialEditor(m)} className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"><Icons.Edit /></button>
                       {/* Fixed: replaced m._id with id */}
                       <button onClick={() => deleteMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default CourseManager;
