
import React, { useState, useEffect } from 'react';
import { Course, Material } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Folder: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

const CourseManager: React.FC<{ courses: Course[], onCourseUpdate: () => void, onSelectCourse: (c: Course) => void }> = ({ courses, onCourseUpdate, onSelectCourse }) => {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCourse) {
      apiService.getMaterials(editingCourse.id).then(setMaterials);
    }
  }, [editingCourse]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiService.createCourse({ name, description: desc });
      setName(''); setDesc('');
      onCourseUpdate();
    } catch (e) {
      alert("Error creating course: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    setLoading(true);
    try {
      await apiService.updateCourse(editingCourse.id, { name, description: desc });
      setEditingCourse(null);
      setName(''); setDesc('');
      onCourseUpdate();
    } catch (e) {
      alert("Error updating course: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this course and all associated student data? This action cannot be undone.")) {
      try {
        await apiService.deleteCourse(id);
        onCourseUpdate();
      } catch (e) {
        alert("Delete failed: " + e.message);
      }
    }
  };

  const handleAddMaterial = async () => {
    if (!editingCourse) return;
    const title = prompt("Material Title:");
    const folder = prompt("Folder Name (or leave blank for General):") || 'General';
    const content = prompt("Paste Content Payload:");
    if (title && content) {
      await apiService.addMaterial({ courseId: editingCourse.id, title, folder, content, isVisible: true, type: 'lecturer_shared' });
      apiService.getMaterials(editingCourse.id).then(setMaterials);
    }
  };

  const toggleMaterialVisibility = async (m: Material) => {
    await apiService.updateMaterial(m.id, { isVisible: !m.isVisible });
    apiService.getMaterials(m.courseId).then(setMaterials);
  };

  return (
    <div className="h-full space-y-12 overflow-y-auto custom-scrollbar pb-32">
      {/* SaaS Style Course Creator */}
      <section className="bg-white dark:bg-slate-850 p-10 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <header className="flex items-center space-x-4 mb-10">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
              <Icons.Settings />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
                {editingCourse ? 'System Configuration' : 'Create New Course'}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure your academic environment settings</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Introduction to C-Programming..." 
                  className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Description</label>
                <textarea 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  placeholder="Advanced memory management and logic flow..." 
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all resize-none" 
                />
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-zinc-100 dark:border-slate-800 space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Summary</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Node Type</span>
                  <span className="text-brand-500">Academic Environment</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Encryption</span>
                  <span className="text-emerald-500">AES-256 Standard</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Auto-ID</span>
                  <span className="text-brand-500 uppercase">Enabled</span>
                </div>
              </div>
              <div className="pt-4 border-t dark:border-slate-800 flex flex-col space-y-3">
                <button 
                  onClick={editingCourse ? handleUpdate : handleCreate} 
                  disabled={loading || !name.trim()}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-brand-600/20 active:scale-[0.98]"
                >
                  {loading ? 'Initializing Stream...' : (editingCourse ? 'Commit Logic Updates' : 'Deploy Course Infrastructure')}
                </button>
                {editingCourse && (
                  <button onClick={() => { setEditingCourse(null); setName(''); setDesc(''); }} className="text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest text-center mt-2">
                    Cancel Reconfiguration
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">Deployed Nodes</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Active Courses: {courses.length}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(c => (
          <div key={c.id} className="group bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-2xl hover:border-brand-500/50 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6">
              <div className="px-3 py-1 bg-zinc-100 dark:bg-slate-800 rounded-lg">
                <span className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest">{c.code}</span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingCourse(c); setName(c.name); setDesc(c.description || ''); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-400 hover:text-brand-500 hover:bg-zinc-100 dark:hover:bg-slate-800 rounded-xl transition-all"><Icons.Edit /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"><Icons.Trash /></button>
              </div>
            </div>
            
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">{c.name}</h4>
            <p className="text-xs text-slate-500 font-bold mt-2 line-clamp-2 h-8">{c.description}</p>
            
            <div className="mt-8 pt-6 border-t dark:border-slate-800 flex items-center justify-between">
               <button 
                 onClick={() => onSelectCourse(c)} 
                 className="px-6 py-2.5 bg-brand-50 dark:bg-slate-800 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
               >
                 Launch Workspace
               </button>
               {editingCourse?.id === c.id && (
                 <button onClick={handleAddMaterial} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">+ New Object</button>
               )}
            </div>

            {editingCourse?.id === c.id && (
              <div className="mt-6 space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Stored Objects</div>
                {materials.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-slate-900 rounded-2xl border border-transparent hover:border-zinc-200 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span className="text-slate-400 shrink-0"><Icons.Folder /></span>
                      <span className="text-[10px] font-bold truncate text-slate-700 dark:text-slate-300">{m.title}</span>
                    </div>
                    <button onClick={() => toggleMaterialVisibility(m)} className={`p-1.5 rounded-lg transition-colors ${m.isVisible ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'text-slate-400 hover:text-slate-600'}`}>
                       {m.isVisible ? <Icons.Eye /> : <Icons.EyeOff />}
                    </button>
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
