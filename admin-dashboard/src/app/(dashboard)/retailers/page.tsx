'use client';
import { PageHeader } from '../../../components/ui';
export default function Page() {
  return (
    <div>
      <PageHeader title="Retailers" subtitle="Manage retailers" />
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
        <p className="text-lg font-medium">Retailers</p>
        <p className="text-sm mt-1">Data loads here</p>
      </div>
    </div>
  );
}
