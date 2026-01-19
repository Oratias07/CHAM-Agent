
import React, { useState, useRef } from 'react';
import { Course } from '../types';
import { apiService } from '../services/apiService';

interface CourseManagerProps {
  courses: Course[];
  onCourseCreated: (course: Course) => void;
}

const CourseManager: React.FC<CourseManagerProps> = ({ courses, onCourseCreated }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const course = await apiService.createCourse(name, desc);
      
      // If a file was attached, upload it to the course
      if (uploadedFile) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const content = ev.target?.result as string;
          await apiService.lecturerUploadMaterial(course.id, `Syllabus: ${uploadedFile.name}`, content);
        };
        reader.readAsText(uploadedFile);
      }
      
      onCourseCreated(course);
      setName('');
      setDesc('');
      setUploadedFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
      <div className="col-span-1 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
        <h3 className="text-xl font-bold tracking-tight mb-8 text-slate-900 dark:text-white uppercase">Create New Course</h3>
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Course Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="e.g. Data Structures & Algorithms" required />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all" rows={3} placeholder="Course summary..." />
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Initial Materials (Optional)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-500 transition-all bg-slate-50 dark:bg-slate-800/50"
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
              {uploadedFile ? (
                <div className="text-brand-600 dark:text-brand-400 font-bold text-sm">✓ {uploadedFile.name}</div>
              ) : (
                <div className="text-slate-400 text-xs font-medium">Click to attach Syllabus or Notes (.txt, .c, .md)</div>
              )}
            </div>
          </div>

          <button disabled={loading} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl uppercase tracking-widest shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all transform active:scale-[0.98]">
            {loading ? 'Processing...' : 'Provision Course'}
          </button>
        </form>
      </div>

      <div className="col-span-2 space-y-4 overflow-y-auto custom-scrollbar pr-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-6">Active Registry</h3>
        {courses.length > 0 ? courses.map(c => (
          <div key={c.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center group hover:border-brand-500 transition-all shadow-sm">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{c.name}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">{c.description || 'Enterprise educational container.'}</p>
              <div className="mt-4 flex space-x-2">
                 <span className="text-[10px] font-bold uppercase bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-4 py-1.5 rounded-lg border border-brand-100 dark:border-brand-900/50">JOIN CODE: <span className="font-black text-brand-600 dark:text-brand-400 ml-2">{c.code}</span></span>
              </div>
            </div>
            <div className="flex space-x-2">
               <button className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-600 border border-slate-200 dark:border-slate-700 transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
               </button>
            </div>
          </div>
        )) : <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest border-2 border-dashed rounded-3xl">Registry Empty</div>}
      </div>
    </div>
  );
};

export default CourseManager;
