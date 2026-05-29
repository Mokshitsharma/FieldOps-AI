'use client';
import { useEffect, useState } from 'react';
import { Plus, Bell } from 'lucide-react';
import { noticesApi } from '../../../lib/api';
import { fmtDateTime } from '../../../lib/utils';
import { PageHeader, Card, Button, Table, Badge, Modal, Input, Textarea, Select, PageLoader } from '../../../components/ui';
import toast from 'react-hot-toast';

export default function NoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'general' });

  const fetchNotices = () => {
    setLoading(true);
    noticesApi.getAll({ includeExpired: true }).then(r => setNotices(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await noticesApi.create(form);
      toast.success('Notice posted to all employees');
      setShowAdd(false);
      setForm({ title: '', content: '', priority: 'general' });
      fetchNotices();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await noticesApi.delete(id);
    toast.success('Notice removed');
    fetchNotices();
  };

  const columns = [
    { key: 'priority', label: 'Priority', render: (r: any) => <Badge status={r.priority} /> },
    { key: 'title', label: 'Title', render: (r: any) => <p className="text-sm font-medium">{r.title}</p> },
    { key: 'content', label: 'Content', render: (r: any) => <p className="text-sm text-gray-500 max-w-xs truncate">{r.content}</p> },
    { key: 'expiresAt', label: 'Expires', render: (r: any) => <span className="text-xs text-gray-500">{fmtDateTime(r.expiresAt)}</span> },
    { key: 'isActive', label: 'Status', render: (r: any) => <Badge status={r.isActive ? 'active' : 'inactive'} label={r.isActive ? 'Active' : 'Removed'} /> },
    { key: 'actions', label: '', render: (r: any) => r.isActive ? <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Remove</Button> : null },
  ];

  return (
    <div>
      <PageHeader title="Notices" subtitle="Broadcast to all employees. Auto-expire after 30 days."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Post Notice</Button>} />

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : <Table columns={columns} data={notices} emptyText="No notices posted yet" />}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Post Notice to All Employees" size="md">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <Select label="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
            options={[{ value: 'general', label: '📢 General' }, { value: 'announcement', label: '📣 Announcement' }, { value: 'urgent', label: '🚨 Urgent' }]} />
          <Input label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Office closed on Sunday" />
          <Textarea label="Content *" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4} placeholder="Full notice content..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving} icon={<Bell className="w-4 h-4" />}>Post to All Employees</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
