
import React, { useState } from 'react';
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const course = await apiService.createCourse(name, desc);
      onCourseCreated(course);
      setName('');
      setDesc('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
      <div className="col-span-1 bg-white dark:bg-slate-900 p-8 rounded-3xl border shadow-sm h-fit">
        <h3 className="text-xl font-black uppercase tracking-tight mb-6">Create New Course</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold" placeholder="e.g. Intro to C" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold" placeholder="Optional description..." />
          </div>
          <button disabled={loading} className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-brand-500/20">
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      </div>

      <div className="col-span-2 space-y-4 overflow-y-auto custom-scrollbar pr-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Your Active Courses</h3>
        {courses.length > 0 ? courses.map(c => (
          <div key={c.id} className="p-6 bg-white dark:bg-slate-900 border rounded-3xl flex justify-between items-center group hover:border-brand-500 transition-all">
            <div>
              <h4 className="text-lg font-black">{c.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{c.description || 'No description provided.'}</p>
              <div className="mt-4 flex space-x-2">
                 <span className="text-[10px] font-black uppercase bg-brand-50 dark:bg-brand-900/40 text-brand-600 px-3 py-1 rounded-full">JOIN CODE: {c.code}</span>
              </div>
            </div>
            <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-brand-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
          </div>
        )) : <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No courses created yet.</div>}
      </div>
    </div>
  );
};

export default CourseManager;
