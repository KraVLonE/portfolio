import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Send, Bot, User } from 'lucide-react';
import { API_URL } from '../api';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "SYSTEM ONLINE. I am KraVLonE's portfolio agent. Ask me about his skills, experience, or projects." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => { 
    mountedRef.current = true;
    return () => { mountedRef.current = false; }; 
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }].slice(-100));
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages.slice(1).map(m => ({ role: m.role, content: m.content })) })
      });
      
      const data = await res.json();
      if (mountedRef.current) {
        setMessages(prev => [...prev, { role: 'bot', content: data.reply || "Transmission failed." }].slice(-100));
      }
    } catch (err) {
      if (mountedRef.current) {
        setMessages(prev => [...prev, { role: 'bot', content: "ERROR: Connection to the host was lost." }].slice(-100));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all z-40 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Bot size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-slate-900 border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-slate-950 p-4 border-b border-cyan-500/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-cyan-400">
              <Terminal size={18} />
              <span className="font-mono font-bold tracking-wider text-sm">AGENT_INTERFACE v1.0</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-pink-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto max-h-96 min-h-[300px] flex flex-col gap-4 no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${msg.role === 'user' ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-lg text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-slate-800 text-slate-200 rounded-tr-none' : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-tl-none font-mono whitespace-pre-wrap'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 flex-row">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                  <Bot size={16} />
                </div>
                <div className="p-3 rounded-lg text-sm bg-slate-950 border border-slate-800 text-cyan-400 rounded-tl-none font-mono animate-pulse">
                  Querying database...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything..." 
              className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 p-2 rounded-md transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
