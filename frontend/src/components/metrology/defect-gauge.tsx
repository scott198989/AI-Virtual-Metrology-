'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DefectGaugeProps {
  probability: number;
}

export function DefectGauge({ probability }: DefectGaugeProps) {
  const percentage = probability * 100;
  const color = percentage < 10 ? '#22c55e' : percentage < 25 ? '#eab308' : '#ef4444';

  // SVG arc calculation
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Defect Probability</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-4 pt-0">
        <div className="relative" style={{ width: 160, height: 100 }}>
          <svg
            width="160"
            height="100"
            viewBox="0 0 160 100"
            style={{ transform: 'rotate(180deg)' }}
          >
            <path
              d={`M ${16} ${80} A ${64} ${64} 0 0 1 ${144} ${80}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={10}
              strokeLinecap="round"
            />
            <path
              d={`M ${16} ${80} A ${64} ${64} 0 0 1 ${144} ${80}`}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * (Math.PI * 64)} ${Math.PI * 64}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-3xl font-bold" style={{ color }}>
              {percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">probability</span>
          </div>
        </div>

        <div className="mt-2 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">&lt;10% Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">10-25% Caution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">&gt;25% High Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
