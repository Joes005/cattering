import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import { SkeletonRows } from '../../components/Skeleton';
import {
  SettingsIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.listPlatformSettings,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const updateMutation = useMutation({
    mutationFn: ({ key, value, description }) =>
      adminApi.updatePlatformSetting(key, value, description),
    onSuccess: (updated) => {
      showToast(`Setting "${updated.key}" updated successfully.`);
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
    updateMutation.mutate({ key: setting.key, value: parsedValue, description: setting.description });
  };

  const categories = [
    { id: 'general', label: 'General & Platform' },
    { id: 'billing', label: 'Billing & Subscriptions' },
    { id: 'commission', label: 'Marketplace Commissions' },
    { id: 'security', label: 'Security & Access' },
  ];

  const filteredSettings = (settings || []).filter((s) => {
    if (activeTab === 'general') return !s.key.includes('billing') && !s.key.includes('commission') && !s.key.includes('security');
    return s.key.includes(activeTab);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Global Platform Configuration
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage system-wide operational parameters, default marketplace commission cuts, security toggles, and metadata.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveTab(cat.id);
              setEditingKey(null);
            }}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === cat.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Settings List */}
      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : filteredSettings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center text-xs text-slate-400">
          No configurable settings under this category yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
          {filteredSettings.map((setting) => {
            const isEditing = editingKey === setting.key;

            return (
              <div
                key={setting.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm font-mono">{setting.key}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                      {typeof setting.value}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {setting.description || 'Global configuration parameter.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSave(setting)}
                        disabled={updateMutation.isPending}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs font-mono font-bold text-slate-800">
                        {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                      </span>
                      <button
                        onClick={() => handleStartEdit(setting)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
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
      )}
    </div>
  );
}
