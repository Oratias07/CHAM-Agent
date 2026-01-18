
import React from 'react';
import { UserRole } from '../types';

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="max-w-xl w-full">
        <div className="w-20 h-20 bg-brand-500 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl shadow-2xl shadow-brand-500/20">🚀</div>
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">Welcome to AI Grader</h1>
        <p className="text-slate-400 mb-12 text-lg">Choose your primary path to get started with the platform.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => onSelect('lecturer')}
            className="group p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] text-left hover:border-brand-500 transition-all transform hover:scale-[1.02]"
          >
            <span className="text-4xl mb-6 block">👨‍🏫</span>
            <h3 className="text-xl font-bold mb-2">Lecturer</h3>
            <p className="text-slate-500 text-sm">Create exercises, evaluate student code, and manage class gradebooks.</p>
          </button>

          <button 
            onClick={() => onSelect('student')}
            className="group p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] text-left hover:border-brand-500 transition-all transform hover:scale-[1.02]"
          >
            <span className="text-4xl mb-6 block">🧑‍🎓</span>
            <h3 className="text-xl font-bold mb-2">Student</h3>
            <p className="text-slate-500 text-sm">Access course materials, use the AI study notebook, and track your progress.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
