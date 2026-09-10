import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const EVENT_TYPES = ['Wedding', 'Corporate Event', 'Birthday Party', 'Anniversary', 'Other'];

export default function CreateEvent() {
  const [form, setForm] = useState({
    title: '',
    event_type: 'Wedding',
    event_date: '',
    guest_count: 100,
    location: '',
    budget_min: 0,
    budget_max: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(
        '/events',
        { ...form, event_date: new Date(form.event_date).toISOString() },
        true
      );
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <h2>Plan a new event</h2>
      <p className="muted">
        Tell us about your event — like briefing an organizer — and we'll help you find and book the
        right caterer.
      </p>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Event title</label>
          <input
            className="input"
            required
            placeholder="e.g. Priya & Arjun's Wedding"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Event type</label>
          <select value={form.event_type} onChange={(e) => update('event_type', e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Event date</label>
          <input
            className="input"
            type="date"
            required
            value={form.event_date}
            onChange={(e) => update('event_date', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Guest count</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.guest_count}
            onChange={(e) => update('guest_count', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Location</label>
          <input className="input" value={form.location} onChange={(e) => update('location', e.target.value)} />
        </div>
        <div className="field" style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Budget min (₹)</label>
            <input
              className="input"
              type="number"
              value={form.budget_min}
              onChange={(e) => update('budget_min', Number(e.target.value))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Budget max (₹)</label>
            <input
              className="input"
              type="number"
              value={form.budget_max}
              onChange={(e) => update('budget_max', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="field">
          <label>Notes for caterers</label>
          <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit">
          Create event
        </button>
      </form>
    </div>
  );
}
