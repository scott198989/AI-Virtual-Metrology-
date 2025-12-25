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
      <CardHeader>
        <CardTitle>Defect Probability</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative" style={{ width: 200, height: 120 }}>
          <svg
            width="200"
            height="120"
            viewBox="0 0 200 120"
            className="transform -rotate-180"
            style={{ transform: 'rotate(180deg)' }}
          >
            {/* Background arc */}
            <path
              d={`M ${20} ${100} A ${radius} ${radius} 0 0 1 ${180} ${100}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M ${20} ${100} A ${radius} ${radius} 0 0 1 ${180} ${100}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
              className="transition-all duration-500"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-4xl font-bold" style={{ color }}>
              {percentage.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">probability</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">&lt;10% Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">10-25% Caution</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">&gt;25% High Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
