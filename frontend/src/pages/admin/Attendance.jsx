import { useEffect, useRef, useState } from 'react';
import api, { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import { Button, Input } from '../../components/FormField.jsx';
import { createLatestRequestGuard, memberLookupStatus } from '../../utils/latestRequest.js';

const SCAN_COOLDOWN_MS = 2000;
const MEMBER_CODE_PATTERN = /^M\d+$/i;

export default function Attendance() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const scannerRef = useRef(null);
  const lastScanRef = useRef({ code: null, at: 0 });
  const lookupRequestRef = useRef(createLatestRequestGuard());
  const scannerDivId = 'qr-scanner';
  const searchInputId = 'attendance-member-search';
  const searchStatusId = 'attendance-member-search-status';

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
    const query = search.trim();
    if (!query) {
      lookupRequestRef.current.invalidate();
      setOptions([]);
      setLookupLoading(false);
      setLookupFailed(false);
      return;
    }

    const isCurrent = lookupRequestRef.current.next();
    setOptions([]);
    setLookupLoading(true);
    setLookupFailed(false);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/attendance/member-lookup', { params: { search: query } });
        if (isCurrent()) setOptions(data.members);
      } catch (err) {
        if (isCurrent()) {
          setOptions([]);
          setLookupFailed(true);
          toast.error(apiErrorMessage(err));
        }
      } finally {
        if (isCurrent()) setLookupLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      lookupRequestRef.current.invalidate();
    };
    // toast is provided by a stable context provider for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Manual search-based check-in (unrelated to the camera) keeps using toasts.
  async function checkInFromSearch(payload) {
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

  function nowLabel() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Called from the QR success callback. Never closes or stops the camera —
  // it only records the outcome and, on success, refreshes the list. Every
  // path is wrapped so a scan can never throw past this function.
  async function processScan(decodedText) {
    const code = String(decodedText || '').trim();

    if (!MEMBER_CODE_PATTERN.test(code)) {
      setScanResult({ tone: 'error', title: 'Invalid QR Code', memberLabel: code || null, time: nowLabel() });
      return;
    }

    const now = Date.now();
    if (lastScanRef.current.code === code.toUpperCase() && now - lastScanRef.current.at < SCAN_COOLDOWN_MS) {
      return; // same code seen again within the cooldown window — ignore
    }
    lastScanRef.current = { code: code.toUpperCase(), at: now };

    try {
      const { data } = await api.post('/attendance/check-in', { memberCode: code });
      setScanResult({
        tone: data.expiredWarning ? 'warning' : 'success',
        title: data.expiredWarning ? 'Checked In — Membership Expired' : 'Check-in Successful',
        memberLabel: `${data.member.member_code} — ${data.member.full_name}`,
        time: nowLabel(),
      });
      load();
    } catch (err) {
      const responseData = err.response?.data;
      const member = responseData?.member;
      let title = 'Check-in Failed';
      if (err.response?.status === 404) title = 'Member Not Found';
      else if (responseData?.alreadyCheckedIn) title = 'Already Checked In';
      else if (err.response?.status === 409) title = 'Account Disabled';

      setScanResult({
        tone: responseData?.alreadyCheckedIn ? 'warning' : 'error',
        title,
        memberLabel: member ? `${member.member_code} — ${member.full_name}` : code,
        message: apiErrorMessage(err),
        time: nowLabel(),
      });
    }
  }

  function toggleScanner() {
    setScanResult(null);
    lastScanRef.current = { code: null, at: 0 };
    setScannerOpen((s) => !s);
  }

  const lookupStatus = memberLookupStatus({
    query: search,
    loading: lookupLoading,
    failed: lookupFailed,
    resultCount: options.length,
  });

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
          // Success callback: the camera keeps running after this returns —
          // processScan never stops/unmounts the scanner itself.
          (decodedText) => {
            processScan(decodedText).catch(() => {
              setScanResult({ tone: 'error', title: 'Check-in Failed', message: 'Something went wrong. Please try again.', time: nowLabel() });
            });
          },
          () => {} // fires continuously while no QR is in frame — not an error
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
        <Button variant="secondary" onClick={toggleScanner}>
          {scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {scannerOpen && (
          <div className="mx-auto mb-4 max-w-xs">
            <div id={scannerDivId} className="overflow-hidden rounded-lg" />
            <p className="mt-2 text-center text-xs text-slate-400">Camera stays open — scan the next member anytime.</p>

            {scanResult && (
              <div
                role={scanResult.tone === 'error' ? 'alert' : 'status'}
                className={`mt-3 rounded-lg border p-3 text-sm ${
                  scanResult.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : scanResult.tone === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                <p className="font-semibold">
                  {scanResult.tone === 'success' ? '✅ ' : scanResult.tone === 'warning' ? '⚠️ ' : '❌ '}
                  {scanResult.title}
                </p>
                {scanResult.memberLabel && <p className="mt-0.5">{scanResult.memberLabel}</p>}
                {scanResult.message && <p className="mt-0.5">{scanResult.message}</p>}
                <p className="mt-0.5 text-xs opacity-75">{scanResult.time}</p>
              </div>
            )}
          </div>
        )}
        <label htmlFor={searchInputId} className="mb-2 block text-sm font-medium text-slate-700">
          Search by name, member ID, or phone
        </label>
        <Input
          id={searchInputId}
          placeholder="Start typing…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-describedby={searchStatusId}
          aria-busy={lookupLoading}
          className="max-w-sm"
        />
        <p id={searchStatusId} role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-slate-500">
          {lookupStatus}
        </p>
        {options.length > 0 && (
          <div className="mt-2 max-w-sm divide-y divide-slate-100 rounded-lg border border-slate-200">
            {options.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{m.full_name} <span className="text-slate-400">({m.member_code})</span></span>
                <Button variant="ghost" onClick={() => checkInFromSearch({ memberId: m.id })}>Check In</Button>
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
