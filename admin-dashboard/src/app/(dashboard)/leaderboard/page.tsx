'use client';
import { useEffect, useState } from 'react';
import { Trophy, Star, Zap } from 'lucide-react';
import { leaderboardApi, employeesApi } from '../../../lib/api';
import { currentMonth, currentYear, monthOptions, yearOptions } from '../../../lib/utils';
import { PageHeader, Card, Button, Select, Modal, Textarea, Input, Avatar, PageLoader, Badge } from '../../../components/ui';
import toast from 'react-hot-toast';

export default function LeaderboardPage() {
  const [view, setView] = useState<'company' | 'role'>('company');
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ employeeId: '', category: 'company', bonusAmount: '' });
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => { employeesApi.getAll({ limit: 100 }).then(r => setEmployees(r.data || [])); }, []);

  useEffect(() => {
    setLoading(true);
    leaderboardApi.get({ month, year, view }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [month, year, view]);

  const getRecommendation = async () => {
    setRecLoading(true);
    try {
      const rec = await leaderboardApi.getRecommendation(month, year);
      setRecommendation(rec);
    } catch { toast.error('Failed to get AI recommendation'); }
    finally { setRecLoading(false); }
  };

  const handleConfirm = async () => {
    try {
      await leaderboardApi.confirmWinner({
        employeeId: confirmForm.employeeId,
        month, year,
        category: confirmForm.category,
        bonusAmount: Number(confirmForm.bonusAmount) || 0,
        aiExplanation: recommendation?.aiExplanation || '',
      });
      toast.success('Employee of the Month announced! 🎉 All employees notified.');
      setConfirmOpen(false);
      setRecommendation(null);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const LeaderboardTable = ({ entries, title }: { entries: any[]; title: string }) => (
    <Card title={title} className="overflow-hidden">
      <div className="divide-y divide-gray-50">
        {entries.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No data for this period</p>}
        {entries.slice(0, 10).map((e: any) => (
          <div key={e.employeeId} className={`flex items-center gap-3 px-5 py-3 ${e.rank === 1 ? 'bg-amber-50' : e.rank === 2 ? 'bg-gray-50' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${e.rank === 1 ? 'bg-amber-400 text-white' : e.rank === 2 ? 'bg-gray-300 text-gray-700' : e.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
            </div>
            <Avatar name={e.name || 'E'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{e.name}</p>
              <p className="text-xs text-gray-400">{e.employeeCode} · {e.jobType === 'field_officer' ? 'Field Officer' : 'Calling Team'}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-indigo-600">{e.totalPoints}</p>
              <p className="text-xs text-gray-400">pts</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle="Points-based employee ranking"
        actions={
          <div className="flex gap-2">
            <Select value={month} onChange={e => setMonth(Number(e.target.value))} options={monthOptions} className="w-36" />
            <Select value={year} onChange={e => setYear(Number(e.target.value))} options={yearOptions} className="w-28" />
            <Button icon={<Zap className="w-4 h-4" />} loading={recLoading} onClick={getRecommendation}>AI Pick</Button>
            <Button variant="outline" icon={<Trophy className="w-4 h-4" />} onClick={() => setConfirmOpen(true)}>Announce Winner</Button>
          </div>
        }
      />

      {/* View toggle */}
      <div className="flex gap-2 mb-5">
        {(['company', 'role'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${view === v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {v === 'company' ? '🏢 Company Wide' : '👥 By Role'}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {view === 'company' ? (
            <div className="lg:col-span-2">
              <LeaderboardTable entries={data?.leaderboard || []} title="🏆 Company Leaderboard" />
            </div>
          ) : (
            <>
              <LeaderboardTable entries={data?.fieldOfficers || []} title="🚗 Field Officers" />
              <LeaderboardTable entries={data?.callingTeam || []} title="📞 Calling Team" />
            </>
          )}
        </div>
      )}

      {/* AI Recommendation */}
      {recommendation && (
        <Card className="mt-5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-800">AI Recommendation</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: '🏢 Company Wide', emp: recommendation.recommendations?.companyWide?.employee },
              { label: '🚗 Field Officer', emp: recommendation.recommendations?.fieldOfficer?.employee },
              { label: '📞 Calling Team', emp: recommendation.recommendations?.callingTeam?.employee },
            ].map(({ label, emp }) => emp && (
              <div key={label} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-2">{label}</p>
                <div className="flex items-center gap-2">
                  <Avatar name={emp.name || 'E'} size="sm" />
                  <div><p className="text-sm font-bold text-gray-800">{emp.name}</p><p className="text-xs text-gray-500">{emp.totalPoints} pts</p></div>
                </div>
              </div>
            ))}
          </div>
          {recommendation.aiExplanation && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line">{recommendation.aiExplanation}</div>
          )}
        </Card>
      )}

      {/* Confirm Winner Modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Announce Employee of the Month" size="md">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Select the winner and announce to all employees. They will receive a notification.</p>
          <select value={confirmForm.employeeId} onChange={e => setConfirmForm({ ...confirmForm, employeeId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-indigo-400">
            <option value="">Select employee *</option>
            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employeeId}) — {e.jobType === 'field_officer' ? 'FO' : 'CT'}</option>)}
          </select>
          <Select label="Category" value={confirmForm.category} onChange={e => setConfirmForm({ ...confirmForm, category: e.target.value })}
            options={[{ value: 'company', label: 'Company Wide' }, { value: 'field_officer', label: 'Field Officer' }, { value: 'calling_team', label: 'Calling Team' }]} />
          <Input label="Bonus Amount (₹, optional)" type="number" value={confirmForm.bonusAmount} onChange={e => setConfirmForm({ ...confirmForm, bonusAmount: e.target.value })} placeholder="e.g. 2000" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={!confirmForm.employeeId} onClick={handleConfirm} icon={<Trophy className="w-4 h-4" />}>Announce Winner 🎉</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
