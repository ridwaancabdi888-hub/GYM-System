import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';

export default function MemberPayments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/member/payments')
      .then(({ data }) => setPayments(data.payments))
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">My Payment History</h1>
      <DataTable
        loading={loading}
        rows={payments}
        emptyTitle="No payments yet"
        columns={[
          { key: 'payment_date', header: 'Date', render: (p) => new Date(p.payment_date).toLocaleDateString() },
          { key: 'amount', header: 'Amount', render: (p) => `$${Number(p.amount).toFixed(2)}` },
          { key: 'method', header: 'Method', render: (p) => <span className="capitalize">{p.method}</span> },
        ]}
      />
    </div>
  );
}
