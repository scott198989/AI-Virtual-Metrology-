"""Pydantic schemas for API requests and responses."""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class RunStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class QualityGrade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    REJECT = "reject"


class DriftStatusEnum(str, Enum):
    STABLE = "stable"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"
    INSUFFICIENT_DATA = "insufficient_data"


# Request schemas
class SimulateRequest(BaseModel):
    num_runs: int = Field(default=50, ge=10, le=500)
    seed: Optional[int] = Field(default=None, ge=0)


class TrainRequest(BaseModel):
    test_size: float = Field(default=0.2, ge=0.1, le=0.5)


# Response schemas
class SetupParamsResponse(BaseModel):
    substrateMaterial: str
    coatingMaterial: str
    targetThicknessUm: float
    sprayDistanceMm: float
    robotSpeedMmS: float


class QualityMetricsResponse(BaseModel):
    thicknessUm: float
    thicknessUniformityPct: float
    porosityPct: float
    adhesionStrengthMpa: float
    surfaceRoughnessRa: float
    hasDelamination: bool
    hasCracks: bool
    hasVoids: bool
    defectFlag: bool
    qualityGrade: str


class RunResponse(BaseModel):
    id: str
    batchId: str
    startTime: str
    endTime: Optional[str]
    status: str
    isOod: bool
    setupParams: SetupParamsResponse
    qualityMetrics: Optional[QualityMetricsResponse]


class RunListResponse(BaseModel):
    runs: List[RunResponse]
    total: int


class TimeSeriesPointResponse(BaseModel):
    timestamp: str
    timeSeconds: float
    plasmaTempC: float
    plasmaPowerKw: float
    primaryGasFlowSlpm: float
    secondaryGasFlowSlpm: float
    powderFeedRateGMin: float
    carrierGasFlowSlpm: float
    substrateTempC: float
    sprayDistanceMm: float
    chamberPressureMbar: float
    ambientTempC: float
    ambientHumidityPct: float
    depositionRateUmS: float


class TimeSeriesResponse(BaseModel):
    runId: str
    data: List[TimeSeriesPointResponse]
    duration: float
    sampleCount: int


class QualityPredictionResponse(BaseModel):
    runId: str
    thicknessUm: float
    thicknessLower: float
    thicknessUpper: float
    porosityPct: float
    defectProbability: float
    qualityGrade: str
    confidence: float


class PredictionIntervalResponse(BaseModel):
    lower: float
    upper: float


class UncertaintyResponse(BaseModel):
    runId: str
    predictionInterval: PredictionIntervalResponse
    intervalWidth: float
    relativeUncertainty: float
    confidenceLevel: str
    epistemicUncertainty: float
    aleatoricUncertainty: float


class FeatureDriftResponse(BaseModel):
    featureName: str
    ksStatistic: float
    pValue: float
    driftDetected: bool
    referenceMean: float
    currentMean: float
    shiftMagnitude: float


class DriftStatusResponse(BaseModel):
    overallStatus: str
    psi: float
    featureDrift: Dict[str, FeatureDriftResponse]
    driftedFeatures: List[str]
    lastUpdated: str
    referenceRunCount: int
    currentRunCount: int


class ModelMetricsResponse(BaseModel):
    metrics: Dict[str, float]
    featureImportance: Optional[Dict[str, float]] = None


class MetricsResponse(BaseModel):
    thickness: ModelMetricsResponse
    porosity: ModelMetricsResponse
    defect: ModelMetricsResponse
    quality: ModelMetricsResponse


class SummaryResponse(BaseModel):
    totalRuns: int
    completedRuns: int
    failedRuns: int
    oodRuns: int
    averageThickness: float
    averagePorosity: float
    defectRate: float
    gradeDistribution: Dict[str, int]


class HealthResponse(BaseModel):
    status: str
    initialized: bool
    timestamp: str


class InitializeResponse(BaseModel):
    runsGenerated: int
    modelsTrained: bool
    trainingMetrics: Dict[str, Any]
