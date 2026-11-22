import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { humanize } from '../../lib/format';

export default function AdminAuditLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: adminApi.listAuditLogs,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Platform Security & Audit Trail</h2>
        <p className="text-xs text-neutral-500">
          Immutable, tamper-evident log of all administrative actions, status mutations, and security events
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !logs || logs.length === 0 ? (
        <EmptyState title="No activity recorded" description="Platform-wide security-relevant actions will appear here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{humanize(log.action)}</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-600 uppercase">
                    {log.entity_type}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-neutral-500">
                Actor: <strong className="text-neutral-700">{log.actor_name || 'System / Platform'}</strong>
                {log.entity_id && ` · Target ID: ${log.entity_id}`}
              </p>

              {(log.old_value || log.new_value) && (
                <div className="rounded-lg bg-neutral-50 p-2 text-[11px] font-mono text-neutral-600 mt-1 flex flex-wrap gap-x-4">
                  {log.old_value && <span>Old: {JSON.stringify(log.old_value)}</span>}
                  {log.new_value && <span className="text-emerald-700 font-semibold">New: {JSON.stringify(log.new_value)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
