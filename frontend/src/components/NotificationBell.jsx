import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';
import { BellIcon, CheckCircleIcon } from './Icons';

function getRoleEventsPath(role, entityId) {
  if (role === 'admin') return '/admin';
  if (role === 'employer' || role === 'company_user') {
    return entityId ? `/employer/events/${entityId}` : '/employer/events';
  }
  if (role === 'employee') {
    return '/employee/schedule';
  }
  if (role === 'customer') {
    return entityId ? `/customer/events/${entityId}` : '/customer/events';
  }
  return '/';
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  function handleClick(n) {
    if (!n.is_read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.related_entity_type === 'event' && n.related_entity_id) {
      navigate(getRoleEventsPath(user?.role, n.related_entity_id));
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
        aria-label="Notifications"
      >
        <BellIcon className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-84 rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.2 text-[10px] font-bold text-rose-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {!notifications || notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Notifications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You are completely up to date.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`block w-full p-3.5 text-left text-xs transition hover:bg-slate-50 ${
                    n.is_read ? 'bg-white' : 'bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 truncate">{n.title}</p>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                    )}
                  </div>
                  {n.body && <p className="mt-1 text-slate-600 line-clamp-2 leading-relaxed">{n.body}</p>}
                  <p className="mt-1.5 text-[10px] font-mono text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
