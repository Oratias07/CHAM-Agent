
import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  darkMode?: boolean;
  context?: {
    question?: string;
    masterSolution?: string;
    rubric?: string;
    studentCode?: string;
  };
}

const Icons = {
  Open: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Close: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
  Send: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
};

const ChatBot: React.FC<ChatBotProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Assistant Engine initialized. Grounding established with current active task. How can I facilitate your evaluation process?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(userMessage, context);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error encountered during context search. Please re-execute.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 ${
          isOpen ? 'bg-slate-800 dark:bg-slate-700' : 'bg-brand-600 hover:bg-brand-500'
        } text-white`}
      >
        {isOpen ? <Icons.Close /> : <Icons.Open />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-white dark:bg-slate-850 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col border border-zinc-200 dark:border-slate-800 overflow-hidden transition-all">
          <div className="bg-slate-900 p-6 border-b border-white/5">
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Grading Assistant</h3>
            <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">Grounding: Active Session</p>
          </div>

          <div className="flex-grow overflow-y-auto p-5 bg-zinc-50 dark:bg-slate-900/40 custom-scrollbar space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-xs font-bold leading-relaxed ${
                  msg.role === 'user' ? 'bg-slate-800 dark:bg-brand-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-zinc-100 dark:border-slate-700 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-[8px] font-black text-slate-400 uppercase animate-pulse px-2">Searching context cache...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white dark:bg-slate-850 border-t border-zinc-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-slate-800/60 rounded-xl px-4 py-1.5 border border-zinc-200 dark:border-slate-700">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask intelligence engine..."
                className="flex-grow bg-transparent outline-none text-xs py-2 font-bold text-slate-700 dark:text-slate-200"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-2 text-brand-600 hover:text-brand-500 disabled:opacity-30">
                <Icons.Send />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
