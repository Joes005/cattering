import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../../api/misc';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { humanize } from '../../lib/format';

export default function AdminAuditLogs() {
  const { data: logs, isLoading } = useQuery({ queryKey: ['admin', 'audit-logs'], queryFn: auditLogsApi.listPlatform });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Platform audit log</h2>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Platform-wide security-relevant actions will appear here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-900">{humanize(log.action)}</span>
                <span className="text-xs text-neutral-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-neutral-500">
                {log.actor_name || 'System'} · {humanize(log.entity_type)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
