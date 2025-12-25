'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRun, useTimeseries, usePrediction, useUncertainty, useComparison } from '@/hooks/use-prediction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeSeriesChart } from '@/components/charts/timeseries-chart';
import { PredictionChart } from '@/components/charts/prediction-chart';
import { ConfidenceBand } from '@/components/charts/confidence-band';
import { formatDate, getGradeBgColor, getStatusColor } from '@/lib/utils';
import { ArrowLeft, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RunDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { run, isLoading: runLoading } = useRun(id);
  const { timeseries, isLoading: tsLoading } = useTimeseries(id);
  const { prediction } = usePrediction(id);
  const { uncertainty } = useUncertainty(id);
  const { comparison } = useComparison(id);

  if (runLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Run not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/runs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight font-mono">{run.id}</h2>
              <Badge variant="outline" className={getStatusColor(run.status)}>
                {run.status}
              </Badge>
              {run.isOod && <Badge variant="warning">OOD</Badge>}
            </div>
            <p className="text-muted-foreground">
              {run.batchId} • Started {formatDate(run.startTime)}
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coating Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{run.setupParams.coatingMaterial}</div>
            <p className="text-xs text-muted-foreground">on {run.setupParams.substrateMaterial}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Predicted Thickness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prediction?.thicknessUm.toFixed(1) ?? '--'} µm
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {run.setupParams.targetThicknessUm.toFixed(0)} µm
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Defect Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {prediction ? (prediction.defectProbability * 100).toFixed(1) : '--'}%
              </div>
              {prediction && prediction.defectProbability < 0.1 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quality Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {run.qualityMetrics ? (
              <Badge className={`text-lg ${getGradeBgColor(run.qualityMetrics.qualityGrade)}`}>
                Grade {run.qualityMetrics.qualityGrade}
              </Badge>
            ) : (
              <span className="text-2xl font-bold">--</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeseries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeseries">Time Series</TabsTrigger>
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="quality">Quality Details</TabsTrigger>
        </TabsList>

        <TabsContent value="timeseries" className="space-y-4">
          {tsLoading ? (
            <Skeleton className="h-[400px]" />
          ) : timeseries ? (
            <>
              <TimeSeriesChart
                data={timeseries.data}
                title="Plasma Parameters"
                dataKeys={[
                  { key: 'plasmaPowerKw', name: 'Power (kW)', color: '#3b82f6' },
                  { key: 'primaryGasFlowSlpm', name: 'Primary Gas (SLPM)', color: '#22c55e' },
                  { key: 'secondaryGasFlowSlpm', name: 'Secondary Gas (SLPM)', color: '#f97316' },
                ]}
              />
              <TimeSeriesChart
                data={timeseries.data}
                title="Temperature Profile"
                dataKeys={[
                  { key: 'substrateTempC', name: 'Substrate Temp (°C)', color: '#ef4444' },
                  { key: 'ambientTempC', name: 'Ambient Temp (°C)', color: '#6366f1' },
                ]}
              />
              <TimeSeriesChart
                data={timeseries.data}
                title="Deposition Rate"
                dataKeys={[
                  { key: 'depositionRateUmS', name: 'Deposition Rate (µm/s)', color: '#8b5cf6' },
                  { key: 'powderFeedRateGMin', name: 'Powder Feed (g/min)', color: '#06b6d4' },
                ]}
              />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {comparison && <PredictionChart comparison={comparison} />}
            {uncertainty && prediction && (
              <ConfidenceBand uncertainty={uncertainty} predictedValue={prediction.thicknessUm} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {run.qualityMetrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Thickness Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Thickness</span>
                    <span className="font-medium">{run.qualityMetrics.thicknessUm.toFixed(2)} µm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uniformity</span>
                    <span className="font-medium">{run.qualityMetrics.thicknessUniformityPct.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coating Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Porosity</span>
                    <span className="font-medium">{run.qualityMetrics.porosityPct.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adhesion Strength</span>
                    <span className="font-medium">{run.qualityMetrics.adhesionStrengthMpa.toFixed(2)} MPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface Roughness</span>
                    <span className="font-medium">{run.qualityMetrics.surfaceRoughnessRa.toFixed(2)} µm</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Defect Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delamination</span>
                    <Badge variant={run.qualityMetrics.hasDelamination ? 'error' : 'success'}>
                      {run.qualityMetrics.hasDelamination ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cracks</span>
                    <Badge variant={run.qualityMetrics.hasCracks ? 'error' : 'success'}>
                      {run.qualityMetrics.hasCracks ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voids</span>
                    <Badge variant={run.qualityMetrics.hasVoids ? 'error' : 'success'}>
                      {run.qualityMetrics.hasVoids ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
