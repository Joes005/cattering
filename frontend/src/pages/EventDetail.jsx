import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function refresh() {
    api
      .get(`/events/${id}`, true)
      .then(setEvent)
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, [id]);

  async function cancelEvent() {
    if (!confirm('Cancel this event? This cannot be undone.')) return;
    await api.del(`/events/${id}`, true);
    navigate('/dashboard');
  }

  if (error) return <div className="container section empty-state">{error}</div>;
  if (!event) return <div className="container section">Loading…</div>;

  return (
    <div className="container section">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{event.title}</h2>
            <p className="muted">
              {event.event_type} · {new Date(event.event_date).toLocaleDateString()} · {event.guest_count} guests
              {event.location ? ` · ${event.location}` : ''}
            </p>
          </div>
          <StatusBadge status={event.status} />
        </div>
        {event.notes && <p>{event.notes}</p>}
        <p className="muted">
          Budget: ₹{event.budget_min} – ₹{event.budget_max}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/vendors" className="btn btn-primary">
            Browse more caterers
          </Link>
          {event.status !== 'cancelled' && (
            <button className="btn btn-outline" onClick={cancelEvent}>
              Cancel event
            </button>
          )}
        </div>
      </div>

      <h3>Bookings for this event</h3>
      {event.bookings.length === 0 && (
        <div className="empty-state">No booking requests yet — browse caterers to request a quote.</div>
      )}
      {event.bookings.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} className="list-row" style={{ display: 'flex' }}>
          <div>
            <strong>{b.vendor.business_name}</strong>
            <p className="muted" style={{ margin: 0 }}>
              {b.package.title} {b.quoted_price ? `· Quoted ₹${b.quoted_price}` : ''}
            </p>
          </div>
          <StatusBadge status={b.status} />
        </Link>
      ))}
    </div>
  );
}
