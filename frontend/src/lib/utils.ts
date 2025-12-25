import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'text-green-500';
    case 'B':
      return 'text-lime-500';
    case 'C':
      return 'text-yellow-500';
    case 'reject':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getGradeBgColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-green-500/10 text-green-500';
    case 'B':
      return 'bg-lime-500/10 text-lime-500';
    case 'C':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'reject':
      return 'bg-red-500/10 text-red-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'running':
      return 'text-blue-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getDriftStatusColor(status: string): string {
  switch (status) {
    case 'stable':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  return 'text-red-500';
}

export function getQualityColor(deviation: number): string {
  if (deviation < 0.02) return '#22c55e'; // green
  if (deviation < 0.05) return '#84cc16'; // lime
  if (deviation < 0.1) return '#eab308'; // yellow
  if (deviation < 0.15) return '#f97316'; // orange
  return '#ef4444'; // red
}
