import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const fmtDate = (d: string | Date) => { try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'); } catch { return '—'; } };
export const fmtDateTime = (d: string | Date) => { try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy, hh:mm a'); } catch { return '—'; } };
export const fmtCurrency = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const currentMonth = new Date().getMonth() + 1;
export const currentYear = new Date().getFullYear();
export const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i), 'MMMM') }));
export const yearOptions = [currentYear, currentYear - 1].map(y => ({ value: y, label: String(y) }));
export const getErr = (err: any) => err?.response?.data?.message || err?.message || 'Something went wrong';
