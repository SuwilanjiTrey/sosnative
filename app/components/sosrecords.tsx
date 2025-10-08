import React, {useEffect, useMemo, useState} from 'react';

/**
 * MyRecordsPage.tsx
 * -----------------
 * Finalized version with Edit removed (per request). The component now:
 * - Matches PDF layout and copy
 * - Shows a reactive "Done" banner (persisted in localStorage)
 * - Lists seeded records (persisted in localStorage)
 * - Lets the user open a record detail modal and mark themselves as safe
 *
 * The "Edit" action was removed entirely because it couldn't be made useful
 * in the current environment; this keeps the UI clean and avoids dead code.
 */

type Status = 'in_progress' | 'resolved' | 'safe';

type Member = { id: string; name: string; phone: string; relation?: string };

type MediaItem = { type: 'photo' | 'audio'; uri: string; filename?: string };

type LocationObj = { label?: string; lat?: number; lng?: number };

export type RecordItem = {
  id: string;
  userId: string;
  circle: string;
  title: string;
  timestamp: string; // ISO
  status: Status;
  location?: LocationObj;
  notifiedMembers?: Member[];
  media?: MediaItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  synced?: boolean;
};

const LOCAL_STORAGE_KEY = 'sos_records_v1';
const BANNER_DISMISS_KEY = 'sos_account_banner_dismissed';

// Seeded records use exact labels from PDF
const seededRecords: RecordItem[] = [
  { id: 'record_1', userId: 'user_202302738', circle: 'Emergency', title: 'Record 1', timestamp: '2024-09-14T11:20:00Z', status: 'in_progress', location: { label: 'Libala Stage 3, Lusaka', lat: -15.3885, lng: 28.3189 }, notifiedMembers: [{ id: 'm1', name: 'Beatrice Kay', phone: '+260 9892737281', relation: 'Sibling' }], media: [], notes: 'Some some text will come here', createdAt: '2024-09-14T11:20:42Z', updatedAt: '2024-09-14T11:25:00Z', synced: true },
  { id: 'record_2', userId: 'user_202302738', circle: 'Friends', title: 'Record 2', timestamp: '2024-09-14T11:20:00Z', status: 'resolved', location: { label: 'Central Park' }, notifiedMembers: [{ id: 'm2', name: 'Boyd Phiri', phone: '+260 9892737281', relation: 'Brother' }], media: [], notes: '', createdAt: '2024-09-14T11:20:42Z', updatedAt: '2024-09-14T11:25:00Z', synced: true },
  { id: 'record_3', userId: 'user_202302738', circle: 'Sibling', title: 'Record 3', timestamp: '2024-09-20T21:50:00Z', status: 'safe', location: { label: 'Chilenje, Lusaka' }, notifiedMembers: [{ id: 'm3', name: 'Samuel Moyo', phone: '+260 9892737281', relation: 'Brother' }], media: [], notes: '', createdAt: '2024-09-20T21:50:30Z', updatedAt: '2024-09-20T22:00:00Z', synced: true },
];

async function apiFetchRecords(userId?: string): Promise<RecordItem[]> {
  // Ensure seeded data exists in localStorage on first run
  if (typeof window !== 'undefined') {
    const local = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!local) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seededRecords));
      return seededRecords;
    }
    try {
      return JSON.parse(local) as RecordItem[];
    } catch (e) {
      // Corrupted local storage: reset
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seededRecords));
      return seededRecords;
    }
  }
  return seededRecords;
}

async function apiPatchRecord(recordId: string, patch: Partial<RecordItem>): Promise<RecordItem> {
  const list = await apiFetchRecords();
  const idx = list.findIndex(r => r.id === recordId);
  if (idx === -1) throw new Error('Record not found');
  const updated: RecordItem = { ...list[idx], ...patch, updatedAt: new Date().toISOString(), synced: false } as RecordItem;
  list[idx] = updated;
  if (typeof window !== 'undefined') window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return updated;
}

// PDF-style date formatting (e.g. "14 Sep, 2024")
function formatDatePdf(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const day = d.getDate();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export default function MyRecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RecordItem | null>(null);

  // Banner state: visible unless user dismissed it (persisted in localStorage)
  const [bannerVisible, setBannerVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = window.localStorage.getItem(BANNER_DISMISS_KEY);
      return v !== 'true';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetchRecords();
      setRecords(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load records', e);
    } finally {
      setLoading(false);
    }
  }

  async function markSafe(r: RecordItem) {
    try {
      const patched = await apiPatchRecord(r.id, { status: 'safe' });
      setRecords(prev => prev.map(p => p.id === patched.id ? patched : p));
      setSelected(patched);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark safe', e);
      alert('Failed to mark safe');
    }
  }

  // Dismiss the account banner and persist dismissed state
  function handleBannerDone() {
    setBannerVisible(false);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(BANNER_DISMISS_KEY, 'true');
    } catch (e) {
      // ignore storage errors
    }
  }

  // Allow user to undo banner dismissal for testing (not shown in PDF but handy)
  function handleBannerReset() {
    setBannerVisible(true);
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(BANNER_DISMISS_KEY);
    } catch (e) {}
  }

  const recordsSorted = useMemo(() => {
    return [...records].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records]);

  return (
    <div className="p-4 max-w-3xl mx-auto font-sans">
      {/* Top bar: phone number + platform title (matches PDF layout) */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">+260 965 502 028</div>
        <div className="text-xs text-gray-500">Your Circle Management Platform</div>
      </div>

      {/* Account banner exactly like PDF - now reactive */}
      {bannerVisible ? (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">
          <div className="text-sm font-semibold">Your account is registered</div>
          <div className="text-xs text-gray-600">Some some text will come here</div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleBannerDone} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Done</button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <div>Account confirmed</div>
          <div>
            <button onClick={handleBannerReset} className="text-xs underline">Show banner</button>
          </div>
        </div>
      )}

      {/* Navigation labels as in PDF (note spelling preserved) */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div>Home</div>
        <div>Settings</div>
        <div>My Cirlce</div>
        <div className="font-semibold">Record</div>
      </div>

      <header className="mb-4">
        <h1 className="text-xl font-bold">My Records</h1>
      </header>

      {/* List */}
      <div className="space-y-2">
        {loading ? <div>Loading...</div> : recordsSorted.map(r => (
          <div key={r.id} onClick={() => setSelected(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(r); }} className="p-3 bg-white rounded shadow-sm border flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-gray-500">{r.circle}</div>
            </div>
            <div className="text-sm text-gray-700">{formatDatePdf(r.timestamp)}</div>
          </div>
        ))}
      </div>

      {/* Footer quick subscribe area from PDF */}
      <div className="mt-6 p-3 border rounded bg-yellow-50 flex items-center justify-between">
        <div className="text-sm">Become a member for extra security</div>
        <div className="text-sm font-semibold">Monthly subscription for K50</div>
      </div>

      {/* Selected detail modal */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-lg rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <div className="text-xs text-gray-500">{formatDatePdf(selected.timestamp)}</div>
              </div>
              <div className="text-sm text-gray-600">{selected.circle}</div>
            </div>

            <div className="mt-4 text-sm text-gray-700">{selected.notes || 'No additional details.'}</div>

            <div className="mt-6 flex justify-end">
              {selected.status !== 'safe' && <button onClick={() => markSafe(selected)} className="px-4 py-2 bg-green-600 text-white rounded mr-2">Mark yourself as Safe</button>}
              <button onClick={() => setSelected(null)} className="px-4 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}