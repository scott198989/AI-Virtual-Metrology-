'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { QualityPrediction } from '@/lib/types';

interface LivePredictionProps {
  prediction: QualityPrediction;
  targetThickness: number;
}

export function LivePrediction({ prediction, targetThickness }: LivePredictionProps) {
  const deviation = Math.abs(prediction.thicknessUm - targetThickness) / targetThickness;
  const deviationColor = deviation < 0.05 ? 'text-green-500' : deviation < 0.1 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <CardTitle className="flex items-center justify-between">
          <span>Predicted Thickness</span>
          <span className={`text-3xl font-bold ${deviationColor}`}>
            {prediction.thicknessUm.toFixed(1)} µm
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Visual gauge */}
        <div className="relative h-4 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min((prediction.thicknessUm / targetThickness) * 100, 150)}%`, maxWidth: '100%' }}
          />
          {/* Target marker */}
          <div
            className="absolute top-1/2 h-6 w-0.5 -translate-y-1/2 bg-white"
            style={{ left: '100%', marginLeft: '-1px' }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-muted-foreground">Lower CI</div>
            <div className="text-lg font-semibold">{prediction.thicknessLower.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Target</div>
            <div className="text-lg font-semibold">{targetThickness.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Upper CI</div>
            <div className="text-lg font-semibold">{prediction.thicknessUpper.toFixed(1)}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Deviation from target</span>
          <span className={`font-semibold ${deviationColor}`}>
            {(deviation * 100).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
