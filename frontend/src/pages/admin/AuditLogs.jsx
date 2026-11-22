import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { humanize } from '../../lib/format';
import {
  AuditIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: adminApi.listAuditLogs,
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesEntity = entityFilter === 'all' || log.entity_type?.toLowerCase() === entityFilter.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.entity_id?.toLowerCase().includes(search.toLowerCase());
      return matchesEntity && matchesSearch;
    });
  }, [logs, entityFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Platform Security & Audit Trail
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Tamper-evident, immutable audit trail of all administrative actions, KYC decisions, financial settlements, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
          <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold">Immutable Append-Only Log</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'company', label: 'Catering Businesses' },
            { id: 'user', label: 'Users' },
            { id: 'subscription', label: 'Subscriptions' },
            { id: 'commission_ledger', label: 'Commissions' },
            { id: 'dispute', label: 'Disputes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setEntityFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                entityFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Logs Main List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredLogs || filteredLogs.length === 0 ? (
        <EmptyState title="No audit logs found" description="Platform security actions will be recorded here automatically." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{humanize(log.action)}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 uppercase">
                    {log.entity_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                <span>Actor: <strong className="text-slate-800">{log.actor_name || 'System / Platform Admin'}</strong></span>
                {log.entity_id && (
                  <span>Target ID: <span className="font-mono text-slate-600">{log.entity_id}</span></span>
                )}
              </div>

              {(log.old_value || log.new_value) && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-[11px] font-mono text-slate-700 mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {log.old_value && (
                    <span className="text-slate-500">Previous: {JSON.stringify(log.old_value)}</span>
                  )}
                  {log.new_value && (
                    <span className="text-emerald-700 font-bold">New: {JSON.stringify(log.new_value)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
