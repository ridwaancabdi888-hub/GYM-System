import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({ caption, columns, rows, loading, emptyTitle = 'No records found', keyField = 'id' }) {
  if (loading) return <LoadingSpinner />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <div
      role="region"
      aria-label={`${caption}, scrollable table`}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row[keyField]} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
