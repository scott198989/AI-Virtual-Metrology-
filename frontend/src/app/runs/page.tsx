'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRuns } from '@/hooks/use-runs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, getGradeBgColor, getStatusColor } from '@/lib/utils';
import { ChevronRight, Filter } from 'lucide-react';

export default function RunsPage() {
  const { runs, total, isLoading } = useRuns(100);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false;
    if (gradeFilter !== 'all' && run.qualityMetrics?.qualityGrade !== gradeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Production Runs</h2>
          <p className="text-muted-foreground">
            {total} total runs • {filteredRuns.length} shown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
                <SelectItem value="C">Grade C</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Runs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(9)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : filteredRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold">{run.id}</span>
                          {run.isOod && <Badge variant="warning">OOD</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">{run.batchId}</div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Material</span>
                        <div className="font-medium">{run.setupParams.coatingMaterial}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Substrate</span>
                        <div className="font-medium">{run.setupParams.substrateMaterial}</div>
                      </div>
                    </div>

                    {run.qualityMetrics && (
                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Thickness</span>
                          <div className="text-xl font-bold">
                            {run.qualityMetrics.thicknessUm.toFixed(1)} µm
                          </div>
                        </div>
                        <Badge className={getGradeBgColor(run.qualityMetrics.qualityGrade)}>
                          Grade {run.qualityMetrics.qualityGrade}
                        </Badge>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(run.startTime)}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
