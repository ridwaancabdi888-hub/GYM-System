const STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  green: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
  red: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-200 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
  gray: 'bg-slate-200 text-slate-600',
  trial: 'bg-amber-100 text-amber-700',
  amber: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-200 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-700',
  partially_paid: 'bg-blue-100 text-blue-700',
};

export default function Badge({ children, tone }) {
  const key = (tone || String(children)).toLowerCase();
  const cls = STYLES[key] || 'bg-slate-200 text-slate-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {children}
    </span>
  );
}
