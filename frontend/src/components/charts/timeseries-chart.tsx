'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeSeriesPoint } from '@/lib/types';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title: string;
  dataKeys: { key: keyof TimeSeriesPoint; name: string; color: string }[];
}

export function TimeSeriesChart({ data, title, dataKeys }: TimeSeriesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timeSeconds"
                tickFormatter={(v) => `${v}s`}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(v) => `Time: ${v}s`}
              />
              <Legend />
              {dataKeys.map((dk) => (
                <Line
                  key={dk.key as string}
                  type="monotone"
                  dataKey={dk.key as string}
                  name={dk.name}
                  stroke={dk.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
