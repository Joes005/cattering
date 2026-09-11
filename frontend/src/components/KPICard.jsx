export default function KPICard({ label, value, hint, icon, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'bg-neutral-100 text-neutral-600',
    brand: 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-500">{label}</p>
          <p className="mt-1.5 text-[1.75rem] font-semibold leading-none tracking-tight text-neutral-900">{value}</p>
          {hint && <p className="mt-2 text-xs text-neutral-400">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${toneClasses[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
