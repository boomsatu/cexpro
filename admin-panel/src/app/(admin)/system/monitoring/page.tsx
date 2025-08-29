import { Metadata } from 'next';
import SystemMonitoring from '@/components/SystemMonitoring';

export const metadata: Metadata = {
  title: 'System Monitoring | CEX Admin Panel',
  description: 'Comprehensive system monitoring dashboard with server health, database performance, and system alerts',
};

export default function SystemMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor system health, server performance, database metrics, and manage alerts in real-time
        </p>
      </div>
      <SystemMonitoring />
    </div>
  );
}