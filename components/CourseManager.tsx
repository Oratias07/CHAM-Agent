
import React, { useState, useEffect, useRef } from 'react';
import { Course, Student, Material } from '../types';
import { apiService } from '../services/apiService';

interface CourseManagerProps {
  courses: Course[];
  onCourseCreated: (course: Course) => void;
  onCourseUpdated: (course: Course) => void;
  onCourseDeleted: (id: string) => void;
}

const Icons = {
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Folder: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>,
  Check: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
};

const CourseManager: React.FC<CourseManagerProps> = ({ courses, onCourseCreated, onCourseUpdated, onCourseDeleted }) => {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [schedule, setSchedule] = useState('');
  const [instructor, setInstructor] = useState('');
  
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
      <div className="w-80 flex flex-col shrink-0 border-r border-zinc-200 dark:border-slate-800 pr-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Courses</h3>
          <button onClick={() => { setActiveCourse(null); setIsEditing(false); }} className="text-brand-600 font-black text-[10px] uppercase tracking-widest hover:underline">+ Create New</button>
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar">
          {courses.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActiveCourse(c)}
              className={`w-full p-5 rounded-2xl text-left transition-all border ${activeCourse?.id === c.id ? 'bg-brand-600 text-white border-brand-500 shadow-lg' : 'bg-white dark:bg-slate-850 border-zinc-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-300'}`}
            >
              <p className="font-black text-sm mb-1 truncate">{c.name}</p>
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-bold uppercase tracking-tighter ${activeCourse?.id === c.id ? 'text-brand-100' : 'text-slate-400'}`}>Code: {c.code}</p>
                <p className={`text-[10px] font-bold uppercase tracking-tighter ${activeCourse?.id === c.id ? 'text-brand-100' : 'text-slate-400'}`}>{c.assignedStudentIds.length} Assigned</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar pr-4">
        {!activeCourse && !isEditing ? (
          <div className="max-w-xl">
            <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Provision New Course</h3>
            <form onSubmit={handleCreateOrUpdate} className="space-y-5">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Course Name" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold outline-none focus:ring-1 focus:ring-brand-500" required />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold outline-none focus:ring-1 focus:ring-brand-500" rows={3} />
              <div className="grid grid-cols-2 gap-4">
                <input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Schedule" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold outline-none focus:ring-1 focus:ring-brand-500" />
                <input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Instructor" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <button disabled={loading} className="w-full py-4 bg-brand-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-brand-700 shadow-lg transition-all">Create Course Engine</button>
            </form>
          </div>
        ) : activeCourse ? (
          <div className="space-y-12 pb-24">
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase">{activeCourse.name}</h3>
                <p className="text-slate-500 font-bold mt-1 text-sm">{activeCourse.description}</p>
                <div className="flex space-x-3 mt-5">
                   <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[9px] font-black uppercase tracking-widest">Code: {activeCourse.code}</div>
                   {activeCourse.schedule && <div className="bg-zinc-100 dark:bg-slate-800 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{activeCourse.schedule}</div>}
                </div>
              </div>
              <button onClick={() => handleDeleteCourse(activeCourse.id)} className="p-3 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-850 rounded-xl border border-zinc-200 dark:border-slate-800 shadow-sm transition-all">
                <Icons.Trash />
              </button>
            </header>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-12">
               <div className="space-y-5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Whitelist</h4>
                  <div className="bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col h-[400px] shadow-sm">
                    <div className="p-4 bg-zinc-50 dark:bg-slate-800/60 border-b dark:border-slate-800">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select assigned students</p>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {allStudents.map(s => {
                        const isAssigned = activeCourse.assignedStudentIds.includes(s.id);
                        return (
                          <button 
                            key={s.id} 
                            onClick={() => handleToggleStudent(s.id)}
                            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border ${isAssigned ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500/20' : 'bg-zinc-50 dark:bg-slate-800/40 border-transparent'}`}
                          >
                            <div className="flex items-center space-x-3">
                              <img src={s.picture || `https://ui-avatars.com/api/?name=${s.name}`} className="w-8 h-8 rounded-lg" alt="Avatar" />
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.name}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${isAssigned ? 'bg-brand-600 border-brand-600 text-white' : 'border-zinc-300 dark:border-slate-600'}`}>
                              {isAssigned && <Icons.Check />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
               </div>

               <div className="space-y-5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Sync</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Material Title" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold text-xs" />
                      <input value={matFolder} onChange={e => setMatFolder(e.target.value)} placeholder="Folder" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold text-xs" />
                    </div>
                    <textarea value={matContent} onChange={e => setMatContent(e.target.value)} placeholder="Content Payload" className="w-full p-4 rounded-xl bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 font-bold text-xs" rows={4} />
                    <button onClick={handleUploadMaterial} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg">Upload Material</button>
                  </div>
               </div>
            </section>

            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Repository</h4>
              <div className="space-y-8">
                {Object.keys(groupedMaterials).map(folder => (
                  <div key={folder} className="space-y-4">
                    <div className="flex items-center space-x-3 px-2">
                      <span className="text-brand-500"><Icons.Folder /></span>
                      <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-300">{folder}</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedMaterials[folder].map(m => (
                        <div key={m.id} className="p-5 bg-white dark:bg-slate-850 border border-zinc-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between group shadow-sm transition-all hover:border-brand-500">
                          <div className="flex justify-between items-start mb-6">
                            <p className="text-xs font-black truncate text-slate-800 dark:text-slate-100 pr-4">{m.title}</p>
                            <div className="flex space-x-1">
                               <button onClick={() => handleToggleMaterial(m.id, m.isVisible)} className={`p-1.5 rounded-lg transition-all ${m.isVisible ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'text-slate-400 bg-zinc-50 dark:bg-slate-800'}`}>
                                  {m.isVisible ? <Icons.Eye /> : <Icons.EyeOff />}
                               </button>
                               <button onClick={() => handleDeleteMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                               </button>
                            </div>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md inline-block ${m.isVisible ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'bg-zinc-100 dark:bg-slate-800 text-slate-400'}`}>
                            {m.isVisible ? 'Public Access' : 'Internal Only'}
                          </span>
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
