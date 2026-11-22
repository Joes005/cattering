import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import { SkeletonRows } from '../../components/Skeleton';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.listPlatformSettings,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => adminApi.updatePlatformSetting(key, value),
    onSuccess: () => {
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
  });

  const handleStartEdit = (setting) => {
    setEditingKey(setting.key);
    setEditValue(typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value));
  };

  const handleSave = (setting) => {
    let parsedValue = editValue;
    try {
      parsedValue = JSON.parse(editValue);
    } catch {
      // Keep as string if not valid JSON
    }
    updateMutation.mutate({ key: setting.key, value: parsedValue });
  };

  // Group settings by category
  const categories = ['general', 'billing', 'commission', 'security'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Platform Global Settings & Parameters</h2>
        <p className="text-xs text-neutral-500">
          Govern system-wide tax percentages, platform commission baselines, currency standards, and security gates
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catSettings = (settings || []).filter((s) => (s.category || 'general') === cat);
            if (catSettings.length === 0) return null;

            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">{cat} Configuration</h3>
                <div className="card divide-y divide-neutral-100">
                  {catSettings.map((s) => {
                    const isEditing = editingKey === s.key;

                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                        <div className="space-y-0.5 max-w-lg">
                          <p className="font-mono text-xs font-semibold text-neutral-900">{s.key}</p>
                          <p className="text-xs text-neutral-500">{s.description || 'Global configuration parameter'}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="rounded-lg border border-brand-500 px-3 py-1.5 font-mono text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => handleSave(s)}
                                disabled={updateMutation.isPending}
                                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="rounded-md bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold text-neutral-800">
                                {typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)}
                              </span>
                              <button
                                onClick={() => handleStartEdit(s)}
                                className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

