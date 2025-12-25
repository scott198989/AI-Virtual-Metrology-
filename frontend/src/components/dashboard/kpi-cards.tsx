'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, CheckCircle2, Target, TrendingUp } from 'lucide-react';
import type { Summary } from '@/lib/types';

interface KPICardsProps {
  summary: Summary | null;
  isLoading: boolean;
}

export function KPICards({ summary, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: 'Total Runs',
      value: summary.totalRuns,
      description: `${summary.completedRuns} completed, ${summary.failedRuns} failed`,
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      title: 'Avg Thickness',
      value: `${summary.averageThickness.toFixed(1)} µm`,
      description: 'Predicted coating thickness',
      icon: Target,
      color: 'text-green-500',
    },
    {
      title: 'Defect Rate',
      value: `${summary.defectRate.toFixed(1)}%`,
      description: `${summary.oodRuns} OOD runs detected`,
      icon: AlertTriangle,
      color: summary.defectRate > 10 ? 'text-red-500' : 'text-yellow-500',
    },
    {
      title: 'Quality Grade A',
      value: `${((summary.gradeDistribution.A / summary.totalRuns) * 100).toFixed(0)}%`,
      description: `${summary.gradeDistribution.A} runs at Grade A`,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="transition-smooth hover:border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
