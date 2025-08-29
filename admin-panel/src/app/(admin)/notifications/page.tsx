import { Metadata } from 'next';
import { NotificationCenter } from '@/components/NotificationCenter';

export const metadata: Metadata = {
  title: 'Notification Center | CEX Admin Panel',
  description: 'Real-time notifications and alert management system',
};

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-muted-foreground">
          Manage real-time notifications, alerts, and communication settings
        </p>
      </div>
      <NotificationCenter />
    </div>
  );
}