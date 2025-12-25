'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getGradeBgColor, getStatusColor } from '@/lib/utils';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Run } from '@/lib/types';

interface RunTableProps {
  runs: Run[];
  isLoading: boolean;
}

export function RunTable({ runs, isLoading }: RunTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Production Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Production Runs</CardTitle>
        <Link href="/runs">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {runs.slice(0, 8).map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{run.id}</span>
                  <Badge variant="outline" className={getStatusColor(run.status)}>
                    {run.status}
                  </Badge>
                  {run.isOod && (
                    <Badge variant="warning">OOD</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {run.batchId} • {formatDate(run.startTime)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {run.qualityMetrics && (
                  <>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {run.qualityMetrics.thicknessUm.toFixed(1)} µm
                      </div>
                      <div className="text-xs text-muted-foreground">thickness</div>
                    </div>
                    <Badge className={getGradeBgColor(run.qualityMetrics.qualityGrade)}>
                      Grade {run.qualityMetrics.qualityGrade}
                    </Badge>
                  </>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
