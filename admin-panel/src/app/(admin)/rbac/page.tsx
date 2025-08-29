import { Metadata } from 'next';
import { RoleBasedAccessControl } from '@/components/RoleBasedAccess';

export const metadata: Metadata = {
  title: 'Role-Based Access Control | CEX Admin Panel',
  description: 'Manage roles, permissions, and user access control in the CEX platform',
};

export default function RBACPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Role-Based Access Control</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles, permissions, and access control for the CEX platform
        </p>
      </div>
      <RoleBasedAccessControl />
    </div>
  );
}