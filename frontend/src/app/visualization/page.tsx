'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRuns } from '@/hooks/use-runs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getQualityColor, getGradeBgColor } from '@/lib/utils';
import { Box, Palette, Ruler } from 'lucide-react';

// Dynamic import for Three.js component (client-side only)
const CoatingScene = dynamic(
  () => import('@/components/three/coating-scene').then((mod) => mod.CoatingScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading 3D Scene...</p>
        </div>
      </div>
    ),
  }
);

export default function VisualizationPage() {
  const { runs, isLoading } = useRuns(50);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  const targetThickness = selectedRun?.setupParams.targetThicknessUm || 300;
  const actualThickness = selectedRun?.qualityMetrics?.thicknessUm || targetThickness;
  const deviation = Math.abs(actualThickness - targetThickness) / targetThickness;
  const qualityColor = getQualityColor(deviation);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">3D Visualization</h2>
          <p className="text-muted-foreground">
            Interactive thermal spray coating simulation
          </p>
        </div>
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a run" />
          </SelectTrigger>
          <SelectContent>
            {runs.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{run.id}</span>
                  {run.qualityMetrics && (
                    <Badge variant="outline" className="text-xs">
                      {run.qualityMetrics.qualityGrade}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3D Scene */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <CoatingScene run={selectedRun || null} qualityColor={qualityColor} />
        </CardContent>
      </Card>

      {/* Controls and Info */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Quality Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-4 w-4" />
              Quality Color Scale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-sm">&lt;2% deviation - Excellent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: '#84cc16' }} />
                <span className="text-sm">2-5% deviation - Good</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: '#eab308' }} />
                <span className="text-sm">5-10% deviation - Acceptable</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: '#f97316' }} />
                <span className="text-sm">10-15% deviation - Warning</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-sm">&gt;15% deviation - Reject</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Run Info */}
        {selectedRun && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Box className="h-4 w-4" />
                Selected Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Run ID</span>
                <span className="font-mono font-medium">{selectedRun.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Material</span>
                <span>{selectedRun.setupParams.coatingMaterial}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Substrate</span>
                <span>{selectedRun.setupParams.substrateMaterial}</span>
              </div>
              {selectedRun.qualityMetrics && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grade</span>
                  <Badge className={getGradeBgColor(selectedRun.qualityMetrics.qualityGrade)}>
                    {selectedRun.qualityMetrics.qualityGrade}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Coating Metrics */}
        {selectedRun?.qualityMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ruler className="h-4 w-4" />
                Coating Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target</span>
                <span>{targetThickness.toFixed(0)} µm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Actual</span>
                <span className="font-medium">{actualThickness.toFixed(1)} µm</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deviation</span>
                <span style={{ color: qualityColor }}>{(deviation * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Porosity</span>
                <span>{selectedRun.qualityMetrics.porosityPct.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Controls:</strong> Left-click + drag to rotate • Scroll to zoom •
            The coating color represents quality based on thickness deviation from target
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
