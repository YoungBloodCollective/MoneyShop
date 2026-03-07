import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { chatApi, type ChatResponse } from '@/services/api/chatApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.getInitialMessage().then(res => {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: res.mesaj,
        timestamp: new Date(),
      }]);
      setDisclaimer(res.disclaimer);
    }).catch(() => {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: 'Buna! Sunt asistentul virtual MoneyShop. Cu ce te pot ajuta?',
        timestamp: new Date(),
      }]);
    });
  }, []);

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
    <div className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold text-light-100 mb-4">Asistent virtual</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-brand-primary" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-brand-primary text-white rounded-br-md'
                : 'bg-dark-700 border border-dark-400 text-light-90 rounded-bl-md'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-light-50'}`}>
                {msg.timestamp.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-brand-secondary/15 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-brand-secondary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center">
              <Bot size={16} className="text-brand-primary" />
            </div>
            <div className="bg-dark-700 border border-dark-400 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-light-50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <p className="text-[10px] text-light-50 text-center mb-2">{disclaimer}</p>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Scrie un mesaj..."
          disabled={loading}
          className="flex-1 h-12 px-4 rounded-full bg-dark-700 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
