import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients';
import { membersApi } from '../../api/members';
import { eventsApi } from '../../api/events';
import { meWorkApi } from '../../api/meWork';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const OPEN_STATUSES = new Set(['enquiry', 'quotation_sent', 'awaiting_approval', 'advance_pending']);

export default function CompanyDashboard() {
  const { currentCompanyId, currentMembership, hasPermission, user } = useAuth();

  // Owner/manager get the business-overview dashboard; plain staff get their
  // personal "My Work" view — deciding this by employment_role (not by
  // events.view) matters because staff also legitimately hold events.view
  // (scoped server-side to their own assignments), so checking that
  // permission here would put them on the wrong dashboard.
  const isManager = ['owner', 'manager'].includes(currentMembership?.employment_role);

  const clientsQuery = useQuery({
    queryKey: ['clients', currentCompanyId],
    queryFn: () => clientsApi.list(currentCompanyId),
    enabled: !!currentCompanyId && isManager && hasPermission('clients.view'),
  });
  const membersQuery = useQuery({
    queryKey: ['members', currentCompanyId],
    queryFn: () => membersApi.list(currentCompanyId),
    enabled: !!currentCompanyId && isManager && hasPermission('employees.view'),
  });
  const eventsQuery = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId && isManager && hasPermission('events.view'),
  });

  if (!isManager) {
    return <MyWorkView user={user} membership={currentMembership} />;
  }

  if (clientsQuery.isLoading || membersQuery.isLoading || eventsQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const clients = clientsQuery.data || [];
  const members = membersQuery.data || [];
  const events = eventsQuery.data || [];
  const openEvents = events.filter((e) => OPEN_STATUSES.has(e.status));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Clients" value={clients.length} icon="🎉" tone="brand" />
        <KPICard label="Employees" value={members.length} icon="🧑‍🍳" />
        <KPICard label="Total events" value={events.length} icon="📅" />
        <KPICard label="In the pipeline" value={openEvents.length} hint="Enquiry → advance pending" icon="📝" />
      </div>

      {events.length === 0 ? (
        <EmptyState icon="🎉" title="No events yet" description="Events your clients book will show up here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {events.slice(0, 6).map((event) => (
            <Link
              key={event.id}
              to={`/company/events/${event.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-500">{new Date(event.event_date).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={event.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MyWorkView({ user, membership }) {
  const queryClient = useQueryClient();
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['me', 'assignments'],
    queryFn: meWorkApi.listAssignments,
  });
  const { data: tasks, isLoading: loadingTasks } = useQuery({ queryKey: ['me', 'tasks'], queryFn: meWorkApi.listTasks });

  const checkInMutation = useMutation({
    mutationFn: (eventId) => meWorkApi.checkIn(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'assignments'] }),
  });
  const checkOutMutation = useMutation({
    mutationFn: (eventId) => meWorkApi.checkOut(eventId),
  });
  const taskMutation = useMutation({
    mutationFn: ({ taskId, status }) => meWorkApi.updateTask(taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'tasks'] }),
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <h2 className="relative text-lg font-semibold tracking-tight">Welcome back, {user?.full_name?.split(' ')[0]}</h2>
        <p className="relative mt-1 text-sm text-white/80 capitalize">{membership?.job_title || membership?.employment_role}</p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">My assignments</h3>
        {loadingAssignments ? (
          <SkeletonRows rows={2} />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="No assignments yet"
            description="Events you're assigned to will show up here."
          />
        ) : (
          <div className="card divide-y divide-neutral-100">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{a.event_title}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(a.event_date).toLocaleDateString()} · {a.guest_count} guests
                    {a.venue_name ? ` · ${a.venue_name}` : ''} · Your role: {a.event_role.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary text-xs"
                    disabled={checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate(a.event_id)}
                  >
                    Check in
                  </button>
                  <button
                    className="btn-secondary text-xs"
                    disabled={checkOutMutation.isPending}
                    onClick={() => checkOutMutation.mutate(a.event_id)}
                  >
                    Check out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">My tasks</h3>
        {loadingTasks ? (
          <SkeletonRows rows={2} />
        ) : tasks.length === 0 ? (
          <EmptyState icon="✅" title="No tasks assigned" description="Tasks assigned to you will show up here." />
        ) : (
          <div className="card divide-y divide-neutral-100">
            {tasks.map((t) => (
              <label key={t.id} className="flex items-center gap-3 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={(e) => taskMutation.mutate({ taskId: t.id, status: e.target.checked ? 'done' : 'todo' })}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className={t.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-800'}>
                  {t.title}
                </span>
                <span className="ml-auto text-xs text-neutral-400">{t.phase.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
