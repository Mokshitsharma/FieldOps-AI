'use client';
import { useEffect, useState } from 'react';
import { Users, UserCheck, MapPin, Calendar, Receipt, Car, Store, Phone, CreditCard, AlertTriangle } from 'lucide-react';
import { StatCard, Card, PageHeader, PageLoader } from '../../../components/ui';
import { dashboardApi } from '../../../lib/api';
import { fmtCurrency } from '../../../lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Today — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Employees" value={stats?.totalEmployees || 0} icon={Users} color="indigo" />
        <StatCard label="Present Today" value={stats?.activeToday || 0} icon={UserCheck} color="emerald" />
        <StatCard label="On Duty (Field)" value={stats?.onDutyNow || 0} icon={MapPin} color="blue" />
        <StatCard label="Pending Leaves" value={stats?.pendingLeaves || 0} icon={Calendar} color="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Drivers Onboarded" value={stats?.monthDriversOnboarded || 0} sub="This month" icon={Car} color="purple" />
        <StatCard label="Retailers Onboarded" value={stats?.monthRetailersOnboarded || 0} sub="This month" icon={Store} color="cyan" />
        <StatCard label="Total Collections" value={fmtCurrency(stats?.monthTotalPayments || 0)} sub="This month" icon={CreditCard} color="emerald" />
        <StatCard label="Pending Follow-ups" value={stats?.pendingFollowUpCalls || 0} icon={Phone} color="red" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Pending Expenses" value={stats?.pendingExpenses || 0} icon={Receipt} color="amber" />
      </div>
    </div>
  );
}
