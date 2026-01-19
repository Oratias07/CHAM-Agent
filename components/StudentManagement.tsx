
import React, { useState } from 'react';
import { Student, Exercise, Material } from '../types';
import { apiService } from '../services/apiService';

interface StudentManagementProps {
  students: Student[];
  exercises: Exercise[];
  courseId: string;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ students, exercises, courseId }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!courseId || !newFileTitle || !newFileContent) return;
    setLoading(true);
    try {
      await apiService.lecturerUploadMaterial(courseId, newFileTitle, newFileContent);
      alert("Material uploaded to course workspace.");
      setNewFileTitle('');
      setNewFileContent('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex space-x-6 overflow-hidden">
      <div className="w-80 bg-white dark:bg-slate-900 border rounded-3xl flex flex-col">
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Course Roster</h3>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {students.map(s => (
            <button key={s.id} onClick={() => setSelectedStudent(s)} className={`w-full p-4 rounded-2xl text-left ${selectedStudent?.id === s.id ? 'bg-brand-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <p className="font-bold text-sm">{s.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow bg-white dark:bg-slate-900 border rounded-3xl overflow-hidden flex flex-col p-10">
        <h3 className="text-xl font-black uppercase mb-6">Course Material Management</h3>
        <div className="max-w-xl space-y-4">
          <input value={newFileTitle} onChange={e => setNewFileTitle(e.target.value)} placeholder="Material Title" className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold" />
          <textarea value={newFileContent} onChange={e => setNewFileContent(e.target.value)} rows={6} placeholder="Paste course content or instructions..." className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold" />
          <button onClick={handleUpload} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-brand-600 text-white font-black rounded-2xl uppercase tracking-widest">
            {loading ? 'Uploading...' : 'Upload to Course Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
