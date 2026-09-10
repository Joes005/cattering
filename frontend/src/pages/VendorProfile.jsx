import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PackageCard from '../components/PackageCard';

export default function VendorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get(`/vendors/${id}`).then(setVendor);
    api.get(`/vendors/${id}/packages`).then(setPackages);
    api.get(`/reviews/vendor/${id}`).then(setReviews);
  }, [id]);

  useEffect(() => {
    if (user?.role === 'organizer') {
      api.get('/events/mine', true).then(setEvents).catch(() => {});
    }
  }, [user]);

  async function requestBooking(packageId) {
    setStatus('');
    if (!selectedEvent) {
      setStatus('Pick which event this booking is for first.');
      return;
    }
    try {
      await api.post('/bookings', { event_id: selectedEvent, package_id: packageId, message }, true);
      setStatus('Booking request sent! Check your dashboard for updates.');
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (!vendor) return <div className="container section">Loading…</div>;

  return (
    <div className="container section">
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>{vendor.business_name}</h2>
        <p className="muted">{vendor.city}</p>
        <p>{vendor.description}</p>
        <p className="muted">Cuisines: {vendor.cuisine_types}</p>
        <p className="price">
          ₹{vendor.price_per_plate_min}–₹{vendor.price_per_plate_max} / plate · {vendor.min_guests}-
          {vendor.max_guests} guests
        </p>
        {vendor.rating_count > 0 && (
          <span className="badge gold">
            ⭐ {vendor.avg_rating.toFixed(1)} ({vendor.rating_count} reviews)
          </span>
        )}
      </div>

      {user?.role === 'organizer' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>Request a booking</h3>
          {events.length === 0 ? (
            <p className="muted">
              You need to <a href="/create-event">create an event</a> first before requesting a booking.
            </p>
          ) : (
            <>
              <div className="field">
                <label>Which event?</label>
                <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
                  <option value="">Select an event…</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} — {new Date(e.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Message to vendor (optional)</label>
                <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
            </>
          )}
          {status && <p className="muted">{status}</p>}
        </div>
      )}

      <h3>Packages</h3>
      <div className="grid" style={{ marginBottom: 32 }}>
        {packages.map((p) => (
          <PackageCard
            key={p.id}
            pkg={p}
            action={
              user?.role === 'organizer' && events.length > 0 ? (
                <button className="btn btn-primary" onClick={() => requestBooking(p.id)}>
                  Request quote
                </button>
              ) : null
            }
          />
        ))}
        {packages.length === 0 && <p className="muted">No packages listed yet.</p>}
      </div>

      <h3>Reviews</h3>
      {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      {reviews.map((r) => (
        <div key={r.id} className="list-row">
          <span>{'⭐'.repeat(r.rating)}</span>
          <span className="muted">{r.comment}</span>
        </div>
      ))}
    </div>
  );
}
