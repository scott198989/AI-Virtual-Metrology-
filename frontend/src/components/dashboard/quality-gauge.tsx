'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Summary } from '@/lib/types';

interface QualityGaugeProps {
  summary: Summary | null;
}

export function QualityGauge({ summary }: QualityGaugeProps) {
  if (!summary) return null;

  const total = summary.totalRuns;
  const grades = summary.gradeDistribution;

  const data = [
    { grade: 'A', count: grades.A, color: '#22c55e' },
    { grade: 'B', count: grades.B, color: '#84cc16' },
    { grade: 'C', count: grades.C, color: '#eab308' },
    { grade: 'Reject', count: grades.reject, color: '#ef4444' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-8 w-full overflow-hidden rounded-full bg-muted">
          {data.map((d) => (
            <div
              key={d.grade}
              className="flex items-center justify-center transition-all hover:opacity-80"
              style={{
                width: `${(d.count / total) * 100}%`,
                backgroundColor: d.color,
                minWidth: d.count > 0 ? '2rem' : '0',
              }}
            >
              {d.count > 0 && (
                <span className="text-xs font-medium text-white">{d.count}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          {data.map((d) => (
            <div key={d.grade} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-muted-foreground">
                {d.grade}: {((d.count / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
