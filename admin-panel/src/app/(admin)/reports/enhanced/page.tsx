import { Metadata } from 'next';
import { EnhancedReporting } from '@/components/EnhancedReporting';

export const metadata: Metadata = {
  title: 'Enhanced Reporting | Admin Panel',
  description: 'Advanced reporting system with templates, scheduling, and analytics',
};

export default function EnhancedReportingPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Reporting</h1>
        <p className="text-muted-foreground">
          Manage report templates, schedule automated reports, and analyze reporting metrics
        </p>
      </div>
      <EnhancedReporting />
    </div>
  );
}