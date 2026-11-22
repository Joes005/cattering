import { useState, useEffect } from 'react';
import { customerApi } from '../../api/customerApi';
import { Link } from 'react-router-dom';

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState({ open: false, invoice: null });
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'card', reference_note: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await customerApi.getInvoices();
      setInvoices(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
  const totalBalance = Math.max(0, totalInvoiced - totalPaid);

  const openPayModal = (inv) => {
    const remaining = Math.max(0, Number(inv.total_amount || 0) - Number(inv.amount_paid || 0));
    setPayForm({
      amount: remaining > 0 ? remaining.toString() : '0',
      payment_method: 'card',
      reference_note: 'Online milestone settlement'
    });
    setPayError('');
    setPayModal({ open: true, invoice: inv });
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payModal.invoice) return;
    setPaying(true);
    setPayError('');
    try {
      await customerApi.payInvoice(payModal.invoice.id, {
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference_note: payForm.reference_note
      });
      setPayModal({ open: false, invoice: null });
      await loadInvoices();
    } catch (err) {
      setPayError(err.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">Review catering invoices, view payment histories, and pay balances.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-xl">
            💵
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xl">
            ✅
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Paid</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl text-xl">
            ⏱️
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance Remaining</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Invoices</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{invoices.length} total</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading billing records...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-2">💳</span>
            <h3 className="text-base font-semibold text-gray-800">No invoices yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">When caterers confirm your event bookings and issue milestone invoices, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const total = Number(inv.total_amount || 0);
              const paid = Number(inv.amount_paid || 0);
              const balance = Math.max(0, total - paid);
              const isPaid = inv.status === 'paid' || balance <= 0;

              return (
                <div key={inv.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-gray-900">{inv.invoice_number || `INV-${inv.id}`}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColor(inv.status)}`}>
                        {inv.status ? inv.status.toUpperCase() : 'PENDING'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      {inv.due_date && (
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          Due: {new Date(inv.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {inv.event_id && (
                        <Link to={`/customer/events/${inv.event_id}`} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                          View Event #{inv.event_id} →
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-0 border-gray-100">
                    <div className="text-left md:text-right">
                      <p className="text-sm font-bold text-gray-900">${total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {isPaid ? (
                          <span className="text-emerald-600 font-medium">Fully settled</span>
                        ) : (
                          <span>Due: <strong className="text-amber-600">${balance.toFixed(2)}</strong></span>
                        )}
                      </p>
                    </div>

                    <div>
                      {!isPaid && (
                        <button
                          onClick={() => openPayModal(inv)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center gap-1.5"
                        >
                          <span>💳</span>
                          Pay Balance
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal.open && payModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-gray-900">Pay Catering Invoice</h3>
                <p className="text-xs text-gray-500">{payModal.invoice.invoice_number || `INV-${payModal.invoice.id}`}</p>
              </div>
              <button
                onClick={() => setPayModal({ open: false, invoice: null })}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePay} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank Transfer (ACH / Wire)</option>
                  <option value="upi">UPI / Instant Transfer</option>
                  <option value="check">Digital Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Card ending 4242 or memo"
                  value={payForm.reference_note}
                  onChange={(e) => setPayForm({ ...payForm, reference_note: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayModal({ open: false, invoice: null })}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {paying ? 'Processing...' : 'Authorize & Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
