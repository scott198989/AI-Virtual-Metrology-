'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DriftStatus } from '@/lib/types';

interface DriftChartProps {
  drift: DriftStatus;
}

export function DriftChart({ drift }: DriftChartProps) {
  const data = Object.entries(drift.featureDrift)
    .map(([name, fd]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      fullName: name,
      shift: fd.shiftMagnitude * 100,
      drifted: fd.driftDetected,
    }))
    .sort((a, b) => b.shift - a.shift)
    .slice(0, 15);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Drift Magnitude</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                className="text-xs"
              />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Shift']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              />
              <ReferenceLine x={10} stroke="#eab308" strokeDasharray="3 3" label="Warning" />
              <Bar dataKey="shift" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.drifted ? '#ef4444' : entry.shift > 10 ? '#eab308' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
