
import React from 'react';
import { UserRole } from '../types';

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="z-10 w-full max-w-lg text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl mx-auto mb-8 flex items-center justify-center font-black text-2xl shadow-2xl shadow-brand-500/30">
          ST
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3 uppercase tracking-tighter" dir="rtl">ברוך הבא למערכת</h1>
        <p className="text-slate-400 mb-10 text-sm font-medium" dir="rtl">בחר את תפקידך להמשיך לפלטפורמה</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('lecturer')}
            className="group p-8 bg-slate-900 border border-slate-800 hover:border-brand-500/60 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-500/10 active:scale-[0.98]"
            dir="rtl"
          >
            <div className="text-4xl mb-5 block transition-transform group-hover:scale-110">👨‍🏫</div>
            <h3 className="text-lg font-black mb-2 uppercase tracking-tight">מרצה</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">ניהול קורסים, הערכת קוד בינה מלאכותית, וניהול ציונים</p>
            <div className="mt-6 flex items-center space-x-2 space-x-reverse">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">גישה מלאה</span>
            </div>
          </button>

          <button
            onClick={() => onSelect('student')}
            className="group p-8 bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 active:scale-[0.98]"
            dir="rtl"
          >
            <div className="text-4xl mb-5 block transition-transform group-hover:scale-110">🧑‍🎓</div>
            <h3 className="text-lg font-black mb-2 uppercase tracking-tight">סטודנט</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">גישה לחומרי לימוד, הגשת משימות ומעקב אחר הישגים</p>
            <div className="mt-6 flex items-center space-x-2 space-x-reverse">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">פורטל סטודנט</span>
            </div>
          </button>
        </div>

        <p className="mt-10 text-slate-700 text-[9px] font-black uppercase tracking-widest" dir="rtl">בחירה זו קבועה לחשבון שלך</p>
      </div>
    </div>
  );
};

export default RoleSelector;
