'use client';

import { useState } from 'react';
import { useRuns, useSummary, useMetrics } from '@/hooks/use-runs';
import { useDrift } from '@/hooks/use-drift';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, getGradeBgColor } from '@/lib/utils';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { runs } = useRuns(100);
  const { summary } = useSummary();
  const { metrics } = useMetrics();
  const { drift } = useDrift();
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportRun = async (runId: string) => {
    setIsExporting(true);
    try {
      const data = await api.exportRun(runId, exportFormat);
      const blob = new Blob(
        [exportFormat === 'json' ? JSON.stringify(data, null, 2) : (data as { csv: string }).csv],
        { type: exportFormat === 'json' ? 'application/json' : 'text/csv' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run_${runId}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary,
      metrics,
      drift: drift ? {
        status: drift.overallStatus,
        psi: drift.psi,
        driftedFeatures: drift.driftedFeatures.length,
      } : null,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vm_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Export</h2>
          <p className="text-muted-foreground">
            Export production data and generate reports
          </p>
        </div>
        <Button onClick={handleExportSummary}>
          <Download className="mr-2 h-4 w-4" />
          Export Summary Report
        </Button>
      </div>

      {/* Summary Report Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Summary Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Production Overview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Runs</span>
                    <span>{summary.totalRuns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{summary.completedRuns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed</span>
                    <span>{summary.failedRuns}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Quality Metrics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Thickness</span>
                    <span>{(summary.averageThickness ?? 0).toFixed(1)} µm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Porosity</span>
                    <span>{(summary.averagePorosity ?? 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Defect Rate</span>
                    <span>{(summary.defectRate ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Grade Distribution</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(summary.gradeDistribution || {}).map(([grade, count]) => (
                    <div key={grade} className="flex justify-between">
                      <span className="text-muted-foreground">Grade {grade}</span>
                      <span>{count} ({summary.totalRuns > 0 ? ((Number(count) / summary.totalRuns) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {metrics && metrics.thickness?.metrics?.r2 != null && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Model Performance</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thickness R²</span>
                      <span>{((metrics.thickness.metrics.r2 ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Defect AUC</span>
                      <span>{((metrics.defect?.metrics?.roc_auc ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Export Run Data
            </span>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'json' | 'csv')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <span className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {runs.slice(0, 20).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-mono font-medium">{run.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {run.batchId} • {formatDate(run.startTime)}
                    </div>
                  </div>
                  {run.qualityMetrics && (
                    <Badge className={getGradeBgColor(run.qualityMetrics.qualityGrade)}>
                      Grade {run.qualityMetrics.qualityGrade}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportRun(run.id)}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
