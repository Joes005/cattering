import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/messages/conversations', true)
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container section">
      <h2>Messages</h2>
      {loading && <p className="muted">Loading…</p>}
      {!loading && conversations.length === 0 && (
        <div className="empty-state">
          No conversations yet. Messages open up once you have a booking request with a caterer.
        </div>
      )}
      {conversations.map((c) => (
        <div
          key={c.other_user_id}
          className="list-row"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/messages/${c.other_user_id}`)}
        >

          <div>
            <strong>{c.other_user_name}</strong>
            <p className="muted" style={{ margin: 0 }}>
              {c.last_message}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="muted" style={{ margin: 0 }}>
              {new Date(c.last_message_at).toLocaleString()}
            </p>
            {c.unread_count > 0 && <span className="badge gold">{c.unread_count} new</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
