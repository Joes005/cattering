import { useState, useEffect } from 'react';
import { customerApi } from '../../api/customerApi';

export default function CustomerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    default_delivery_address: '',
    preferred_cuisines: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await customerApi.getProfile();
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          city: data.city || '',
          default_delivery_address: data.default_delivery_address || '',
          preferred_cuisines: Array.isArray(data.preferred_cuisines)
            ? data.preferred_cuisines.join(', ')
            : (data.preferred_cuisines || '')
        });
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        default_delivery_address: form.default_delivery_address.trim() || null,
        preferred_cuisines: form.preferred_cuisines
          ? form.preferred_cuisines.split(',').map(s => s.trim()).filter(Boolean)
          : []
      };
      const updated = await customerApi.updateProfile(payload);
      setProfile(updated);
      setMessage({ type: 'success', text: 'Customer profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-gray-500">Loading customer profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account & Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your event contact details, delivery address, and cuisine preferences.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-100">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile?.full_name || 'Customer'}</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{profile?.email || 'N/A'}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                Customer Account
              </span>
              <span className="text-xs text-gray-400">ID #{profile?.id}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>👤</span>
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>📞</span>
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>📍</span>
                City / Region
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span>🍽️</span>
                Preferred Cuisines (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Italian, Mexican, Vegan, BBQ"
                value={form.preferred_cuisines}
                onChange={(e) => setForm({ ...form, preferred_cuisines: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <span>🏠</span>
              Default Event / Delivery Address
            </label>
            <textarea
              rows={3}
              placeholder="Street address, suite/apartment, gate code, loading instructions..."
              value={form.default_delivery_address}
              onChange={(e) => setForm({ ...form, default_delivery_address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span>💾</span>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
