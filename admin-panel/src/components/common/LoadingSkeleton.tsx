'use client';

import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  height = 'h-4', 
  width = 'w-full' 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${height} ${width} ${className}`}
      aria-label="Loading..."
    />
  );
};

export default LoadingSkeleton;

// Dashboard specific skeleton components
export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <LoadingSkeleton height="h-6" width="w-24" />
      <LoadingSkeleton height="h-8" width="w-8" className="rounded-full" />
    </div>
    <LoadingSkeleton height="h-8" width="w-16" className="mb-2" />
    <LoadingSkeleton height="h-4" width="w-32" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <tr className="border-b border-gray-200 dark:border-gray-700">
    <td className="px-6 py-4"><LoadingSkeleton height="h-4" width="w-20" /></td>
    <td className="px-6 py-4"><LoadingSkeleton height="h-4" width="w-32" /></td>
    <td className="px-6 py-4"><LoadingSkeleton height="h-4" width="w-24" /></td>
    <td className="px-6 py-4"><LoadingSkeleton height="h-4" width="w-16" /></td>
  </tr>
);

export const ActivityItemSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3 p-3 border-b border-gray-100 dark:border-gray-700">
    <LoadingSkeleton height="h-10" width="w-10" className="rounded-full" />
    <div className="flex-1">
      <LoadingSkeleton height="h-4" width="w-48" className="mb-2" />
      <LoadingSkeleton height="h-3" width="w-32" />
    </div>
    <LoadingSkeleton height="h-6" width="w-16" className="rounded-full" />
  </div>
);