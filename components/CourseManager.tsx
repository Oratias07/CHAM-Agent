
import React, { useState, useEffect, useRef } from 'react';
import { Course, Student, Material } from '../types';
import { apiService } from '../services/apiService';

interface CourseManagerProps {
  courses: Course[];
  onCourseCreated: (course: Course) => void;
  onCourseUpdated: (course: Course) => void;
  onCourseDeleted: (id: string) => void;
}

const CourseManager: React.FC<CourseManagerProps> = ({ courses, onCourseCreated, onCourseUpdated, onCourseDeleted }) => {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Create Course State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [schedule, setSchedule] = useState('');
  const [instructor, setInstructor] = useState('');
  
  // Material State
  const [matTitle, setMatTitle] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matFolder, setMatFolder] = useState('General');
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      const students = await apiService.getAllStudents();
      setAllStudents(students);
    } catch (e) { console.error(e); }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && activeCourse) {
        const updated = await apiService.updateCourse(activeCourse.id, { 
          name, description: desc, schedule, instructorName: instructor 
        });
        onCourseUpdated(updated);
        setActiveCourse(updated);
        setIsEditing(false);
      } else {
        const course = await apiService.createCourse(name, desc, schedule, instructor);
        onCourseCreated(course);
        setName(''); setDesc(''); setSchedule(''); setInstructor('');
      }
    } finally { setLoading(false); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure? This will delete all course data and materials.")) return;
    try {
      await apiService.deleteCourse(id);
      onCourseDeleted(id);
      if (activeCourse?.id === id) setActiveCourse(null);
    } catch (e) { alert("Delete failed"); }
  };

  const handleToggleStudent = async (studentId: string) => {
    if (!activeCourse) return;
    const isAssigned = activeCourse.assignedStudentIds.includes(studentId);
    const newIds = isAssigned 
      ? activeCourse.assignedStudentIds.filter(id => id !== studentId)
      : [...activeCourse.assignedStudentIds, studentId];
    
    try {
      const updated = await apiService.updateCourse(activeCourse.id, { assignedStudentIds: newIds });
      onCourseUpdated(updated);
      setActiveCourse(updated);
    } catch (e) { alert("Update failed"); }
  };

  const handleUploadMaterial = async () => {
    if (!activeCourse || !matTitle || !matContent) return;
    setLoading(true);
    try {
      const mat = await apiService.lecturerUploadMaterial(activeCourse.id, matTitle, matContent, matFolder);
      setMaterials([...materials, mat]);
      setMatTitle(''); setMatContent('');
    } finally { setLoading(false); }
  };

  const handleToggleMaterial = async (id: string, current: boolean) => {
    try {
      const updated = await apiService.updateMaterialVisibility(id, !current);
      setMaterials(materials.map(m => m.id === id ? updated : m));
    } catch (e) { alert("Toggle failed"); }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await apiService.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (e) { alert("Delete failed"); }
  };

  const groupedMaterials = materials.reduce((acc, m) => {
    const folder = m.folder || 'General';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(m);
    return acc;
  }, {} as Record<string, Material[]>);

  return (
    <div className="h-full flex space-x-8 overflow-hidden">
      {/* Sidebar: Course List */}
      <div className="w-80 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 pr-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Courses</h3>
          <button onClick={() => { setActiveCourse(null); setIsEditing(false); }} className="text-brand-500 font-bold text-xs uppercase hover:underline">+ New</button>
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar">
          {courses.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActiveCourse(c)}
              className={`w-full p-5 rounded-2xl text-left transition-all border ${activeCourse?.id === c.id ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-300'}`}
            >
              <p className="font-black text-sm mb-1 truncate">{c.name}</p>
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-bold uppercase tracking-tighter ${activeCourse?.id === c.id ? 'text-brand-100' : 'text-slate-400'}`}>Code: {c.code}</p>
                <p className={`text-[10px] font-bold uppercase tracking-tighter ${activeCourse?.id === c.id ? 'text-brand-100' : 'text-slate-400'}`}>{c.assignedStudentIds.length} Students</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel: Editor & Assignment */}
      <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar pr-4">
        {!activeCourse && !isEditing ? (
          <div className="max-w-xl">
            <h3 className="text-2xl font-black mb-8">Provision New Course</h3>
            <form onSubmit={handleCreateOrUpdate} className="space-y-6">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Course Name" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none focus:ring-2 focus:ring-brand-500" required />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none focus:ring-2 focus:ring-brand-500" rows={3} />
              <div className="grid grid-cols-2 gap-4">
                <input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Schedule (e.g. Mon 10:00)" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none focus:ring-2 focus:ring-brand-500" />
                <input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Instructor Name" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button disabled={loading} className="w-full py-4 bg-brand-600 text-white font-black rounded-xl uppercase tracking-widest hover:bg-brand-700 transition-all">Create Course</button>
            </form>
          </div>
        ) : activeCourse ? (
          <div className="space-y-12 pb-24">
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black tracking-tighter">{activeCourse.name}</h3>
                <p className="text-slate-500 font-medium mt-1">{activeCourse.description}</p>
                <div className="flex space-x-4 mt-4">
                   <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-black uppercase tracking-widest">Code: {activeCourse.code}</div>
                   {activeCourse.schedule && <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{activeCourse.schedule}</div>}
                </div>
              </div>
              <div className="flex space-x-3">
                 <button onClick={() => handleDeleteCourse(activeCourse.id)} className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
              </div>
            </header>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-12">
               {/* Access Control */}
               <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Student Access Control</h4>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Toggle assigned students</p>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {allStudents.map(s => {
                        const isAssigned = activeCourse.assignedStudentIds.includes(s.id);
                        return (
                          <button 
                            key={s.id} 
                            onClick={() => handleToggleStudent(s.id)}
                            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${isAssigned ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-transparent'} border`}
                          >
                            <div className="flex items-center space-x-3">
                              <img src={s.picture} className="w-8 h-8 rounded-lg" alt="Avatar" />
                              <p className="text-sm font-bold">{s.name}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${isAssigned ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600'}`}>
                              {isAssigned && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
               </div>

               {/* Content Management */}
               <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Upload Materials</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Title" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" />
                      <input value={matFolder} onChange={e => setMatFolder(e.target.value)} placeholder="Folder (Default: General)" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" />
                    </div>
                    <textarea value={matContent} onChange={e => setMatContent(e.target.value)} placeholder="Content" className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold" rows={4} />
                    <button onClick={handleUploadMaterial} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest hover:bg-black">Upload to {activeCourse.name}</button>
                  </div>
               </div>
            </section>

            {/* Folder View */}
            <section className="space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Course Repository</h4>
              <div className="space-y-8">
                {Object.keys(groupedMaterials).map(folder => (
                  <div key={folder} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                      <h5 className="font-black text-sm uppercase tracking-widest">{folder}</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedMaterials[folder].map(m => (
                        <div key={m.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between group shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-black truncate">{m.title}</p>
                            <div className="flex space-x-2">
                               <button onClick={() => handleToggleMaterial(m.id, m.isVisible)} className={`p-1.5 rounded-lg transition-all ${m.isVisible ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                  {m.isVisible ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                  )}
                               </button>
                               <button onClick={() => handleDeleteMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                               </button>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{m.isVisible ? 'Visible to Students' : 'Hidden'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CourseManager;
