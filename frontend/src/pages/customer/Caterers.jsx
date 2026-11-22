import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';

export default function CustomerCaterers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedCaterer, setSelectedCaterer] = useState(null);

  const { data: caterers, isLoading } = useQuery({
    queryKey: ['customer-caterers', searchTerm, cityFilter],
    queryFn: () => customerApi.listCaterers(searchTerm, cityFilter),
  });

  const { data: packages } = useQuery({
    queryKey: ['caterer-packages', selectedCaterer?.id],
    queryFn: () => customerApi.getCatererPackages(selectedCaterer.id),
    enabled: !!selectedCaterer,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Explore Catering Partners</h2>
        <p className="text-xs text-neutral-500">
          Discover verified caterers specializing in weddings, corporate dining, and private parties
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            className="input text-xs"
            placeholder="Search by caterer name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <input
            type="text"
            className="input text-xs"
            placeholder="Filter by city (e.g. Chennai)"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Caterers Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !caterers || caterers.length === 0 ? (
        <EmptyState
          title="No catering businesses found"
          description="Try broadening your search term or clearing the city filter."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {caterers.map((c) => (
            <div
              key={c.id}
              className="card p-5 flex flex-col justify-between hover:border-brand-300 transition shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-neutral-900 leading-tight">{c.name}</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                    Verified
                  </span>
                </div>
                <p className="text-xs font-medium text-brand-700 mt-0.5">{c.business_type || 'Catering Services'}</p>
                <p className="text-xs text-neutral-500 mt-2 line-clamp-3">
                  {c.description || 'Specializing in authentic regional banquets, buffet spreads, and bespoke celebration menus.'}
                </p>

                {c.business_address && (
                  <p className="text-[11px] text-neutral-400 mt-3 flex items-center gap-1">
                    <span>📍</span>
                    <span className="truncate">{c.business_address}</span>
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-100 mt-4 flex items-center gap-2">
                <button
                  onClick={() => setSelectedCaterer(c)}
                  className="flex-1 rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  View Packages
                </button>
                <Link
                  to={`/customer/book?caterer_id=${c.id}&caterer_name=${encodeURIComponent(c.name)}`}
                  className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white hover:bg-brand-700 transition shadow-xs"
                >
                  Book Caterer
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Packages Preview Modal */}
      {selectedCaterer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-base text-neutral-900">{selectedCaterer.name}</h3>
                <p className="text-xs text-neutral-500">Catering Packages & Pricing</p>
              </div>
              <button
                onClick={() => setSelectedCaterer(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {!packages || packages.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  This caterer provides custom-tailored quotations based on your event guest count and menu selections.
                </p>
              ) : (
                packages.map((pkg) => (
                  <div key={pkg.id} className="rounded-xl border border-neutral-200 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-neutral-900">{pkg.name}</h4>
                      <span className="font-extrabold text-xs text-emerald-700">
                        ₹{pkg.price?.toLocaleString()} {pkg.pricing_type === 'per_guest' ? '/ guest' : 'flat'}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-neutral-500">{pkg.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCaterer(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Close
              </button>
              <Link
                to={`/customer/book?caterer_id=${selectedCaterer.id}&caterer_name=${encodeURIComponent(selectedCaterer.name)}`}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Request Proposal →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

