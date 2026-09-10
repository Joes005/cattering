import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const emptyProfile = {
  business_name: '',
  description: '',
  cuisine_types: '',
  city: '',
  address: '',
  price_per_plate_min: 0,
  price_per_plate_max: 0,
  min_guests: 50,
  max_guests: 500,
};

const emptyPackage = {
  title: '',
  description: '',
  price_per_plate: 0,
  min_guests: 50,
  max_guests: 500,
  menu_items: '',
};

export default function VendorDashboard() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(emptyProfile);
  const [hasProfile, setHasProfile] = useState(false);
  const [packages, setPackages] = useState([]);
  const [newPackage, setNewPackage] = useState(emptyPackage);
  const [bookings, setBookings] = useState([]);
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [notice, setNotice] = useState('');

  function refresh() {
    api
      .get('/vendors/me', true)
      .then((p) => {
        setProfile(p);
        setHasProfile(true);
      })
      .catch(() => setHasProfile(false));
    api.get('/packages/mine/list', true).then(setPackages).catch(() => {});
    api.get('/bookings/vendor/incoming', true).then(setBookings).catch(() => {});
  }

  useEffect(refresh, []);

  async function saveProfile(e) {
    e.preventDefault();
    await api.post('/vendors/me', profile, true);
    setNotice('Profile saved.');
    refresh();
  }

  async function addPackage(e) {
    e.preventDefault();
    await api.post('/packages', newPackage, true);
    setNewPackage(emptyPackage);
    refresh();
  }

  async function deletePackage(id) {
    await api.del(`/packages/${id}`, true);
    refresh();
  }

  async function sendQuote(bookingId) {
    const price = quoteDrafts[bookingId];
    if (!price) return;
    await api.patch(`/bookings/${bookingId}/quote`, { quoted_price: Number(price) }, true);
    refresh();
  }

  return (
    <div className="container section">
      <h2>Vendor dashboard</h2>
      <div className="dashboard-tabs">
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          Business profile
        </button>
        <button className={tab === 'packages' ? 'active' : ''} onClick={() => setTab('packages')}>
          Packages
        </button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>
          Incoming requests
        </button>
      </div>

      {notice && <p className="muted">{notice}</p>}

      {tab === 'profile' && (
        <form className="card" onSubmit={saveProfile} style={{ maxWidth: 560 }}>
          {!hasProfile && <p className="muted">Set up your business profile so organizers can find you.</p>}
          <div className="field">
            <label>Business name</label>
            <input
              className="input"
              required
              value={profile.business_name}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              rows={3}
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Cuisine types (comma-separated)</label>
            <input
              className="input"
              value={profile.cuisine_types || ''}
              onChange={(e) => setProfile({ ...profile, cuisine_types: e.target.value })}
            />
          </div>
          <div className="field">
            <label>City</label>
            <input className="input" value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </div>
          <div className="field" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Price/plate min (₹)</label>
              <input
                className="input"
                type="number"
                value={profile.price_per_plate_min}
                onChange={(e) => setProfile({ ...profile, price_per_plate_min: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Price/plate max (₹)</label>
              <input
                className="input"
                type="number"
                value={profile.price_per_plate_max}
                onChange={(e) => setProfile({ ...profile, price_per_plate_max: Number(e.target.value) })}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">
            Save profile
          </button>
        </form>
      )}

      {tab === 'packages' && (
        <div>
          <form className="card" onSubmit={addPackage} style={{ maxWidth: 560, marginBottom: 24 }}>
            <h3>Add a package</h3>
            <div className="field">
              <label>Title</label>
              <input
                className="input"
                required
                value={newPackage.title}
                onChange={(e) => setNewPackage({ ...newPackage, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                rows={2}
                value={newPackage.description}
                onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Price per plate (₹)</label>
              <input
                className="input"
                type="number"
                required
                value={newPackage.price_per_plate}
                onChange={(e) => setNewPackage({ ...newPackage, price_per_plate: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Menu highlights</label>
              <input
                className="input"
                value={newPackage.menu_items}
                onChange={(e) => setNewPackage({ ...newPackage, menu_items: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Add package
            </button>
          </form>

          {packages.map((p) => (
            <div key={p.id} className="list-row">
              <div>
                <strong>{p.title}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  ₹{p.price_per_plate}/plate · {p.min_guests}-{p.max_guests} guests
                </p>
              </div>
              <button className="btn btn-outline" onClick={() => deletePackage(p.id)}>
                Delete
              </button>
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
                  <strong>Request #{b.id.slice(0, 8)}</strong>
                  {b.message && <p className="muted" style={{ margin: 0 }}>{b.message}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={b.status} />
                  <Link className="btn btn-outline" to={`/bookings/${b.id}`}>
                    Open
                  </Link>
                </div>
              </div>
              {b.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    type="number"
                    placeholder="Quote price (₹/plate)"
                    style={{ maxWidth: 200 }}
                    value={quoteDrafts[b.id] || ''}
                    onChange={(e) => setQuoteDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                  />
                  <button className="btn btn-primary" onClick={() => sendQuote(b.id)}>
                    Send quote
                  </button>
                </div>
              )}
              {b.status === 'quoted' && <p className="muted">Waiting on organizer to accept ₹{b.quoted_price}.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
