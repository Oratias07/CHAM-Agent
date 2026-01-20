
import React, { useState, useEffect, useRef } from 'react';
import { DirectMessage, User, Student } from '../types';
import { apiService } from '../services/apiService';

interface DirectChatProps {
  currentUser: User;
  targetUser: { id: string, name: string, picture?: string };
  onClose?: () => void;
}

const DirectChat: React.FC<DirectChatProps> = ({ currentUser, targetUser, onClose }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const msgs = await apiService.getMessages(targetUser.id);
    setMessages(msgs);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [targetUser.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      await apiService.sendMessage(targetUser.id, input.trim());
      setInput('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-850 rounded-3xl border border-zinc-200 dark:border-slate-800 shadow-xl overflow-hidden">
      <header className="px-6 py-4 border-b dark:border-slate-800 bg-zinc-50 dark:bg-slate-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {targetUser.picture ? (
            <img src={targetUser.picture} className="w-8 h-8 rounded-full border dark:border-slate-700" alt="" />
          ) : (
            <div className="w-8 h-8 bg-brand-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-brand-600">
              {targetUser.name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{targetUser.name}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </header>

      <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-50/30 dark:bg-slate-900/30">
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-xs font-bold leading-relaxed shadow-sm ${
                isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-zinc-100 dark:border-slate-700'
              }`}>
                {m.text}
                <div className={`text-[8px] mt-1 opacity-60 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-850 border-t dark:border-slate-800">
        <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-slate-800/60 rounded-xl px-4 py-1.5 border border-zinc-200 dark:border-slate-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Write a message..."
            className="flex-grow bg-transparent outline-none text-xs py-2 font-bold text-slate-700 dark:text-slate-200"
          />
          <button onClick={handleSend} disabled={!input.trim() || loading} className="p-2 text-brand-600 hover:text-brand-500 disabled:opacity-30">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectChat;
