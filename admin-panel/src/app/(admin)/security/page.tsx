import { Metadata } from 'next';
import { SecurityManagement } from '@/components/SecurityManagement';

export const metadata: Metadata = {
  title: 'Security Management | Admin Panel',
  description: 'Manage user security, 2FA settings, and security policies',
};

export default function SecurityManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Security Management</h1>
        <p className="text-muted-foreground">
          Manage user security settings, two-factor authentication, and security policies
        </p>
      </div>
      <SecurityManagement />
    </div>
  );
}