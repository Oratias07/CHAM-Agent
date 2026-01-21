
import React from 'react';
import { Archive } from '../types';

interface ArchiveViewerProps {
  archives: Archive[];
}

const ArchiveViewer: React.FC<ArchiveViewerProps> = ({ archives }) => {
  return (
    <div className="h-full space-y-8 overflow-y-auto custom-scrollbar pb-20">
      <header>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Archived Logic Sessions</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Snapshot History & Performance Metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {archives.map(archive => (
          <div key={archive.id} className="bg-white dark:bg-slate-850 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 rounded-lg">
                {new Date(archive.timestamp).toLocaleDateString()}
              </span>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Mean</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{(archive.stats?.avgScore || 0).toFixed(1)}</p>
              </div>
            </div>

            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">{archive.sessionName}</h4>
            
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t dark:border-slate-800">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Excellent</p>
                <p className="text-emerald-500 font-black">{archive.stats?.distribution?.high || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Passed</p>
                <p className="text-brand-500 font-black">{archive.stats?.distribution?.mid || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical</p>
                <p className="text-rose-500 font-black">{archive.stats?.distribution?.low || 0}</p>
              </div>
            </div>

            <button className="w-full mt-8 py-3 bg-zinc-50 dark:bg-slate-800 hover:bg-brand-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
              Restore Logic Snapshot
            </button>
          </div>
        ))}

        {archives.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed dark:border-slate-800 rounded-[3rem]">
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No archives persisted in cloud storage</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveViewer;
