import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { assistantApi } from '../api/resources';
import { BLOOD_GROUPS } from './Shared';

const STORAGE_KEY = 'bb_chat_blood_group';

export default function AssistantChat() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'Am I eligible to donate right now?',
    'What should I eat before donating?',
    'Which blood types can I donate to?',
    'Is donating blood painful?'
  ]);
  const [bloodGroup, setBloodGroup] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ''
  );
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function selectBloodGroup(group) {
    setBloodGroup(group);
    localStorage.setItem(STORAGE_KEY, group);
  }

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const language = i18n.language === 'bn' ? 'Bangla' : 'English';
      const res = await assistantApi.chat({ message: text, language, bloodGroup });
      const payload = res?.data || res;
      const reply = payload?.response || t('assistant.errorReply');

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      if (payload?.suggestedQuestions?.length) {
        setSuggestions(payload.suggestedQuestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: t('assistant.errorReply') }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <button
        className="bb-chat-fab"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t('assistant.title')}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="bb-chat-panel">
          <div className="bb-chat-header">
            <span className="bb-chat-header-dot" />
            {t('assistant.title')}
          </div>

          <div className="bb-chat-body" ref={scrollRef}>
            {messages.length === 0 && (
              <>
                <div className="bb-chat-bubble assistant">
                  {t('assistant.welcome')}
                </div>

                <div className="bb-chat-bloodgroup-prompt">
                  <span>{t('assistant.selectBloodGroup')}</span>
                  <div className="bb-chat-chip-row">
                    {BLOOD_GROUPS.map((g) => (
                      <button
                        key={g}
                        className={`bb-chat-chip bb-chat-chip-blood ${bloodGroup === g ? 'active' : ''}`}
                        onClick={() => selectBloodGroup(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`bb-chat-bubble ${m.role}`}>
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="bb-chat-bubble assistant bb-chat-typing">
                <span></span><span></span><span></span>
              </div>
            )}

            {!loading && suggestions.length > 0 && (
              <div className="bb-chat-suggestions">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    className="bb-chat-chip"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bb-chat-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('assistant.placeholder')}
              rows={1}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              {t('assistant.send')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}