import { Metadata } from 'next';
import KYCManagement from '@/components/KYCManagement';

export const metadata: Metadata = {
  title: 'KYC Management | Admin Dashboard',
  description: 'Manage KYC submissions and user verification process',
};

export default function KYCPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">KYC Management</h2>
      </div>
      <KYCManagement />
    </div>
  );
}