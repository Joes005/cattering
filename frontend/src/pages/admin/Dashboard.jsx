import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../../api/companies';
import { adminUsersApi } from '../../api/adminUsers';
import KPICard from '../../components/KPICard';
import { SkeletonCard } from '../../components/Skeleton';

export default function AdminDashboard() {
  const companiesQuery = useQuery({ queryKey: ['admin', 'companies'], queryFn: companiesApi.list });
  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: adminUsersApi.list });

  const loading = companiesQuery.isLoading || usersQuery.isLoading;
  const companies = companiesQuery.data || [];
  const users = usersQuery.data || [];

  const activeCompanies = companies.filter((c) => c.status === 'active').length;
  const clients = users.filter((u) => u.global_role === 'client').length;
  const companyUsers = users.filter((u) => u.global_role === 'company_user').length;

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Companies" value={companies.length} hint={`${activeCompanies} active`} icon="🏢" tone="brand" />
        <KPICard label="Total users" value={users.length} icon="👥" />
        <KPICard label="Company staff & owners" value={companyUsers} icon="🧑‍🍳" />
        <KPICard label="Clients" value={clients} icon="🎉" />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Recently onboarded companies</h2>
        {companies.length === 0 ? (
          <p className="text-sm text-neutral-500">No companies yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {companies.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-neutral-800">{c.name}</span>
                <span className="text-neutral-400">{new Date(c.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
