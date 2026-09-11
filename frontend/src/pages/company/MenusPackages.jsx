import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menusApi, packagesApi } from '../../api/menus';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

export default function CompanyMenusPackages() {
  const [tab, setTab] = useState('menu');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Menus &amp; Packages</h2>
      <div className="flex gap-2 border-b border-neutral-200">
        {[
          ['menu', 'Menu items'],
          ['packages', 'Packages'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === value ? 'border-b-2 border-brand-600 text-brand-700' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'menu' ? <MenuItemsPanel /> : <PackagesPanel />}
    </div>
  );
}

const EMPTY_ITEM_FORM = { category_id: '', name: '', veg_type: 'veg', price: '' };

function MenuItemsPanel() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({
    queryKey: ['menu-categories', currentCompanyId],
    queryFn: () => menusApi.listCategories(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const { data: items, isLoading } = useQuery({
    queryKey: ['menu-items', currentCompanyId],
    queryFn: () => menusApi.listItems(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const [error, setError] = useState('');

  const canEdit = hasPermission('menus.create');

  const createCategoryMutation = useMutation({
    mutationFn: () => menusApi.createCategory(currentCompanyId, { name: categoryName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', currentCompanyId] });
      setCategoryName('');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      menusApi.createItem(currentCompanyId, { ...form, price: Number(form.price) || 0, category_id: form.category_id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_ITEM_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId) => menusApi.deleteItem(currentCompanyId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-items', currentCompanyId] }),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="card flex flex-wrap items-end gap-2 p-4">
          <div className="flex-1 min-w-[160px]">
            <label className="label">New category</label>
            <input className="input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Starters" />
          </div>
          <button
            className="btn-secondary"
            disabled={!categoryName || createCategoryMutation.isPending}
            onClick={() => createCategoryMutation.mutate()}
          >
            Add category
          </button>
          <button className="btn-primary ml-auto" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Menu item'}
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createItemMutation.mutate();
          }}
          className="card grid gap-3 p-5 sm:grid-cols-2"
        >
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Uncategorized</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.veg_type} onChange={(e) => setForm({ ...form, veg_type: e.target.value })}>
              <option value="veg">Vegetarian</option>
              <option value="non_veg">Non-Vegetarian</option>
            </select>
          </div>
          <div>
            <label className="label">Price (per plate, optional)</label>
            <input type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <button type="submit" disabled={createItemMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createItemMutation.isPending ? 'Saving…' : 'Save item'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <EmptyState title="No menu items yet" description="Add your dishes so you can build packages from them." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                <p className="text-xs text-neutral-500">
                  {item.veg_type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                  {item.price ? ` · ₹${item.price}` : ''}
                </p>
              </div>
              {canEdit && (
                <button className="text-xs text-red-600 hover:underline" onClick={() => deleteMutation.mutate(item.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_PKG_FORM = { name: '', description: '', pricing_type: 'per_guest', price: '', min_guests: '' };

function PackagesPanel() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages', currentCompanyId],
    queryFn: () => packagesApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PKG_FORM);
  const [error, setError] = useState('');

  const canEdit = hasPermission('menus.create');

  const createMutation = useMutation({
    mutationFn: () =>
      packagesApi.create(currentCompanyId, {
        ...form,
        price: Number(form.price) || 0,
        min_guests: Number(form.min_guests) || 0,
        items: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_PKG_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New package'}
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="card grid gap-3 p-5 sm:grid-cols-2"
        >
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Pricing</label>
            <select className="input" value={form.pricing_type} onChange={(e) => setForm({ ...form, pricing_type: e.target.value })}>
              <option value="per_guest">Per guest</option>
              <option value="flat">Flat rate</option>
            </select>
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input
              type="number"
              required
              min={0}
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Minimum guests</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.min_guests}
              onChange={(e) => setForm({ ...form, min_guests: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              rows={2}
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createMutation.isPending ? 'Saving…' : 'Save package'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : packages.length === 0 ? (
        <EmptyState title="No packages yet" description="Bundle your menu into priced packages to speed up quotations." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="card p-5">
              <p className="text-base font-semibold text-neutral-900">{pkg.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{pkg.description}</p>
              <p className="mt-3 text-lg font-semibold text-brand-700">
                ₹{pkg.price} {pkg.pricing_type === 'per_guest' ? '/ guest' : 'flat'}
              </p>
              {pkg.min_guests > 0 && <p className="text-xs text-neutral-400">Minimum {pkg.min_guests} guests</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
