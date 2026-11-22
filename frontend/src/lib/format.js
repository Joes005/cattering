export function humanize(value) {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  if (currency === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
}
