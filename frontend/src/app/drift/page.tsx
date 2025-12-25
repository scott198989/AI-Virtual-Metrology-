'use client';

import { useDrift } from '@/hooks/use-drift';
import { useMetrics } from '@/hooks/use-runs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DriftChart } from '@/components/charts/drift-chart';
import { AlertTriangle, CheckCircle, RefreshCw, Shield, TrendingUp } from 'lucide-react';

export default function DriftPage() {
  const { drift, isLoading: driftLoading } = useDrift(30);
  const { metrics } = useMetrics();

  const statusConfig = {
    stable: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/50',
      label: 'Stable',
      description: 'Model predictions are reliable. No significant drift detected.',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/50',
      label: 'Warning',
      description: 'Minor drift detected. Monitor closely and consider retraining.',
    },
    critical: {
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/50',
      label: 'Critical',
      description: 'Significant drift detected. Model retraining recommended.',
    },
    unknown: {
      icon: Shield,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted',
      label: 'Unknown',
      description: 'Insufficient data to assess drift status.',
    },
    insufficient_data: {
      icon: Shield,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted',
      label: 'Insufficient Data',
      description: 'More production runs needed for drift detection.',
    },
  };

  const status = drift ? statusConfig[drift.overallStatus] : statusConfig.unknown;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Drift Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor feature distribution shift and model reliability
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Banner */}
      {driftLoading ? (
        <Skeleton className="h-32" />
      ) : drift ? (
        <Card className={`${status.bgColor} ${status.borderColor}`}>
          <CardContent className="flex items-center gap-6 p-6">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${status.bgColor}`}>
              <StatusIcon className={`h-8 w-8 ${status.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${status.color}`}>{status.label}</span>
                <Badge variant="outline">PSI: {drift.psi.toFixed(4)}</Badge>
              </div>
              <p className="text-muted-foreground">{status.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Last Updated</div>
              <div className="font-medium">
                {new Date(drift.lastUpdated).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats Cards */}
      {drift && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Features Monitored
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(drift.featureDrift).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Drifted Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${drift.driftedFeatures.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {drift.driftedFeatures.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reference Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drift.referenceRunCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drift.currentRunCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {drift && <DriftChart drift={drift} />}

        {/* Drifted Features List */}
        {drift && drift.driftedFeatures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Drifted Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {drift.driftedFeatures.slice(0, 10).map((feature) => {
                  const fd = drift.featureDrift[feature];
                  return (
                    <div key={feature} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium font-mono text-sm">{feature}</div>
                        <div className="text-xs text-muted-foreground">
                          Reference: {fd.referenceMean.toFixed(2)} → Current: {fd.currentMean.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-500">
                          {(fd.shiftMagnitude * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          p = {fd.pValue.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Performance */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Current Model Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thickness RMSE</span>
                  <span className="font-medium">{metrics.thickness.metrics.rmse?.toFixed(3)} µm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thickness R²</span>
                  <span className="font-medium">{(metrics.thickness.metrics.r2 * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thickness MAE</span>
                  <span className="font-medium">{metrics.thickness.metrics.mae?.toFixed(3)} µm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Defect Accuracy</span>
                  <span className="font-medium">{(metrics.defect.metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Defect ROC-AUC</span>
                  <span className="font-medium">{(metrics.defect.metrics.roc_auc * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
