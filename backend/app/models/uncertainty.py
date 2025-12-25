"""Uncertainty estimation for virtual metrology predictions."""
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from app.simulation.sensors import SensorReading
from app.features.engineering import FeatureEngineer
from .registry import ModelRegistry


@dataclass
class UncertaintyMetrics:
    """Uncertainty metrics for a prediction."""

    run_id: str
    prediction_interval: Tuple[float, float]  # 90% CI
    interval_width: float
    relative_uncertainty: float  # interval width / prediction
    confidence_level: str  # "high", "medium", "low"
    epistemic_uncertainty: float  # Model uncertainty
    aleatoric_uncertainty: float  # Data uncertainty estimate

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "runId": self.run_id,
            "predictionInterval": {
                "lower": round(self.prediction_interval[0], 2),
                "upper": round(self.prediction_interval[1], 2),
            },
            "intervalWidth": round(self.interval_width, 2),
            "relativeUncertainty": round(self.relative_uncertainty, 4),
            "confidenceLevel": self.confidence_level,
            "epistemicUncertainty": round(self.epistemic_uncertainty, 4),
            "aleatoricUncertainty": round(self.aleatoric_uncertainty, 4),
        }


class UncertaintyEstimator:
    """Estimate prediction uncertainty using quantile regression and ensemble variance."""

    CONFIDENCE_THRESHOLDS = {
        "high": 0.1,    # < 10% relative uncertainty
        "medium": 0.2,  # < 20% relative uncertainty
        "low": 1.0,     # >= 20% relative uncertainty
    }

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.feature_engineer = FeatureEngineer()

    def estimate_uncertainty(
        self, run_id: str, readings: List[SensorReading]
    ) -> UncertaintyMetrics:
        """Estimate uncertainty for a run's predictions."""

        # Engineer features
        fs = self.feature_engineer.engineer_features(run_id, readings)

        # Get feature vector
        feature_names = self.registry.load_model("feature_names")
        X = np.array([[fs.features.get(name, 0.0) for name in feature_names]])
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        # Scale features
        scaler = self.registry.load_model("scaler")
        X_scaled = scaler.transform(X)

        # Get predictions from quantile models
        q10_model = self.registry.load_model("thickness_model_q10")
        q90_model = self.registry.load_model("thickness_model_q90")
        thickness_model = self.registry.load_model("thickness_model")

        lower = float(q10_model.predict(X_scaled)[0])
        upper = float(q90_model.predict(X_scaled)[0])
        point = float(thickness_model.predict(X_scaled)[0])

        # Ensure valid interval
        lower = max(0, lower)
        upper = max(lower + 0.1, upper)

        interval_width = upper - lower
        relative_uncertainty = interval_width / point if point > 0 else 1.0

        # Determine confidence level
        confidence_level = "low"
        for level, threshold in sorted(
            self.CONFIDENCE_THRESHOLDS.items(), key=lambda x: x[1]
        ):
            if relative_uncertainty < threshold:
                confidence_level = level
                break

        # Estimate epistemic uncertainty (model uncertainty)
        # Using prediction interval as proxy
        epistemic = interval_width / 2

        # Estimate aleatoric uncertainty (data uncertainty)
        # Based on input feature variance
        aleatoric = self._estimate_aleatoric_uncertainty(fs.features, feature_names)

        return UncertaintyMetrics(
            run_id=run_id,
            prediction_interval=(lower, upper),
            interval_width=interval_width,
            relative_uncertainty=relative_uncertainty,
            confidence_level=confidence_level,
            epistemic_uncertainty=epistemic,
            aleatoric_uncertainty=aleatoric,
        )

    def _estimate_aleatoric_uncertainty(
        self, features: Dict[str, float], feature_names: List[str]
    ) -> float:
        """Estimate aleatoric uncertainty from input feature characteristics."""

        # Look for indicators of noisy/unstable process
        uncertainty_indicators = []

        # High variance in rolling features suggests unstable process
        for name in feature_names:
            if "_std" in name or "_diff_std" in name:
                value = features.get(name, 0)
                if value > 0:
                    uncertainty_indicators.append(value)

        if uncertainty_indicators:
            # Normalize by typical values
            mean_indicator = np.mean(uncertainty_indicators)
            return float(np.tanh(mean_indicator / 10))  # Scale to 0-1

        return 0.1  # Default low uncertainty

    def get_calibration_stats(
        self, actual_values: List[float], predicted_intervals: List[Tuple[float, float]]
    ) -> Dict[str, float]:
        """Calculate calibration statistics for prediction intervals."""

        if not actual_values or len(actual_values) != len(predicted_intervals):
            return {}

        # Count how many actual values fall within predicted intervals
        in_interval = sum(
            1 for actual, (lower, upper) in zip(actual_values, predicted_intervals)
            if lower <= actual <= upper
        )

        coverage = in_interval / len(actual_values)

        # Calculate average interval width
        avg_width = np.mean([upper - lower for lower, upper in predicted_intervals])

        # Sharpness (narrower intervals are sharper)
        sharpness = 1 / (1 + avg_width)

        return {
            "coverage": coverage,
            "expectedCoverage": 0.8,  # 80% for 10-90 percentile
            "averageIntervalWidth": avg_width,
            "sharpness": sharpness,
            "calibrationError": abs(coverage - 0.8),
        }
