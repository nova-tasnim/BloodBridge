import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguageName } from '../utils/getCurrentLanguage';
import { assistantApi } from '../api/resources';

function AssistantChat({ donorId }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await assistantApi.chat(input, donorId, getCurrentLanguageName());
      setMessages((prev) => [...prev, { role: 'assistant', text: data.data.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: err.message }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--gradient-hero)',
          border: 'none',
          color: 'white',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-glow)',
          zIndex: 1000
        }}
      >
        💬
      </button>

      {isOpen && (
        <div
          className="card"
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            width: '350px',
            height: '450px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000
          }}
        >
          <h4 style={{ marginBottom: '1rem' }}>{t('assistant.title')}</h4>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '0.5rem' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '12px',
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                    color: 'white',
                    maxWidth: '85%',
                    fontSize: '0.85rem'
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {t('assistant.thinking')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('assistant.placeholder')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-base)',
                color: 'white'
              }}
            />
            <button onClick={sendMessage} className="btn-primary">
              {t('assistant.send')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AssistantChat;