import { Metadata } from 'next';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';

export const metadata: Metadata = {
  title: 'Advanced Analytics | CEX Admin Panel',
  description: 'Advanced analytics dashboard with real-time charts, trading volume analysis, and performance metrics',
};

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics dashboard with real-time data visualization and performance metrics
        </p>
      </div>
      <AdvancedAnalytics />
    </div>
  );
}