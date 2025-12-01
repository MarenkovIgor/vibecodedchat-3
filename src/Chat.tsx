import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: Role;
  content: string;
};

const STORAGE_KEY = 'openai_api_key';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

function Chat() {
  const [apiKey, setApiKey] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Load saved key once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setApiKey(saved);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const visibleMessages = useMemo(() => messages.filter(m => m.role !== 'system'), [messages]);

  const handleSaveKey = useCallback((value: string) => {
    setApiKey(value);
    if (value) localStorage.setItem(STORAGE_KEY, value); else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !apiKey) return;
    setBusy(true);
    setInput('');
    const nextMessages = [...messages, { role: 'user', content: text } as ChatMessage];
    setMessages(nextMessages);

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText}`);
      }
      const data = await resp.json();
      const assistantText: string = data.choices?.[0]?.message?.content ?? '(no content)';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Ошибка запроса: ${e?.message || String(e)}` },
      ]);
    } finally {
      setBusy(false);
    }
  }, [apiKey, input, messages]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Простой чат с OpenAI</h2>

      <div style={styles.keyRow}>
        <input
          type="password"
          placeholder="Вставьте ваш OpenAI API Key (sk-...)"
          value={apiKey}
          onChange={(e) => handleSaveKey(e.target.value)}
          style={styles.keyInput as React.CSSProperties}
        />
        <button onClick={() => handleSaveKey('')} style={styles.clearBtn}>
          Очистить
        </button>
      </div>
      <div style={styles.hint}>Ключ хранится только в вашем браузере (localStorage).</div>

      <div ref={listRef} style={styles.messages as React.CSSProperties}>
        {visibleMessages.length === 0 ? (
          <div style={styles.placeholder}>Начните диалог — задайте вопрос ниже.</div>
        ) : (
          visibleMessages.map((m, idx) => (
            <div key={idx} style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}>
              <div style={styles.role}>{m.role === 'user' ? 'Вы' : 'Ассистент'}</div>
              <div style={styles.content}>{m.content}</div>
            </div>
          ))
        )}
      </div>

      <div style={styles.inputRow as React.CSSProperties}>
        <textarea
          placeholder={apiKey ? 'Введите сообщение и нажмите Enter (Shift+Enter — новая строка)' : 'Сначала вставьте API ключ'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!apiKey || busy}
          rows={3}
          style={styles.textarea as React.CSSProperties}
        />
        <button onClick={() => void sendMessage()} disabled={!apiKey || busy || !input.trim()} style={styles.sendBtn}>
          {busy ? 'Отправка…' : 'Отправить'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: 820,
    margin: '24px auto',
    padding: '16px',
  },
  title: {
    margin: '0 0 12px 0',
    fontWeight: 600,
  },
  keyRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  keyInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontFamily: 'inherit',
  },
  clearBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#f5f5f5',
    cursor: 'pointer',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  messages: {
    height: '60vh',
    overflowY: 'auto',
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    padding: 12,
    background: '#fff',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)'
  },
  placeholder: {
    color: '#777',
    textAlign: 'center',
    marginTop: 24,
  },
  msg: {
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 10,
    whiteSpace: 'pre-wrap',
  },
  user: {
    background: '#e7f1ff',
    border: '1px solid #c9defe',
  },
  assistant: {
    background: '#f6f6f6',
    border: '1px solid #e9e9e9',
  },
  role: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 1.4,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    alignItems: 'stretch',
  },
  textarea: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: '1px solid #ccc',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '0 16px',
    borderRadius: 8,
    border: '1px solid #1d5bd6',
    background: '#2a6cf4',
    color: 'white',
    cursor: 'pointer',
  },
};

export default Chat;
