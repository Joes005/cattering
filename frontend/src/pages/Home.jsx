import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import VendorCard from '../components/VendorCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [topVendors, setTopVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/vendors/top').then(setTopVendors).catch(() => {});
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('city', location);
    navigate(`/vendors?${params.toString()}`);
  }

  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1>Plan your event's catering, all in one place</h1>
          <p>
            Just like hiring a wedding organizer — browse verified caterers, request quotes, and
            book the perfect menu for your event.
          </p>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              className="input"
              placeholder="Search caterers or cuisines…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className="input"
              placeholder="City"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="container section">
        <h2>Browse by event type</h2>
        <div className="grid">
          {categories.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{ cursor: 'pointer', textAlign: 'center' }}
              onClick={() => navigate(`/vendors?category_id=${c.id}`)}
            >
              <div style={{ fontSize: 32 }}>{c.icon}</div>
              <strong>{c.name}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="container section">
        <h2>Top-rated caterers</h2>
        <div className="grid">
          {topVendors.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
          {topVendors.length === 0 && <p className="muted">No vendors yet — check back soon.</p>}
        </div>
      </div>
    </div>
  );
}
