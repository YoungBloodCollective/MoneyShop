import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { chatApi, type ChatResponse } from '@/services/api/chatApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load initial message when chat is first opened
  useEffect(() => {
    if (open && !initialized) {
      chatApi.getInitialMessage().then(res => {
        setMessages([{
          id: 'init',
          role: 'assistant',
          content: res.mesaj,
          timestamp: new Date(),
        }]);
      }).catch(() => {
        setMessages([{
          id: 'init',
          role: 'assistant',
          content: 'Buna! Sunt asistentul virtual MoneyShop. Cu ce te pot ajuta?',
          timestamp: new Date(),
        }]);
      });
      setInitialized(true);
    }
  }, [open, initialized]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res: ChatResponse = await chatApi.sendMessage({ message: text });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.raspuns,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ne cerem scuze, a aparut o eroare. Te rugam sa incerci din nou.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-96 h-[28rem] bg-dark-800 border border-dark-400 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-400 bg-dark-900">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center">
                <Bot size={16} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-light-100">Asistent virtual</p>
                <p className="text-[10px] text-success-400">Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-dark-600 flex items-center justify-center text-light-60 hover:text-light-90 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-brand-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={12} className="text-brand-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-brand-primary text-white rounded-br-sm'
                    : 'bg-dark-700 border border-dark-400 text-light-90 rounded-bl-sm'
                }`}>
                  <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[9px] mt-0.5 ${msg.role === 'user' ? 'text-white/50' : 'text-light-40'}`}>
                    {msg.timestamp.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-brand-secondary/15 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={12} className="text-brand-secondary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Bot size={12} className="text-brand-primary" />
                </div>
                <div className="bg-dark-700 border border-dark-400 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex gap-2 px-3 py-3 border-t border-dark-400">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Scrie un mesaj..."
              disabled={loading}
              className="flex-1 h-10 px-3 rounded-full bg-dark-700 border border-dark-400 text-sm text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[60] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-dark-700 border border-dark-400 scale-0 opacity-0 pointer-events-none'
            : 'bg-brand-primary hover:bg-brand-primary/90 scale-100 opacity-100'
        }`}
      >
        <MessageCircle size={24} className="text-white" />
        {/* Pulse animation */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-brand-primary animate-ping opacity-20" />
        )}
      </button>
    </>
  );
}
