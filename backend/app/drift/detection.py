"""Drift detection for virtual metrology monitoring."""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from scipy import stats

from app.simulation.process import ProductionRun
from app.features.engineering import FeatureEngineer


@dataclass
class FeatureDrift:
    """Drift statistics for a single feature."""

    feature_name: str
    ks_statistic: float
    p_value: float
    drift_detected: bool
    reference_mean: float
    current_mean: float
    shift_magnitude: float  # Relative shift in means

    def to_dict(self) -> dict:
        return {
            "featureName": self.feature_name,
            "ksStatistic": round(self.ks_statistic, 4),
            "pValue": round(self.p_value, 4),
            "driftDetected": self.drift_detected,
            "referenceMean": round(self.reference_mean, 4),
            "currentMean": round(self.current_mean, 4),
            "shiftMagnitude": round(self.shift_magnitude, 4),
        }


@dataclass
class DriftStatus:
    """Overall drift status."""

    overall_status: str  # "stable", "warning", "critical"
    psi: float  # Population Stability Index
    feature_drift: Dict[str, FeatureDrift] = field(default_factory=dict)
    drifted_features: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.now)
    reference_run_count: int = 0
    current_run_count: int = 0

    def to_dict(self) -> dict:
        return {
            "overallStatus": self.overall_status,
            "psi": round(self.psi, 4),
            "featureDrift": {
                name: fd.to_dict() for name, fd in self.feature_drift.items()
            },
            "driftedFeatures": self.drifted_features,
            "lastUpdated": self.last_updated.isoformat(),
            "referenceRunCount": self.reference_run_count,
            "currentRunCount": self.current_run_count,
        }


class DriftDetector:
    """Detect distribution drift in process features."""

    # PSI thresholds
    PSI_STABLE = 0.1
    PSI_WARNING = 0.25
    # Above PSI_WARNING is critical

    # KS test significance level
    ALPHA = 0.05

    # Minimum samples needed for drift detection
    MIN_SAMPLES = 10

    def __init__(self):
        self.feature_engineer = FeatureEngineer()
        self._reference_data: Optional[pd.DataFrame] = None
        self._reference_stats: Dict[str, Tuple[float, float]] = {}  # mean, std

    def set_reference_data(self, runs: List[ProductionRun]):
        """Set reference distribution from training runs."""

        feature_sets = []
        for run in runs:
            fs = self.feature_engineer.engineer_features(run.id, run.sensor_readings)
            feature_sets.append(fs)

        self._reference_data = self.feature_engineer.to_dataframe(feature_sets)

        # Calculate reference statistics
        for col in self._reference_data.columns:
            if col != "run_id":
                values = self._reference_data[col].dropna()
                self._reference_stats[col] = (values.mean(), values.std())

    def detect_drift(
        self, current_runs: List[ProductionRun], top_features: int = 20
    ) -> DriftStatus:
        """Detect drift between reference and current data."""

        if self._reference_data is None or len(self._reference_data) < self.MIN_SAMPLES:
            return DriftStatus(
                overall_status="unknown",
                psi=0.0,
                last_updated=datetime.now(),
            )

        # Engineer features for current runs
        feature_sets = []
        for run in current_runs:
            fs = self.feature_engineer.engineer_features(run.id, run.sensor_readings)
            feature_sets.append(fs)

        current_data = self.feature_engineer.to_dataframe(feature_sets)

        if len(current_data) < self.MIN_SAMPLES:
            return DriftStatus(
                overall_status="insufficient_data",
                psi=0.0,
                last_updated=datetime.now(),
                current_run_count=len(current_data),
            )

        # Get feature columns (exclude run_id)
        feature_cols = [
            col for col in self._reference_data.columns
            if col != "run_id" and col in current_data.columns
        ]

        # Prioritize most important features
        feature_cols = feature_cols[:top_features]

        # Calculate drift for each feature
        feature_drift = {}
        drifted_features = []
        psi_values = []

        for col in feature_cols:
            ref_values = self._reference_data[col].dropna().values
            cur_values = current_data[col].dropna().values

            if len(ref_values) == 0 or len(cur_values) == 0:
                continue

            # KS test
            ks_stat, p_value = stats.ks_2samp(ref_values, cur_values)

            # Calculate means
            ref_mean = np.mean(ref_values)
            cur_mean = np.mean(cur_values)

            # Relative shift
            shift = abs(cur_mean - ref_mean) / (abs(ref_mean) + 1e-8)

            drift_detected = p_value < self.ALPHA

            fd = FeatureDrift(
                feature_name=col,
                ks_statistic=ks_stat,
                p_value=p_value,
                drift_detected=drift_detected,
                reference_mean=ref_mean,
                current_mean=cur_mean,
                shift_magnitude=shift,
            )

            feature_drift[col] = fd

            if drift_detected:
                drifted_features.append(col)

            # Calculate PSI for this feature
            psi = self._calculate_psi(ref_values, cur_values)
            psi_values.append(psi)

        # Overall PSI
        overall_psi = np.mean(psi_values) if psi_values else 0.0

        # Determine overall status
        if overall_psi < self.PSI_STABLE and len(drifted_features) < 3:
            status = "stable"
        elif overall_psi < self.PSI_WARNING or len(drifted_features) < 5:
            status = "warning"
        else:
            status = "critical"

        return DriftStatus(
            overall_status=status,
            psi=overall_psi,
            feature_drift=feature_drift,
            drifted_features=drifted_features,
            last_updated=datetime.now(),
            reference_run_count=len(self._reference_data),
            current_run_count=len(current_data),
        )

    def _calculate_psi(
        self, reference: np.ndarray, current: np.ndarray, bins: int = 10
    ) -> float:
        """Calculate Population Stability Index."""

        # Create bins from combined data
        combined = np.concatenate([reference, current])
        bin_edges = np.histogram_bin_edges(combined, bins=bins)

        # Calculate proportions in each bin
        ref_hist, _ = np.histogram(reference, bins=bin_edges)
        cur_hist, _ = np.histogram(current, bins=bin_edges)

        # Convert to proportions, add small value to avoid division by zero
        ref_prop = (ref_hist + 0.001) / (len(reference) + 0.01)
        cur_prop = (cur_hist + 0.001) / (len(current) + 0.01)

        # PSI formula
        psi = np.sum((cur_prop - ref_prop) * np.log(cur_prop / ref_prop))

        return float(psi)

    def get_drift_summary(self, drift_status: DriftStatus) -> Dict:
        """Get a summary of drift status for dashboard."""

        return {
            "status": drift_status.overall_status,
            "statusColor": self._get_status_color(drift_status.overall_status),
            "psi": drift_status.psi,
            "driftedFeatureCount": len(drift_status.drifted_features),
            "totalFeaturesMonitored": len(drift_status.feature_drift),
            "topDriftedFeatures": [
                {
                    "name": name,
                    "shift": drift_status.feature_drift[name].shift_magnitude,
                }
                for name in drift_status.drifted_features[:5]
            ],
            "recommendation": self._get_recommendation(drift_status),
        }

    def _get_status_color(self, status: str) -> str:
        """Get color for status indicator."""
        return {
            "stable": "green",
            "warning": "yellow",
            "critical": "red",
            "unknown": "gray",
            "insufficient_data": "gray",
        }.get(status, "gray")

    def _get_recommendation(self, drift_status: DriftStatus) -> str:
        """Get recommendation based on drift status."""
        if drift_status.overall_status == "stable":
            return "Model predictions are reliable. Continue normal operations."
        elif drift_status.overall_status == "warning":
            return "Minor drift detected. Monitor closely and consider model retraining if drift persists."
        elif drift_status.overall_status == "critical":
            return "Significant drift detected. Model retraining recommended. Verify process conditions."
        else:
            return "Insufficient data to assess drift. Continue collecting data."
