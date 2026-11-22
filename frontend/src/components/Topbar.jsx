import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Topbar({ title }) {
  const {
    user,
    company,
    companies,
    currentCompanyId,
    setCurrentCompanyId,
    registerAdditionalBusiness,
    logout,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [newBizForm, setNewBizForm] = useState({
    name: '',
    business_type: 'Catering',
    business_address: '',
    gst_number: '',
    description: '',
  });

  const navigate = useNavigate();

  const isEmployer = user?.role === 'employer';
  const hasMultipleOrEmployer = isEmployer || (companies && companies.length > 0);

  async function handleCreateBusiness(e) {
    e.preventDefault();
    if (!newBizForm.name.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await registerAdditionalBusiness(newBizForm);
      setModalOpen(false);
      setBusinessDropdownOpen(false);
      setNewBizForm({
        name: '',
        business_type: 'Catering',
        business_address: '',
        gst_number: '',
        description: '',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register business');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200/70 bg-white/90 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-Business Switcher for Employers */}
          {hasMultipleOrEmployer && (
            <div className="relative">
              <button
                onClick={() => setBusinessDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition shadow-xs"
              >
                <span className="text-sm">🏢</span>
                <span className="max-w-[130px] sm:max-w-[200px] truncate font-semibold text-neutral-900">
                  {company?.name || 'My Business'}
                </span>
                {company?.status === 'approved' ? (
                  <span className="hidden sm:inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Approved
                  </span>
                ) : (
                  <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Pending
                  </span>
                )}
                <span className="text-neutral-400">▾</span>
              </button>

              {businessDropdownOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Catering Businesses ({companies?.length || 1})
                    </p>
                    <p className="text-[11px] text-neutral-500">Switch operational scope or add a branch</p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {companies && companies.length > 0 ? (
                      companies.map((c) => {
                        const isCurrent = c.id === currentCompanyId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCurrentCompanyId(c.id);
                              setBusinessDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              isCurrent ? 'bg-brand-50 text-brand-900 font-semibold' : 'text-neutral-700 hover:bg-neutral-50'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate font-medium">{c.name}</p>
                              <p className="text-[10px] text-neutral-400">{c.business_type || 'Catering'}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                  c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.status === 'approved' ? 'Active' : 'Pending'}
                              </span>
                              {isCurrent && <span className="text-brand-600 font-bold">✓</span>}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-neutral-500">No businesses found</div>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setBusinessDropdownOpen(false);
                        setModalOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                    >
                      <span>+</span>
                      <span>Register Another Business</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <NotificationBell />

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pl-1 pr-3 text-sm hover:bg-neutral-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                {user?.full_name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="hidden text-neutral-700 sm:inline">{user?.full_name}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-neutral-200 bg-white py-1 shadow-card-hover">
                <div className="px-3 py-2 border-b border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-900">{user?.full_name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-medium text-neutral-700 uppercase">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/account');
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Register Business Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Register Additional Catering Business</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{errorMsg}</p>
            )}

            <form onSubmit={handleCreateBusiness} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Business / Brand Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Royal Feast Catering Co."
                  className="input text-xs"
                  value={newBizForm.name}
                  onChange={(e) => setNewBizForm({ ...newBizForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Business Type
                </label>
                <select
                  className="input text-xs"
                  value={newBizForm.business_type}
                  onChange={(e) => setNewBizForm({ ...newBizForm, business_type: e.target.value })}
                >
                  <option value="Catering">Catering Services</option>
                  <option value="Banquet Hall">Banquet & Event Hall</option>
                  <option value="Bakery & Catering">Bakery & Catering</option>
                  <option value="Cloud Kitchen">Cloud Kitchen / Meal Prep</option>
                  <option value="Other">Other Event Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="33AAAAA0000A1Z5"
                  className="input text-xs"
                  value={newBizForm.gst_number}
                  onChange={(e) => setNewBizForm({ ...newBizForm, gst_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Business Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  className="input text-xs"
                  value={newBizForm.business_address}
                  onChange={(e) => setNewBizForm({ ...newBizForm, business_address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Specializing in wedding banquets and corporate galas..."
                  className="input text-xs"
                  value={newBizForm.description}
                  onChange={(e) => setNewBizForm({ ...newBizForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 mt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering…' : 'Register Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
