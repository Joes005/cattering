import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  StaffIcon,
  SearchIcon,
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminEmployees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['admin', 'workforce', 'roster'],
    queryFn: adminApi.listEmployees,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }) =>
      isActive ? adminApi.suspendEmployee(userId) : adminApi.activateEmployee(userId),
    onSuccess: (updated) => {
      showToast(`Workforce profile status updated to ${updated.status}.`);
      if (selectedStaff?.user?.id === updated.id) {
        setSelectedStaff({ ...selectedStaff, user: { ...selectedStaff.user, status: updated.status } });
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'workforce'] });
    },
  });

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((emp) => {
      const u = emp.user || {};
      const skillsStr = (emp.skills || []).join(' ').toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        emp.city?.toLowerCase().includes(q) ||
        skillsStr.includes(q)
      );
    });
  }, [employees, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Workforce & Catering Staff Roster
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Independent catering professionals, skill endorsements, verified credentials, and account standing.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Total Registered Staff:</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
            {employees?.length || 0}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, skill, city..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredEmployees || filteredEmployees.length === 0 ? (
        <EmptyState
          title="No workforce staff registered"
          description={search ? `No staff match "${search}".` : 'Independent catering workers will appear here.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredEmployees.map((profile) => {
              const u = profile.user || {};
              const skills = profile.skills || [];
              const isActive = u.status === 'active';

              return (
                <div
                  key={profile.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-5 gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-base">
                      <StaffIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{u.full_name || 'Independent Worker'}</span>
                        <StatusBadge status={u.status} />
                        {profile.is_verified && (
                          <span className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <ShieldCheckIcon className="h-3 w-3" />
                            <span>Verified</span>
                          </span>
                        )}
                        {profile.city && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            📍 {profile.city}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Email: <strong className="text-slate-700">{u.email}</strong></span>
                        {u.phone && <span>Phone: {u.phone}</span>}
                        {profile.hourly_rate && (
                          <span>Rate: <strong className="text-emerald-700">{formatCurrency(profile.hourly_rate)}/hr</strong></span>
                        )}
                        {profile.rating && (
                          <span className="font-semibold text-amber-600">★ {profile.rating} / 5.0</span>
                        )}
                        <span>Completed Shifts: <strong>{profile.completed_shifts_count || 0}</strong></span>
                      </div>

                      {/* Skills Tags */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => setSelectedStaff(profile)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    >
                      <EyeIcon className="h-3.5 w-3.5 text-slate-500" />
                      <span>Profile</span>
                    </button>

                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          userId: u.id,
                          isActive,
                        })
                      }
                      disabled={toggleMutation.isPending}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        isActive
                          ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {isActive ? 'Suspend Staff' : 'Activate Staff'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Profile Inspection Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                  <StaffIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStaff.user?.full_name || 'Staff Member'}
                  </h3>
                  <p className="text-xs text-slate-500">Catering Professional Credentials</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selectedStaff.user?.status} />
              {selectedStaff.is_verified && (
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <ShieldCheckIcon className="h-3 w-3" />
                  <span>KYC Verified</span>
                </span>
              )}
              {selectedStaff.rating && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                  Rating: ★ {selectedStaff.rating} / 5.0
                </span>
              )}
            </div>

            <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-800">{selectedStaff.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-800">{selectedStaff.user?.phone || 'Unprovided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base Location:</span>
                <span className="text-slate-800">{selectedStaff.city || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hourly Rate Expectation:</span>
                <span className="font-bold text-emerald-700">
                  {selectedStaff.hourly_rate ? formatCurrency(selectedStaff.hourly_rate) + '/hr' : 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completed Catering Shifts:</span>
                <span className="font-bold text-slate-800">{selectedStaff.completed_shifts_count || 0}</span>
              </div>
              {selectedStaff.bio && (
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Professional Bio</p>
                  <p className="text-slate-700 mt-1 leading-relaxed">{selectedStaff.bio}</p>
                </div>
              )}
            </div>

            {selectedStaff.skills && selectedStaff.skills.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">Endorsed Catering Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStaff.skills.map((s, i) => (
                    <span key={i} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedStaff(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const isActive = selectedStaff.user?.status === 'active';
                  toggleMutation.mutate({ userId: selectedStaff.user?.id, isActive });
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  selectedStaff.user?.status === 'active'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {selectedStaff.user?.status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
