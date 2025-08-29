import { Metadata } from 'next';
import { AuditTrail } from '@/components/AuditTrail';

export const metadata: Metadata = {
  title: 'Audit Trail - CEX Admin Panel',
  description: 'Comprehensive audit trail and activity monitoring for admin actions',
};

export default function AuditPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">
          Monitor and track all administrative activities, security events, and system changes
        </p>
      </div>
      <AuditTrail />
    </div>
  );
}