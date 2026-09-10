import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import VendorCard from '../components/VendorCard';

export default function VendorSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const city = searchParams.get('city') || '';
  const q = searchParams.get('q') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (q) params.set('cuisine', q);
    api
      .get(`/vendors?${params.toString()}`)
      .then(setVendors)
      .finally(() => setLoading(false));
  }, [city, q]);

  return (
    <div className="container section">
      <h2>Find caterers</h2>
      <div className="search-bar" style={{ marginBottom: 24, marginLeft: 0 }}>
        <input
          className="input"
          placeholder="Cuisine or keyword…"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearchParams({ q: e.target.value, city });
          }}
        />
        <input
          className="input"
          placeholder="City"
          defaultValue={city}
          style={{ maxWidth: 160 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearchParams({ q, city: e.target.value });
          }}
        />
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && vendors.length === 0 && (
        <div className="empty-state">No caterers found. Try a different search.</div>
      )}
      <div className="grid">
        {vendors.map((v) => (
          <VendorCard key={v.id} vendor={v} />
        ))}
      </div>
    </div>
  );
}
