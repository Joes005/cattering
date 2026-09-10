import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [quotePrice, setQuotePrice] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isOrganizer = booking && user?.id === booking.organizer_id;
  const counterpartUserId = booking ? (isOrganizer ? booking.vendor.user_id : booking.organizer_id) : null;
  const counterpartName = booking ? (isOrganizer ? booking.vendor.business_name : booking.organizer.name) : '';

  function refresh() {
    api
      .get(`/bookings/${id}`, true)
      .then(setBooking)
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, [id]);

  useEffect(() => {
    if (!counterpartUserId) return;
    api.get(`/messages/thread/${counterpartUserId}`, true).then(setThread).catch(() => {});
  }, [counterpartUserId]);

  useEffect(() => {
    const paid = searchParams.get('paid');
    if (paid === '1') setNotice('Payment successful! Your booking is confirmed.');
    if (paid === '0') setNotice('Payment was cancelled.');
  }, [searchParams]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const msg = await api.post('/messages', { receiver_id: counterpartUserId, booking_id: id, body: draft }, true);
    setThread((t) => [...t, msg]);
    setDraft('');
  }

  async function sendQuote() {
    if (!quotePrice) return;
    await api.patch(`/bookings/${id}/quote`, { quoted_price: Number(quotePrice) }, true);
    refresh();
  }

  async function setStatus(status) {
    await api.patch(`/bookings/${id}/status`, { status }, true);
    refresh();
  }

  async function payDeposit() {
    const res = await api.post(`/payments/checkout/${id}`, {}, true);
    if (res.checkout_url) {
      window.location.href = res.checkout_url;
    } else {
      await api.patch(`/bookings/${id}/status`, { status: 'confirmed' }, true);
      setNotice('Payment recorded (Stripe not configured). Booking confirmed.');
      refresh();
    }
  }

  async function submitReview() {
    try {
      await api.post('/reviews', { booking_id: id, ...review }, true);
      setNotice('Thanks for your review!');
    } catch (err) {
      setNotice(err.message);
    }
  }

  if (error) return <div className="container section empty-state">{error}</div>;
  if (!booking) return <div className="container section">Loading…</div>;

  return (
    <div className="container section">
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{booking.package.title}</h2>
            <p className="muted">
              {isOrganizer ? (
                <>With {booking.vendor.business_name}</>
              ) : (
                <>For {booking.organizer.name} — {booking.event.title}</>
              )}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        {booking.quoted_price && <p className="price">Quoted: ₹{booking.quoted_price} / plate</p>}
        {booking.message && <p className="muted">"{booking.message}"</p>}
        <p className="muted">
          Event: <Link to={`/events/${booking.event.id}`}>{booking.event.title}</Link> ·{' '}
          {new Date(booking.event.event_date).toLocaleDateString()} · {booking.event.guest_count} guests
        </p>
        {!isOrganizer && (
          <p className="muted">
            Vendor: <Link to={`/vendors/${booking.vendor.id}`}>{booking.vendor.business_name}</Link>
          </p>
        )}

        {notice && <p className="muted">{notice}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {!isOrganizer && booking.status === 'pending' && (
            <>
              <input
                className="input"
                type="number"
                placeholder="Quote price (₹/plate)"
                style={{ maxWidth: 200 }}
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
              />
              <button className="btn btn-primary" onClick={sendQuote}>
                Send quote
              </button>
            </>
          )}

          {isOrganizer && booking.status === 'quoted' && (
            <>
              <button className="btn btn-primary" onClick={() => setStatus('accepted')}>
                Accept quote
              </button>
              <button className="btn btn-outline" onClick={() => setStatus('cancelled')}>
                Decline
              </button>
            </>
          )}

          {isOrganizer && booking.status === 'pending' && (
            <button className="btn btn-outline" onClick={() => setStatus('cancelled')}>
              Cancel request
            </button>
          )}

          {isOrganizer && booking.status === 'accepted' && (
            <button className="btn btn-gold" onClick={payDeposit}>
              Pay deposit
            </button>
          )}

          {isOrganizer && booking.status === 'confirmed' && (
            <button className="btn btn-outline" onClick={() => setStatus('completed')}>
              Mark event as completed
            </button>
          )}
        </div>

        {isOrganizer && booking.status === 'completed' && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ⭐
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Leave a review…"
              value={review.comment}
              onChange={(e) => setReview({ ...review, comment: e.target.value })}
            />
            <button className="btn btn-primary" onClick={submitReview}>
              Submit review
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Messages with {counterpartName}</h3>
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
          {thread.length === 0 && <p className="muted">No messages yet — say hello.</p>}
          {thread.map((m) => (
            <div
              key={m.id}
              style={{
                textAlign: m.sender_id === user.id ? 'right' : 'left',
                margin: '8px 0',
              }}
            >
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
