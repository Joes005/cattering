import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { BuildingIcon, PlusIcon, CheckCircleIcon } from './Icons';

export default function Topbar({ title, onToggleMobile = () => {} }) {
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

  const isEmployer = user?.role === 'employer' || user?.role === 'company_user';
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
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobile}
            className="rounded-xl p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="truncate text-base font-bold text-slate-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-Business Switcher for Employers */}
          {hasMultipleOrEmployer && (
            <div className="relative">
              <button
                onClick={() => setBusinessDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <BuildingIcon className="h-4 w-4 text-slate-500" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate font-bold text-slate-900">
                  {company?.name || 'My Business'}
                </span>
                {company?.status === 'approved' ? (
                  <span className="hidden sm:inline-block rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                    Approved
                  </span>
                ) : (
                  <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800">
                    Pending
                  </span>
                )}
                <span className="text-slate-400">▾</span>
              </button>

              {businessDropdownOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Catering Businesses ({companies?.length || 1})
                    </p>
                    <p className="text-[11px] text-slate-500">Switch operational scope or add a branch</p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
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
                              isCurrent ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate font-semibold text-slate-900">{c.name}</p>
                              <p className="text-[10px] text-slate-400">{c.business_type || 'Catering'}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                                  c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.status === 'approved' ? 'Active' : 'Pending'}
                              </span>
                              {isCurrent && <span className="text-emerald-600 font-bold">✓</span>}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">No businesses found</div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 mt-1">
                    <button
                      onClick={() => {
                        setBusinessDropdownOpen(false);
                        setModalOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
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
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white uppercase">
                {user?.full_name?.[0] || '?'}
              </span>
              <span className="hidden text-slate-700 sm:inline truncate max-w-[120px]">{user?.full_name}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate font-mono">{user?.email}</p>
                  <span className="inline-block mt-1 rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-700 uppercase">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/account');
                  }}
                  className="block w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Account Profile
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="block w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Register Business Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register Additional Business</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Royal Banquet Catering"
                  value={newBizForm.name}
                  onChange={(e) => setNewBizForm({ ...newBizForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Type</label>
                <select
                  value={newBizForm.business_type}
                  onChange={(e) => setNewBizForm({ ...newBizForm, business_type: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Catering">Catering Services</option>
                  <option value="Banquet Hall">Banquet & Event Hall</option>
                  <option value="Bakery & Catering">Bakery & Catering</option>
                  <option value="Cloud Kitchen">Cloud Kitchen</option>
                  <option value="Other">Other Event Services</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  placeholder="33AAAAA0000A1Z5"
                  value={newBizForm.gst_number}
                  onChange={(e) => setNewBizForm({ ...newBizForm, gst_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Address</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={newBizForm.business_address}
                  onChange={(e) => setNewBizForm({ ...newBizForm, business_address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Specialties, wedding banquets, corporate dining..."
                  value={newBizForm.description}
                  onChange={(e) => setNewBizForm({ ...newBizForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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
