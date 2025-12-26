'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DefectGaugeProps {
  probability: number;
}

export function DefectGauge({ probability }: DefectGaugeProps) {
  const percentage = probability * 100;
  const color = percentage < 10 ? '#22c55e' : percentage < 25 ? '#eab308' : '#ef4444';

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Defect Probability</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-4 pt-0">
        <div className="relative" style={{ width: 160, height: 90 }}>
          {/* SVG arc at top */}
          <svg
            width="160"
            height="50"
            viewBox="0 0 160 50"
            className="absolute top-0"
          >
            {/* Background arc */}
            <path
              d={`M 10 45 A 70 70 0 0 1 150 45`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={8}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M 10 45 A 70 70 0 0 1 150 45`}
              fill="none"
              stroke={color}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 110} 220`}
              className="transition-all duration-500"
            />
          </svg>
          {/* Text below arc */}
          <div className="absolute bottom-0 w-full text-center">
            <span className="text-3xl font-bold" style={{ color }}>
              {percentage.toFixed(1)}%
            </span>
            <div className="text-xs text-muted-foreground">probability</div>
          </div>
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs">
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
