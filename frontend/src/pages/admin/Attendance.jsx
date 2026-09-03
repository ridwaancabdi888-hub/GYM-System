import { useEffect, useRef, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Button, Input } from '../../components/FormField.jsx';

export default function Attendance() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef(null);
  const scannerDivId = 'qr-scanner';

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance', { params: { date: new Date().toISOString().slice(0, 10) } });
      setRecords(data.attendance);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!search) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api.get('/attendance/member-lookup', { params: { search } }).then(({ data }) => setOptions(data.members));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function checkIn(payload) {
    try {
      const { data } = await api.post('/attendance/check-in', payload);
      toast.success(`${data.member.full_name} checked in`);
      if (data.expiredWarning) {
        toast.error(`Warning: ${data.member.full_name}'s membership has expired`);
      }
      setSearch('');
      setOptions([]);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    if (!scannerOpen) return;
    let html5QrCode;
    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      html5QrCode = new Html5Qrcode(scannerDivId);
      scannerRef.current = html5QrCode;
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          async (decodedText) => {
            await html5QrCode.stop().catch(() => {});
            setScannerOpen(false);
            checkIn({ memberCode: decodedText });
          },
          () => {}
        )
        .catch(() => {
          toast.error('Could not access camera. Try manual search instead.');
          setScannerOpen(false);
        });
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500">Check members in and review today's visits.</p>
        </div>
        <Button variant="secondary" onClick={() => setScannerOpen((s) => !s)}>
          {scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {scannerOpen && <div id={scannerDivId} className="mx-auto mb-4 max-w-xs overflow-hidden rounded-lg" />}
        <p className="mb-2 text-sm font-medium text-slate-700">Search by name, member ID, or phone</p>
        <Input placeholder="Start typing…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        {options.length > 0 && (
          <div className="mt-2 max-w-sm divide-y divide-slate-100 rounded-lg border border-slate-200">
            {options.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{m.full_name} <span className="text-slate-400">({m.member_code})</span></span>
                <Button variant="ghost" onClick={() => checkIn({ memberId: m.id })}>Check In</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-800">Today's Check-ins</h2>
      <DataTable
        loading={loading}
        rows={records}
        emptyTitle="No check-ins yet today"
        columns={[
          { key: 'check_in_time', header: 'Time', render: (r) => r.check_in_time?.slice(0, 5) },
          { key: 'member', header: 'Member', render: (r) => `${r.members?.full_name} (${r.members?.member_code})` },
          { key: 'recorded_by', header: 'Recorded By', render: (r) => r.users?.full_name || '—' },
        ]}
      />
    </div>
  );
}
