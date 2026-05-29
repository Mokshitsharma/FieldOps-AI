'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { employeesApi, zonesApi } from '../../../lib/api';
import { fmtDate, fmtCurrency } from '../../../lib/utils';
import { PageHeader, Button, Card, Table, Badge, Pagination, Select, SearchInput, Modal, Input, Avatar } from '../../../components/ui';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', password: '', jobType: 'field_officer', designation: '', basicSalary: '', customEmployeeId: '' });

  useEffect(() => { zonesApi.getAll().then(setZones); }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeesApi.getAll({ page, limit: 15, search: search || undefined, jobType: jobType || undefined });
      setEmployees(res.data || []);
      setPagination(res.pagination || {});
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }, [page, search, jobType]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await employeesApi.create({ ...form, basicSalary: Number(form.basicSalary) });
      toast.success(`Employee created! ID: ${result.data?.employeeCode} | Password: ${form.password}`);
      setShowAdd(false);
      setForm({ name: '', phone: '', password: '', jobType: 'field_officer', designation: '', basicSalary: '', customEmployeeId: '' });
      fetchEmployees();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    {
      key: 'name', label: 'Employee',
      render: (r: any) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-800">{r.name}</p>
            <p className="text-xs text-gray-400 font-mono">{r.employeeId}</p>
          </div>
        </div>
      ),
    },
    { key: 'jobType', label: 'Type', render: (r: any) => <Badge status={r.jobType} label={r.jobType === 'field_officer' ? 'Field Officer' : 'Calling Team'} /> },
    { key: 'phone', label: 'Phone', render: (r: any) => <span className="text-sm font-mono">{r.phone}</span> },
    { key: 'designation', label: 'Designation', render: (r: any) => <span className="text-sm text-gray-600">{r.designation || '—'}</span> },
    { key: 'basicSalary', label: 'Salary', render: (r: any) => <span className="text-sm font-medium">{fmtCurrency(r.basicSalary || 0)}</span> },
    { key: 'totalPoints', label: 'Points', render: (r: any) => <span className="text-sm font-bold text-indigo-600">{r.totalPoints || 0} pts</span> },
    { key: 'isActive', label: 'Status', render: (r: any) => <Badge status={r.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions', label: '',
      render: (r: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/employees/${r.id}`)}>View</Button>
          <Button variant={r.isActive ? 'danger' : 'secondary'} size="sm"
            onClick={async () => {
              await employeesApi.toggleStatus(r.id);
              toast.success(`Employee ${r.isActive ? 'deactivated' : 'activated'}`);
              fetchEmployees();
            }}>
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Employees" subtitle={`${pagination.total || 0} total employees`}
        actions={<Button icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Employee</Button>} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} className="w-60" />
          <Select value={jobType} onChange={e => setJobType(e.target.value)}
            options={[{ value: 'field_officer', label: 'Field Officers' }, { value: 'calling_team', label: 'Calling Team' }]}
            placeholder="All Types" className="w-44 text-sm" />
        </div>
        <Table columns={columns} data={employees} loading={loading} />
        <Pagination page={page} totalPages={pagination.totalPages || 1} onPage={setPage} />
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create New Employee" size="md">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            💡 Employee ID will be auto-generated (FO-001 or CT-001) unless you specify one below.
            Share the Employee ID and Password with the employee for app login.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Gopal Sharma" />
            <Input label="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="e.g. 9876543210" />
            <Input label="Password *" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Create a password" />
            <Select label="Job Type *" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}
              options={[{ value: 'field_officer', label: 'Field Officer' }, { value: 'calling_team', label: 'Calling Team' }]} />
            <Input label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior FO" />
            <Input label="Basic Salary (₹)" type="number" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: e.target.value })} placeholder="e.g. 15000" />
            <Input label="Custom Employee ID (optional)" value={form.customEmployeeId} onChange={e => setForm({ ...form, customEmployeeId: e.target.value })} placeholder="e.g. FO-007" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
