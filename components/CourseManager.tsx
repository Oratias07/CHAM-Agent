
import React, { useState, useEffect } from 'react';
import { Course, Material } from '../types';
import { apiService } from '../services/apiService';

const Icons = {
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Folder: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
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
    setLoading(true);
    await apiService.createCourse({ name, description: desc });
    setName(''); setDesc('');
    onCourseUpdate();
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    await apiService.updateCourse(editingCourse.id, { name, description: desc });
    setEditingCourse(null);
    onCourseUpdate();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete course?")) {
      await apiService.deleteCourse(id);
      onCourseUpdate();
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
    <div className="h-full space-y-10 overflow-y-auto custom-scrollbar pb-20">
      <section className="bg-white dark:bg-slate-850 p-8 rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">{editingCourse ? 'Update System' : 'Provision New Course'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Course Nomenclature" className="p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none outline-none font-bold text-sm" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief Description" className="p-4 rounded-xl bg-zinc-50 dark:bg-slate-800 border-none outline-none font-bold text-sm" />
        </div>
        <button 
          onClick={editingCourse ? handleUpdate : handleCreate} 
          disabled={loading}
          className="mt-4 px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
        >
          {loading ? 'Processing...' : (editingCourse ? 'Confirm Logic Update' : 'Initialize Stream')}
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-850 p-6 rounded-[2rem] border border-zinc-200 dark:border-slate-800 shadow-sm transition-all hover:border-brand-300">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID: {c.code}</span>
              <div className="flex space-x-2">
                <button onClick={() => { setEditingCourse(c); setName(c.name); setDesc(c.description || ''); }} className="p-2 text-slate-400 hover:text-brand-500"><Icons.Edit /></button>
                <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-500"><Icons.Trash /></button>
              </div>
            </div>
            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{c.name}</h4>
            <p className="text-xs text-slate-500 font-bold mt-1 line-clamp-2">{c.description}</p>
            <div className="mt-6 pt-6 border-t dark:border-slate-800 flex justify-between">
               <button onClick={() => onSelectCourse(c)} className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">Select</button>
               {editingCourse?.id === c.id && (
                 <button onClick={handleAddMaterial} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">+ Add Object</button>
               )}
            </div>
            {editingCourse?.id === c.id && (
              <div className="mt-4 space-y-2">
                {materials.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <span className="text-slate-400 shrink-0"><Icons.Folder /></span>
                      <span className="text-[10px] font-bold truncate">{m.title}</span>
                    </div>
                    <button onClick={() => toggleMaterialVisibility(m)} className={`p-1 rounded-md ${m.isVisible ? 'text-brand-500' : 'text-slate-400'}`}>
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
