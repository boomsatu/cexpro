import { Metadata } from 'next';
import { RiskManagement } from '@/components/RiskManagement';

export const metadata: Metadata = {
  title: 'Risk Management | Admin Panel',
  description: 'Manage risk limits, monitor positions, and handle risk alerts',
};

export default function RiskManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage risk limits, position exposure, and risk alerts
        </p>
      </div>
      <RiskManagement />
    </div>
  );
}