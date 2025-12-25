'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export function ConfidenceIndicator({ confidence, confidenceLevel }: ConfidenceIndicatorProps) {
  const config = {
    high: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'High Confidence',
      description: 'Model predictions are reliable',
    },
    medium: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'Medium Confidence',
      description: 'Some uncertainty in predictions',
    },
    low: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'Low Confidence',
      description: 'High uncertainty - review manually',
    },
  };

  const current = config[confidenceLevel];
  const Icon = current.icon;

  return (
    <Card className={current.bgColor}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${current.color}`} />
          Model Confidence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-lg font-semibold ${current.color}`}>{current.label}</div>
            <div className="text-sm text-muted-foreground">{current.description}</div>
          </div>
          <div className={`text-4xl font-bold ${current.color}`}>
            {(confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-4 h-2 rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              confidenceLevel === 'high'
                ? 'bg-green-500'
                : confidenceLevel === 'medium'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
