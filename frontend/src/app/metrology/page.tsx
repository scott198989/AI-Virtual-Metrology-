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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Virtual Metrology</h2>
          <p className="text-sm text-muted-foreground">
            Real-time quality prediction without physical inspection
          </p>
        </div>
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a run" />
          </SelectTrigger>
          <SelectContent>
            {runs.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                Run {run.id.slice(0, 8)} - {run.batchId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Run Info */}
      {selectedRun && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex items-center gap-4 py-3 px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono text-sm">{selectedRun.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-xs">{selectedRun.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {selectedRun.setupParams.coatingMaterial} on {selectedRun.setupParams.substrateMaterial} • Target: {selectedRun.setupParams.targetThicknessUm.toFixed(0)} µm
              </p>
            </div>
            {selectedRun.qualityMetrics && (
              <Badge variant={selectedRun.qualityMetrics.defectFlag ? 'error' : 'success'}>
                {selectedRun.qualityMetrics.defectFlag ? 'DEFECT DETECTED' : 'PASS'}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prediction Cards */}
      {predLoading || uncLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
        </div>
      ) : prediction && uncertainty && selectedRun ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Porosity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{prediction.porosityPct.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {prediction.porosityPct < 5 ? 'Within spec' : 'Above target'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Quality Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">Grade {prediction.qualityGrade}</div>
              <p className="text-xs text-muted-foreground">Predicted classification</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Prediction Interval
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">
                ±{((prediction.thicknessUpper - prediction.thicknessLower) / 2).toFixed(1)} µm
              </div>
              <p className="text-xs text-muted-foreground">90% confidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Relative Uncertainty
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">
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
