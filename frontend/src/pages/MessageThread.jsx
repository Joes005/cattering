import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MessageThread() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [otherName, setOtherName] = useState('');

  useEffect(() => {
    api.get('/messages/conversations', true).then((convos) => {
      const match = convos.find((c) => c.other_user_id === userId);
      if (match) setOtherName(match.other_user_name);
    });
    api.get(`/messages/thread/${userId}`, true).then(setThread);
  }, [userId]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const msg = await api.post('/messages', { receiver_id: userId, body: draft }, true);
    setThread((t) => [...t, msg]);
    setDraft('');
  }

  return (
    <div className="container section" style={{ maxWidth: 640 }}>
      <Link to="/messages" className="muted">
        ← All messages
      </Link>
      <h2>{otherName || 'Conversation'}</h2>
      <div className="card">
        <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
          {thread.length === 0 && <p className="muted">No messages yet — say hello.</p>}
          {thread.map((m) => (
            <div key={m.id} style={{ textAlign: m.sender_id === user.id ? 'right' : 'left', margin: '8px 0' }}>
              <span
                className="badge"
                style={{
                  background: m.sender_id === user.id ? 'var(--accent-light)' : 'var(--gold-light)',
                  color: m.sender_id === user.id ? 'var(--accent)' : 'var(--gold)',
                }}
              >
                {m.body}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
