'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Comparison } from '@/lib/types';

interface PredictionChartProps {
  comparison: Comparison;
}

export function PredictionChart({ comparison }: PredictionChartProps) {
  const data = [
    {
      name: 'Thickness (µm)',
      predicted: comparison.predicted.thickness,
      actual: comparison.actual.thickness,
    },
    {
      name: 'Porosity (%)',
      predicted: comparison.predicted.porosity,
      actual: comparison.actual.porosity,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Predicted vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="predicted" name="Predicted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {comparison.errors.thicknessErrorPct !== null && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <span className="text-muted-foreground">Thickness Error:</span>
            <span className="font-medium">
              {comparison.errors.thicknessError?.toFixed(2)} µm
              ({comparison.errors.thicknessErrorPct?.toFixed(1)}%)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
