'use client';

import { Bell, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { useDrift } from '@/hooks/use-drift';
import { useRuns } from '@/hooks/use-runs';
import { useState } from 'react';

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { drift } = useDrift();
  const { runs } = useRuns(10);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.generateRun();
      window.location.reload();
    } catch (error) {
      console.error('Failed to generate run:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Build notifications from drift status and recent runs
  const notifications: Array<{
    id: string;
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    description: string;
  }> = [];

  if (drift) {
    if (drift.overallStatus === 'critical') {
      notifications.push({
        id: 'drift-critical',
        type: 'error',
        title: 'Critical Drift Detected',
        description: `${drift.driftedFeatures.length} features have drifted. Model retraining recommended.`,
      });
    } else if (drift.overallStatus === 'warning') {
      notifications.push({
        id: 'drift-warning',
        type: 'warning',
        title: 'Drift Warning',
        description: `Minor drift detected in ${drift.driftedFeatures.length} features.`,
      });
    }
  }

  // Check for recent defects
  const recentDefects = runs.filter((r) => r.qualityMetrics?.defectFlag);
  if (recentDefects.length > 0) {
    notifications.push({
      id: 'defects',
      type: 'warning',
      title: 'Recent Defects',
      description: `${recentDefects.length} defects detected in recent runs.`,
    });
  }

  // Add a success message if everything is good
  if (notifications.length === 0 && drift && runs.length > 0) {
    notifications.push({
      id: 'all-good',
      type: 'success',
      title: 'System Healthy',
      description: 'All systems operational. No issues detected.',
    });
  }

  const notificationCount = notifications.filter((n) => n.type === 'error' || n.type === 'warning').length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold">Thermal Coating Quality Prediction</h1>
        <p className="text-sm text-muted-foreground">AI-Powered Virtual Metrology System</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Generating...' : 'New Run'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex items-start gap-3 p-3">
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-xs text-muted-foreground">{notification.description}</div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
