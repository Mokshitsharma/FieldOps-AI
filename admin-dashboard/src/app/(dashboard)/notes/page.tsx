'use client';
import { useEffect, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { notesApi, employeesApi } from '../../../lib/api';
import { fmtDateTime } from '../../../lib/utils';
import { PageHeader, Card, Button, Modal, Input, Textarea, PageLoader, Avatar } from '../../../components/ui';
import toast from 'react-hot-toast';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', recipientIds: [] as number[] });

  useEffect(() => {
    employeesApi.getAll({ limit: 100 }).then(r => setEmployees(r.data || []));
    fetchNotes();
  }, []);

  const fetchNotes = () => {
    setLoading(true);
    notesApi.getAll().then(r => setNotes(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.recipientIds.length === 0) { toast.error('Select at least one recipient'); return; }
    setSaving(true);
    try {
      await notesApi.send(form);
      toast.success(`Note sent to ${form.recipientIds.length} employee(s)`);
      setShowAdd(false);
      setForm({ title: '', content: '', recipientIds: [] });
      fetchNotes();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleReply = async (noteId: number) => {
    if (!reply.trim()) return;
    try {
      await notesApi.reply(noteId, reply);
      toast.success('Reply sent');
      setReply('');
      fetchNotes();
      const updated = notes.find(n => n.id === noteId);
      if (updated) setSelectedNote({ ...updated, NoteReplies: [...(updated.NoteReplies || []), { senderRole: 'admin', senderName: 'Admin', content: reply, createdAt: new Date().toISOString() }] });
    } catch { toast.error('Failed'); }
  };

  const toggleRecipient = (empId: number) => {
    setForm(f => ({
      ...f,
      recipientIds: f.recipientIds.includes(empId) ? f.recipientIds.filter(id => id !== empId) : [...f.recipientIds, empId],
    }));
  };

  return (
    <div>
      <PageHeader title="Notes" subtitle="Private notes to selected employees. Employees can reply."
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Send Note</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Notes list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? <PageLoader /> : notes.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-sm text-gray-400">No notes sent yet</p></Card>
          ) : notes.map(note => (
            <div key={note.id} onClick={() => setSelectedNote(note)}
              className={`cursor-pointer rounded-xl border p-4 transition ${selectedNote?.id === note.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <p className="text-sm font-semibold text-gray-800 truncate">{note.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{note.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{note.NoteRecipients?.length || 0} recipients</span>
                <span className="text-xs text-gray-400">{fmtDateTime(note.createdAt)}</span>
              </div>
              {note.NoteReplies?.length > 0 && <span className="text-xs text-indigo-500 font-medium">{note.NoteReplies.length} repl{note.NoteReplies.length === 1 ? 'y' : 'ies'}</span>}
            </div>
          ))}
        </div>

        {/* Thread view */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <Card className="p-5 h-full flex flex-col">
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800">{selectedNote.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedNote.content}</p>
                <p className="text-xs text-gray-400 mt-2">Recipients: {selectedNote.NoteRecipients?.map((r: any) => r.Employee?.name || r.employeeId).join(', ')}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {selectedNote.NoteReplies?.map((r: any, i: number) => (
                  <div key={i} className={`flex gap-2 ${r.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold flex-shrink-0">{r.senderName[0]}</div>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${r.senderRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p>{r.content}</p>
                      <p className={`text-xs mt-1 ${r.senderRole === 'admin' ? 'text-indigo-200' : 'text-gray-400'}`}>{fmtDateTime(r.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  onKeyDown={e => e.key === 'Enter' && handleReply(selectedNote.id)} />
                <Button icon={<Send className="w-4 h-4" />} onClick={() => handleReply(selectedNote.id)} disabled={!reply.trim()}>Send</Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center h-full flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a note to view the thread</p>
            </Card>
          )}
        </div>
      </div>

      {/* Send Note Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Send Note to Employee(s)" size="lg">
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <Input label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Message *" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select Recipients * ({form.recipientIds.length} selected)</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {employees.map((emp: any) => (
                <label key={emp.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${form.recipientIds.includes(emp.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={form.recipientIds.includes(emp.id)} onChange={() => toggleRecipient(emp.id)} className="rounded" />
                  <Avatar name={emp.name} size="sm" />
                  <div className="min-w-0"><p className="text-xs font-medium truncate">{emp.name}</p><p className="text-xs text-gray-400">{emp.employeeId}</p></div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving} icon={<Send className="w-4 h-4" />}>Send Note</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
