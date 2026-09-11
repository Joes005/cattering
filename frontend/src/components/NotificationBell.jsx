import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/misc';
import { useAuth } from '../context/AuthContext';

function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'company_user') return '/company';
  return '/client';
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30000,
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
      const base = roleHome(user?.global_role);
      navigate(`${base}/events/${n.related_entity_id}`);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white transition-colors hover:bg-neutral-50"
        aria-label="Notifications"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white shadow-card-hover">
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <span className="text-sm font-semibold text-neutral-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllMutation.mutate()} className="text-xs text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-400">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`block w-full border-b border-neutral-50 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-neutral-50 ${
                    n.is_read ? '' : 'bg-brand-50/50'
                  }`}
                >
                  <p className="font-medium text-neutral-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-neutral-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400">{new Date(n.created_at).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
