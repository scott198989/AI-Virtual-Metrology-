'use client';

import { KPICards } from '@/components/dashboard/kpi-cards';
import { RunTable } from '@/components/dashboard/run-table';
import { QualityGauge } from '@/components/dashboard/quality-gauge';
import { useRuns, useSummary, useMetrics } from '@/hooks/use-runs';
import { useDrift } from '@/hooks/use-drift';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { runs, isLoading: runsLoading } = useRuns(20);
  const { summary, isLoading: summaryLoading } = useSummary();
  const { metrics } = useMetrics();
  const { drift } = useDrift();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time quality prediction for thermal coating processes
          </p>
        </div>
        {drift && (
          <Badge
            variant={drift.overallStatus === 'stable' ? 'success' : drift.overallStatus === 'warning' ? 'warning' : 'error'}
            className="text-sm"
          >
            {drift.overallStatus === 'stable' ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <AlertTriangle className="mr-1 h-3 w-3" />
            )}
            Model {drift.overallStatus}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <KPICards summary={summary} isLoading={summaryLoading} />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Run Table - 2 columns */}
        <div className="lg:col-span-2">
          <RunTable runs={runs} isLoading={runsLoading} />
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* Quality Distribution */}
          <QualityGauge summary={summary} />

          {/* Model Performance */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Model Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Thickness RMSE</span>
                  <span className="font-medium">
                    {metrics.thickness.metrics.rmse?.toFixed(2)} µm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Thickness R²</span>
                  <span className="font-medium">
                    {(metrics.thickness.metrics.r2 * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Defect ROC-AUC</span>
                  <span className="font-medium">
                    {(metrics.defect.metrics.roc_auc * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drift Status */}
          {drift && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Drift Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">PSI Score</span>
                  <span className="font-medium">{drift.psi.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Drifted Features</span>
                  <span className="font-medium">{drift.driftedFeatures.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reference Runs</span>
                  <span className="font-medium">{drift.referenceRunCount}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
