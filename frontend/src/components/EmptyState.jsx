export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-neutral-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
