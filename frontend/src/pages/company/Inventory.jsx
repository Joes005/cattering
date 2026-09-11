import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../api/misc';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { name: '', category: '', unit: '', stock_qty: '', min_stock: '' };

export default function CompanyInventory() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', currentCompanyId],
    queryFn: () => inventoryApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [restockAmounts, setRestockAmounts] = useState({});

  const canEdit = hasPermission('inventory.update');

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryApi.create(currentCompanyId, {
        ...form,
        stock_qty: Number(form.stock_qty) || 0,
        min_stock: Number(form.min_stock) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const restockMutation = useMutation({
    mutationFn: ({ itemId, qty }) => inventoryApi.recordTransaction(currentCompanyId, itemId, { change_qty: qty, type: 'purchase' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', currentCompanyId] }),
  });

  const lowStockCount = (items || []).filter((i) => i.is_low_stock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Inventory</h2>
          {lowStockCount > 0 && (
            <p className="text-sm text-amber-600">⚠ {lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on stock</p>
          )}
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New item'}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="card grid gap-3 p-5 sm:grid-cols-2"
        >
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label className="label">Unit</label>
            <input required placeholder="kg, pcs, litres…" className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <label className="label">Starting stock</label>
            <input type="number" min={0} className="input" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
          </div>
          <div>
            <label className="label">Minimum stock (low-stock alert)</label>
            <input type="number" min={0} className="input" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createMutation.isPending ? 'Saving…' : 'Save item'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="No inventory items yet" description="Track ingredients, equipment and consumables here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {item.name} {item.is_low_stock && <span className="ml-1 text-amber-600">⚠ low stock</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {item.stock_qty} {item.unit} in stock · min {item.min_stock} {item.unit}
                  {item.category ? ` · ${item.category}` : ''}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="+ qty"
                    className="input w-24 text-xs"
                    value={restockAmounts[item.id] || ''}
                    onChange={(e) => setRestockAmounts({ ...restockAmounts, [item.id]: e.target.value })}
                  />
                  <button
                    className="btn-secondary text-xs"
                    disabled={!restockAmounts[item.id] || restockMutation.isPending}
                    onClick={() => {
                      restockMutation.mutate({ itemId: item.id, qty: Number(restockAmounts[item.id]) });
                      setRestockAmounts({ ...restockAmounts, [item.id]: '' });
                    }}
                  >
                    Restock
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
