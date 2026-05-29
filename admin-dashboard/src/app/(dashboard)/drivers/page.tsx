'use client';
import { useEffect, useState, useCallback } from 'react';
import { driversApi, zonesApi, employeesApi } from '../../../lib/api';
import { fmtDateTime } from '../../../lib/utils';
import { PageHeader, Card, Table, Badge, Pagination, Select, SearchInput, Button, StatCard, PageLoader } from '../../../components/ui';
import { Car, CheckCircle, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriversPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [page, setPage] = useState(1);
  const [entryType, setEntryType] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  useEffect(() => { zonesApi.getAll().then(setZones); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        driversApi.getAll({ page, limit: 20, entryType: entryType || undefined, zoneId: zoneId || undefined, search: search || undefined }),
        driversApi.getStats({ month: m, year: y }),
      ]);
      setEntries(res.data || []);
      setPagination(res.pagination || {});
      setStats(s);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [page, entryType, zoneId, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: 'driverName', label: 'Driver', render: (r: any) => <div><p className="text-sm font-medium">{r.driverName}</p><p className="text-xs text-gray-400 font-mono">{r.driverPhone}</p></div> },
    { key: 'vehicleType', label: 'Vehicle', render: (r: any) => <span className="text-sm">{r.vehicleType}</span> },
    { key: 'entryType', label: 'Type', render: (r: any) => <Badge status={r.entryType} label={r.entryType === 'new_onboarding' ? 'New Onboarding' : 'Follow-up'} /> },
    { key: 'paymentStatus', label: 'Payment', render: (r: any) => <Badge status={r.paymentStatus} label={r.paymentStatus === 'paid' ? `✓ Paid ₹${r.paymentAmount}` : 'Not Paid'} /> },
    { key: 'preferredZones', label: 'Preferred Zones', render: (r: any) => { try { const z = JSON.parse(r.preferredZones || '[]'); return <span className="text-xs text-gray-500">{Array.isArray(z) ? z.join(', ') : z}</span>; } catch { return <span className="text-xs text-gray-500">{r.preferredZones}</span>; } } },
    { key: 'Zone', label: 'Zone', render: (r: any) => <span className="text-sm">{r.Zone?.name || '—'}</span> },
    { key: 'Employee', label: 'By', render: (r: any) => <span className="text-sm">{r.Employee?.name || '—'}</span> },
    { key: 'isPassedToCalling', label: 'Calling', render: (r: any) => r.isPassedToCalling ? <span className="text-xs text-emerald-600 font-medium">✓ Passed</span> : <Button size="sm" variant="outline" onClick={async () => { await driversApi.passToCalling(r.id); toast.success('Passed to calling team'); fetchData(); }}>Pass to CT</Button> },
    { key: 'createdAt', label: 'Date', render: (r: any) => <span className="text-xs text-gray-500">{fmtDateTime(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Driver Database" subtitle="All driver onboardings and follow-up visits" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="New Onboardings" value={stats?.totalNewOnboardings || 0} sub="This month" icon={Car} color="indigo" />
        <StatCard label="Follow-up Visits" value={stats?.totalFollowUpVisits || 0} sub="This month" icon={Users} color="blue" />
        <StatCard label="Payments Done" value={stats?.totalPaid || 0} sub="This month" icon={CheckCircle} color="emerald" />
        <StatCard label="Pending Payment" value={stats?.totalPendingPayment || 0} sub="New onboardings" icon={Clock} color="amber" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} className="w-60" placeholder="Search driver name or phone..." />
          <Select value={entryType} onChange={e => setEntryType(e.target.value)}
            options={[{ value: 'new_onboarding', label: 'New Onboarding' }, { value: 'visit_followup', label: 'Follow-up Visit' }]}
            placeholder="All Types" className="w-44 text-sm" />
          <Select value={zoneId} onChange={e => setZoneId(e.target.value)}
            options={zones.map(z => ({ value: z.id, label: z.name }))}
            placeholder="All Zones" className="w-44 text-sm" />
        </div>
        {loading ? <PageLoader /> : <Table columns={columns} data={entries} />}
        <Pagination page={page} totalPages={pagination.totalPages || 1} onPage={setPage} />
      </Card>
    </div>
  );
}
