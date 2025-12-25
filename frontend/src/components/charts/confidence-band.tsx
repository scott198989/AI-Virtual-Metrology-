'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Uncertainty } from '@/lib/types';

interface ConfidenceBandProps {
  uncertainty: Uncertainty;
  predictedValue: number;
}

export function ConfidenceBand({ uncertainty, predictedValue }: ConfidenceBandProps) {
  const { predictionInterval, confidenceLevel, relativeUncertainty } = uncertainty;
  const range = predictionInterval.upper - predictionInterval.lower;

  // Position of predicted value within the interval (0-100)
  const predictedPosition =
    ((predictedValue - predictionInterval.lower) / range) * 100;

  const confidenceColor = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-red-500',
  }[confidenceLevel];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Prediction Uncertainty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual interval */}
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">90% Prediction Interval</span>
            <span className="font-medium">
              {predictionInterval.lower.toFixed(1)} - {predictionInterval.upper.toFixed(1)} µm
            </span>
          </div>
          <div className="relative h-8 rounded-full bg-muted">
            {/* Interval bar */}
            <div
              className="absolute inset-y-0 rounded-full bg-primary/30"
              style={{ left: '10%', right: '10%' }}
            />
            {/* Predicted value marker */}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
              style={{ left: `${10 + predictedPosition * 0.8}%` }}
            />
            {/* Labels */}
            <div className="absolute inset-x-0 -bottom-6 flex justify-between text-xs text-muted-foreground">
              <span>{predictionInterval.lower.toFixed(0)}</span>
              <span className="font-medium text-foreground">{predictedValue.toFixed(1)}</span>
              <span>{predictionInterval.upper.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Confidence level */}
        <div className="pt-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence Level</span>
            <span className={`font-medium capitalize ${confidenceColor.replace('bg-', 'text-')}`}>
              {confidenceLevel}
            </span>
          </div>
          <Progress
            value={(1 - relativeUncertainty) * 100}
            className="h-2"
            indicatorClassName={confidenceColor}
          />
        </div>

        {/* Uncertainty breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Epistemic</div>
            <div className="text-lg font-semibold">
              {uncertainty.epistemicUncertainty.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Aleatoric</div>
            <div className="text-lg font-semibold">
              {uncertainty.aleatoricUncertainty.toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
