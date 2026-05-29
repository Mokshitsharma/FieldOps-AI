'use client';
import { cn } from '../../lib/utils';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

// Badge
export const Badge = ({ status, label, className }: { status: string; label?: string; className?: string }) => {
  const colors: Record<string, string> = {
    new_onboarding: 'bg-green-100 text-green-700',
    visit_followup: 'bg-blue-100 text-blue-700',
    order_generated: 'bg-purple-100 text-purple-700',
    paid: 'bg-emerald-100 text-emerald-700',
    not_paid: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    field_officer: 'bg-indigo-100 text-indigo-700',
    calling_team: 'bg-cyan-100 text-cyan-700',
    urgent: 'bg-red-100 text-red-700',
    general: 'bg-gray-100 text-gray-600',
    announcement: 'bg-blue-100 text-blue-700',
    converted: 'bg-emerald-100 text-emerald-700',
    interested: 'bg-green-100 text-green-700',
    not_interested: 'bg-red-100 text-red-700',
    callback: 'bg-yellow-100 text-yellow-700',
    no_answer: 'bg-gray-100 text-gray-500',
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    critical: 'bg-red-200 text-red-800',
    draft: 'bg-gray-100 text-gray-600',
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-red-100 text-red-700',
    half_day: 'bg-yellow-100 text-yellow-700',
  };
  const color = colors[status] || 'bg-gray-100 text-gray-600';
  const text = label || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', color, className)}>{text}</span>;
};

// Button
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}
export const Button = ({ children, variant = 'primary', size = 'md', loading, icon, className, disabled, ...props }: BtnProps) => {
  const v = { primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm', secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200', danger: 'bg-red-600 text-white hover:bg-red-700', ghost: 'text-gray-600 hover:bg-gray-100', outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50' };
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button className={cn('inline-flex items-center gap-2 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed', v[variant], s[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// Card
export const Card = ({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) => (
  <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100', className)}>
    {title && <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">{title}</h3>{action}</div>}
    {children}
  </div>
);

// Input
export const Input = ({ label, error, wrapperClass, className, ...props }: { label?: string; error?: string; wrapperClass?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={cn('flex flex-col gap-1', wrapperClass)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none transition border-gray-200 bg-white placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100', error && 'border-red-400', className)} {...props} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// Select
export const Select = ({ label, error, options, placeholder, wrapperClass, className, ...props }: { label?: string; error?: string; options: { value: string | number; label: string }[]; placeholder?: string; wrapperClass?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className={cn('flex flex-col gap-1', wrapperClass)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white border-gray-200 focus:border-indigo-400', className)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// Textarea
export const Textarea = ({ label, error, wrapperClass, className, ...props }: { label?: string; error?: string; wrapperClass?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div className={cn('flex flex-col gap-1', wrapperClass)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea rows={3} className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none transition resize-none border-gray-200 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100', className)} {...props} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// Modal
export const Modal = ({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-xl overflow-hidden', sizes[size])}>
        {title && <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">{title}</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button></div>}
        <div className="overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
};

// Table
export const Table = ({ columns, data, loading, emptyText = 'No records found' }: { columns: { key: string; label: string; render?: (row: any) => ReactNode; width?: string }[]; data: any[]; loading?: boolean; emptyText?: string }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead><tr className="border-b border-gray-100">{columns.map(col => <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap', col.width)}>{col.label}</th>)}</tr></thead>
      <tbody>
        {loading ? <tr><td colSpan={columns.length} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" /></td></tr>
          : data.length === 0 ? <tr><td colSpan={columns.length} className="text-center py-12 text-gray-400">{emptyText}</td></tr>
          : data.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
              {columns.map(col => <td key={col.key} className="px-4 py-3 text-gray-700">{col.render ? col.render(row) : row[col.key] ?? '—'}</td>)}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

// Pagination
export const Pagination = ({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i; return <button key={p} onClick={() => onPage(p)} className={cn('px-3 py-1 text-xs rounded-lg font-medium', p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600')}>{p}</button>; })}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
      </div>
    </div>
  );
};

// StatCard
export const StatCard = ({ label, value, sub, icon: Icon, color = 'indigo' }: { label: string; value: string | number; sub?: string; icon?: any; color?: string }) => {
  const colors: Record<string, string> = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-600', cyan: 'bg-cyan-50 text-cyan-600', purple: 'bg-purple-50 text-purple-600' };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
        {Icon && <div className={cn('p-2.5 rounded-xl', colors[color] || colors.indigo)}><Icon className="w-5 h-5" /></div>}
      </div>
    </Card>
  );
};

// Avatar
export const Avatar = ({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  if (src) return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />;
  return <div className={cn('rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center', sizes[size])}>{name[0]?.toUpperCase()}</div>;
};

// SearchInput
export const SearchInput = ({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <div className={cn('relative', className)}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
  </div>
);

// PageHeader
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="flex items-start justify-between mb-6">
    <div><h1 className="text-xl font-bold text-gray-900">{title}</h1>{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

// Spinner
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('animate-spin text-indigo-600 w-6 h-6', className)} />;
export const PageLoader = () => <div className="flex items-center justify-center min-h-[300px]"><Spinner /></div>;
