import { humanize } from '../lib/format';

export default function Timeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {history.map((entry, i) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`h-2.5 w-2.5 rounded-full ${i === history.length - 1 ? 'bg-brand-600' : 'bg-neutral-300'}`} />
            {i < history.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-neutral-200" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-neutral-900">{humanize(entry.to_status)}</p>
            {entry.note && <p className="text-sm text-neutral-500">{entry.note}</p>}
            <p className="text-xs text-neutral-400">{new Date(entry.created_at).toLocaleString()}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
