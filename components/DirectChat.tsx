
import React, { useState, useEffect, useRef } from 'react';
import { DirectMessage, User } from '../types';
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
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const msgs = await apiService.getMessages(targetUser.id);
      setMessages(msgs);
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
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
      if (editingMessage) {
        await apiService.editMessage(editingMessage.id, input.trim());
        setEditingMessage(null);
      } else {
        await apiService.sendMessage(targetUser.id, input.trim(), replyingTo?.id, replyingTo?.text);
        setReplyingTo(null);
      }
      setInput('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (msgId: string, forEveryone: boolean) => {
    try {
      await apiService.deleteMessage(msgId, forEveryone);
      fetchMessages();
      setActiveMenu(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenu(null);
  };

  const startEdit = (msg: DirectMessage) => {
    setEditingMessage(msg);
    setInput(msg.text);
    setActiveMenu(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-850 rounded-[2.5rem] border border-zinc-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-500">
      <header className="px-8 py-5 border-b dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {targetUser.picture ? (
              <img src={targetUser.picture} className="w-10 h-10 rounded-2xl border-2 border-white dark:border-slate-700 shadow-sm" alt="" />
            ) : (
              <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center font-black text-white text-sm">
                {targetUser.name.charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-850 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{targetUser.name}</span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Connection</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </header>

      <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar bg-zinc-50/10 dark:bg-slate-900/10">
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser.id;
          const isMenuOpen = activeMenu === m.id;
          
          return (
            <div key={m.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="relative group max-w-[80%]">
                {/* Reply Preview */}
                {m.replyText && (
                  <div className={`mb-1 p-2 rounded-lg text-[10px] border-l-4 bg-zinc-100 dark:bg-slate-800/50 italic opacity-70 ${isMe ? 'border-brand-400' : 'border-slate-400'}`}>
                    {m.replyText}
                  </div>
                )}
                
                <div className={`relative px-6 py-4 rounded-[2rem] text-xs font-bold leading-relaxed shadow-sm transition-all ${
                  isMe 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-zinc-100 dark:border-slate-700'
                }`}>
                  {m.text}
                  {m.isEdited && <span className="ml-2 text-[8px] opacity-40 italic">(edited)</span>}
                  
                  <div className={`text-[8px] mt-2 font-black opacity-50 flex items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Message Actions Menu Button */}
                  <button 
                    onClick={() => setActiveMenu(isMenuOpen ? null : m.id)}
                    className={`absolute top-2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-500 transition-all`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className={`absolute z-50 top-8 ${isMe ? 'left-0' : 'right-0'} w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-100`}>
                      <button onClick={() => { setReplyingTo(m); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-700 rounded-lg transition-colors">Reply</button>
                      <button onClick={() => handleCopy(m.text)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-700 rounded-lg transition-colors">Copy</button>
                      {isMe && <button onClick={() => startEdit(m)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-zinc-50 dark:hover:bg-slate-700 rounded-lg transition-colors">Edit</button>}
                      <button onClick={() => handleDelete(m.id, false)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors">Delete for me</button>
                      {isMe && <button onClick={() => handleDelete(m.id, true)} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors">Delete for everyone</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-white dark:bg-slate-850 border-t dark:border-slate-800">
        {/* Reply/Edit Indicator */}
        {(replyingTo || editingMessage) && (
          <div className="mb-4 p-4 bg-zinc-50 dark:bg-slate-900/40 rounded-2xl border-l-4 border-brand-500 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-brand-500 uppercase tracking-[0.2em] mb-1">
                {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderId === currentUser.id ? 'yourself' : targetUser.name}`}
              </span>
              <p className="text-[10px] font-bold text-slate-500 italic line-clamp-1">"{editingMessage?.text || replyingTo?.text}"</p>
            </div>
            <button onClick={() => { setReplyingTo(null); setEditingMessage(null); if(editingMessage) setInput(''); }} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-4 bg-zinc-50 dark:bg-slate-900/60 rounded-[2rem] px-6 py-2 border border-zinc-200 dark:border-slate-800 focus-within:border-brand-500/50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            className="flex-grow bg-transparent outline-none text-xs py-3 font-bold text-slate-700 dark:text-slate-200"
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || loading} 
            className={`p-3 rounded-full transition-all ${input.trim() ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:scale-110' : 'text-slate-300'}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectChat;
