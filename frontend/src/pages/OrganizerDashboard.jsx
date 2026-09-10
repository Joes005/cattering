import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function OrganizerDashboard() {
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [notice, setNotice] = useState('');

  function refresh() {
    api.get('/events/mine', true).then(setEvents);
    api.get('/bookings/mine', true).then(setBookings);
  }

  useEffect(refresh, []);

  async function acceptQuote(bookingId) {
    await api.patch(`/bookings/${bookingId}/status`, { status: 'accepted' }, true);
    refresh();
  }

  async function cancelBooking(bookingId) {
    await api.patch(`/bookings/${bookingId}/status`, { status: 'cancelled' }, true);
    refresh();
  }

  async function payDeposit(bookingId) {
    const res = await api.post(`/payments/checkout/${bookingId}`, {}, true);
    if (res.checkout_url) {
      window.location.href = res.checkout_url;
    } else {
      setNotice('Payment recorded (Stripe not configured in this environment). Marking booking confirmed…');
      await api.patch(`/bookings/${bookingId}/status`, { status: 'confirmed' }, true);
      refresh();
    }
  }

  async function markCompleted(bookingId) {
    await api.patch(`/bookings/${bookingId}/status`, { status: 'completed' }, true);
    refresh();
  }

  async function submitReview(bookingId) {
    const draft = reviewDrafts[bookingId] || { rating: 5, comment: '' };
    await api.post('/reviews', { booking_id: bookingId, ...draft }, true);
    setNotice('Thanks for your review!');
    refresh();
  }

  return (
    <div className="container section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My events</h2>
        <Link to="/create-event" className="btn btn-primary">
          + New event
        </Link>
      </div>

      <div className="dashboard-tabs">
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
          Events
        </button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>
          Bookings
        </button>
      </div>

      {notice && <p className="muted">{notice}</p>}

      {tab === 'events' && (
        <div>
          {events.length === 0 && <div className="empty-state">No events yet. Create one to get started.</div>}
          {events.map((e) => (
            <div key={e.id} className="list-row">
              <div>
                <strong>{e.title}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {e.event_type} · {new Date(e.event_date).toLocaleDateString()} · {e.guest_count} guests
                </p>
              </div>
              <StatusBadge status={e.status} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-outline" to={`/events/${e.id}`}>
                  View
                </Link>
                <Link className="btn btn-outline" to="/vendors">
                  Find caterers
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div>
          {bookings.length === 0 && <div className="empty-state">No booking requests yet.</div>}
          {bookings.map((b) => (
            <div key={b.id} className="card" style={{ marginBottom: 12 }}>
              <div className="list-row" style={{ borderBottom: 'none', padding: '0 0 8px' }}>
                <div>
                  <strong>Booking #{b.id.slice(0, 8)}</strong>
                  {b.quoted_price && <p className="price" style={{ margin: 0 }}>Quoted: ₹{b.quoted_price}</p>}
                  {b.message && <p className="muted" style={{ margin: 0 }}>{b.message}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={b.status} />
                  <Link className="btn btn-outline" to={`/bookings/${b.id}`}>
                    Open
                  </Link>
                </div>
              </div>

              {b.status === 'quoted' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => acceptQuote(b.id)}>
                    Accept quote
                  </button>
                  <button className="btn btn-outline" onClick={() => cancelBooking(b.id)}>
                    Decline
                  </button>
                </div>
              )}

              {b.status === 'accepted' && (
                <button className="btn btn-gold" onClick={() => payDeposit(b.id)}>
                  Pay deposit
                </button>
              )}

              {b.status === 'confirmed' && (
                <button className="btn btn-outline" onClick={() => markCompleted(b.id)}>
                  Mark event as completed
                </button>
              )}

              {b.status === 'pending' && (
                <button className="btn btn-outline" onClick={() => cancelBooking(b.id)}>
                  Cancel request
                </button>
              )}

              {b.status === 'completed' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={reviewDrafts[b.id]?.rating || 5}
                    onChange={(e) =>
                      setReviewDrafts((d) => ({ ...d, [b.id]: { ...d[b.id], rating: Number(e.target.value) } }))
                    }
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ⭐
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    placeholder="Leave a review…"
                    value={reviewDrafts[b.id]?.comment || ''}
                    onChange={(e) =>
                      setReviewDrafts((d) => ({ ...d, [b.id]: { ...d[b.id], comment: e.target.value } }))
                    }
                  />
                  <button className="btn btn-primary" onClick={() => submitReview(b.id)}>
                    Submit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
