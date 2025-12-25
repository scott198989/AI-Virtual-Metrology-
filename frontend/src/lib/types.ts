// API Types for Virtual Metrology System

export interface SetupParams {
  substrateMaterial: string;
  coatingMaterial: string;
  targetThicknessUm: number;
  sprayDistanceMm: number;
  robotSpeedMmS: number;
}

export interface QualityMetrics {
  thicknessUm: number;
  thicknessUniformityPct: number;
  porosityPct: number;
  adhesionStrengthMpa: number;
  surfaceRoughnessRa: number;
  hasDelamination: boolean;
  hasCracks: boolean;
  hasVoids: boolean;
  defectFlag: boolean;
  qualityGrade: 'A' | 'B' | 'C' | 'reject';
}

export interface Run {
  id: string;
  batchId: string;
  startTime: string;
  endTime: string | null;
  status: 'running' | 'completed' | 'failed';
  isOod: boolean;
  setupParams: SetupParams;
  qualityMetrics: QualityMetrics | null;
}

export interface RunListResponse {
  runs: Run[];
  total: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  timeSeconds: number;
  plasmaTempC: number;
  plasmaPowerKw: number;
  primaryGasFlowSlpm: number;
  secondaryGasFlowSlpm: number;
  powderFeedRateGMin: number;
  carrierGasFlowSlpm: number;
  substrateTempC: number;
  sprayDistanceMm: number;
  chamberPressureMbar: number;
  ambientTempC: number;
  ambientHumidityPct: number;
  depositionRateUmS: number;
}

export interface TimeSeriesResponse {
  runId: string;
  data: TimeSeriesPoint[];
  duration: number;
  sampleCount: number;
}

export interface QualityPrediction {
  runId: string;
  thicknessUm: number;
  thicknessLower: number;
  thicknessUpper: number;
  porosityPct: number;
  defectProbability: number;
  qualityGrade: string;
  confidence: number;
}

export interface PredictionInterval {
  lower: number;
  upper: number;
}

export interface Uncertainty {
  runId: string;
  predictionInterval: PredictionInterval;
  intervalWidth: number;
  relativeUncertainty: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  epistemicUncertainty: number;
  aleatoricUncertainty: number;
}

export interface FeatureDrift {
  featureName: string;
  ksStatistic: number;
  pValue: number;
  driftDetected: boolean;
  referenceMean: number;
  currentMean: number;
  shiftMagnitude: number;
}

export interface DriftStatus {
  overallStatus: 'stable' | 'warning' | 'critical' | 'unknown' | 'insufficient_data';
  psi: number;
  featureDrift: Record<string, FeatureDrift>;
  driftedFeatures: string[];
  lastUpdated: string;
  referenceRunCount: number;
  currentRunCount: number;
}

export interface ModelMetrics {
  metrics: Record<string, number>;
  featureImportance?: Record<string, number>;
}

export interface Metrics {
  thickness: ModelMetrics;
  porosity: ModelMetrics;
  defect: ModelMetrics;
  quality: ModelMetrics;
}

export interface Summary {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  oodRuns: number;
  averageThickness: number;
  averagePorosity: number;
  defectRate: number;
  gradeDistribution: Record<string, number>;
}

export interface Comparison {
  runId: string;
  predicted: {
    thickness: number | null;
    porosity: number | null;
    defectProbability: number | null;
    qualityGrade: string | null;
  };
  actual: {
    thickness: number | null;
    porosity: number | null;
    defectFlag: boolean | null;
    qualityGrade: string | null;
  };
  errors: {
    thicknessError: number | null;
    thicknessErrorPct: number | null;
  };
}
