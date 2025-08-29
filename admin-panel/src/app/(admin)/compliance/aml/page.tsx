import { Metadata } from 'next';
import AMLMonitoring from '@/components/AMLMonitoring';

export const metadata: Metadata = {
  title: 'AML Monitoring | Admin Dashboard',
  description: 'Anti-Money Laundering monitoring and suspicious transaction detection',
};

export default function AMLPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AML Monitoring</h2>
      </div>
      <AMLMonitoring />
    </div>
  );
}