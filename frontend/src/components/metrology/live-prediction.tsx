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
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 py-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Predicted Thickness</span>
          <span className={`text-2xl font-bold ${deviationColor}`}>
            {prediction.thicknessUm.toFixed(1)} µm
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        {/* Visual gauge */}
        <div className="relative h-3 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min((prediction.thicknessUm / targetThickness) * 100, 150)}%`, maxWidth: '100%' }}
          />
          <div
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-white"
            style={{ left: '100%', marginLeft: '-1px' }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Lower CI</div>
            <div className="text-sm font-semibold">{prediction.thicknessLower.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Target</div>
            <div className="text-sm font-semibold">{targetThickness.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Upper CI</div>
            <div className="text-sm font-semibold">{prediction.thicknessUpper.toFixed(1)}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">Deviation from target</span>
          <span className={`text-sm font-semibold ${deviationColor}`}>
            {(deviation * 100).toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
