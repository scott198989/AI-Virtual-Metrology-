'use client';

import { useRuns } from '@/hooks/use-runs';
import { usePrediction, useUncertainty } from '@/hooks/use-prediction';
import { LivePrediction } from '@/components/metrology/live-prediction';
import { DefectGauge } from '@/components/metrology/defect-gauge';
import { ConfidenceIndicator } from '@/components/metrology/confidence-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Activity, Gauge, TrendingUp } from 'lucide-react';

export default function MetrologyPage() {
  const { runs, isLoading: runsLoading } = useRuns(20);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  // Set default run when data loads
  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const { prediction, isLoading: predLoading } = usePrediction(selectedRunId);
  const { uncertainty, isLoading: uncLoading } = useUncertainty(selectedRunId);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Virtual Metrology</h2>
          <p className="text-muted-foreground">
            Real-time quality prediction without physical inspection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRunId} onValueChange={setSelectedRunId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a run" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  Run {run.id} - {run.batchId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Run Info */}
      {selectedRun && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono">{selectedRun.id}</span>
                <Badge variant="outline">{selectedRun.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedRun.setupParams.coatingMaterial} on {selectedRun.setupParams.substrateMaterial} •
                Target: {selectedRun.setupParams.targetThicknessUm.toFixed(0)} µm
              </p>
            </div>
            {selectedRun.qualityMetrics && (
              <Badge className="text-lg" variant={selectedRun.qualityMetrics.defectFlag ? 'error' : 'success'}>
                {selectedRun.qualityMetrics.defectFlag ? 'DEFECT DETECTED' : 'PASS'}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prediction Cards */}
      {predLoading || uncLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : prediction && uncertainty && selectedRun ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <LivePrediction
            prediction={prediction}
            targetThickness={selectedRun.setupParams.targetThicknessUm}
          />
          <DefectGauge probability={prediction.defectProbability} />
          <ConfidenceIndicator
            confidence={prediction.confidence}
            confidenceLevel={uncertainty.confidenceLevel}
          />
        </div>
      ) : null}

      {/* Additional Predictions */}
      {prediction && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Porosity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prediction.porosityPct.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {prediction.porosityPct < 5 ? 'Within spec' : 'Above target'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quality Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Grade {prediction.qualityGrade}</div>
              <p className="text-xs text-muted-foreground">Predicted classification</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prediction Interval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ±{((prediction.thicknessUpper - prediction.thicknessLower) / 2).toFixed(1)} µm
              </div>
              <p className="text-xs text-muted-foreground">90% confidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Relative Uncertainty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uncertainty ? (uncertainty.relativeUncertainty * 100).toFixed(1) : '--'}%
              </div>
              <p className="text-xs text-muted-foreground">Interval / prediction</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
