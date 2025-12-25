"""Feature engineering for virtual metrology models."""
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from app.simulation.sensors import SensorReading


@dataclass
class FeatureSet:
    """Engineered features for a single run."""

    run_id: str
    features: Dict[str, float]
    feature_names: List[str]

    def to_array(self) -> np.ndarray:
        """Convert to numpy array in consistent order."""
        return np.array([self.features[name] for name in self.feature_names])


class FeatureEngineer:
    """Engineer features from sensor time-series data."""

    # Sensor columns to engineer features from
    SENSOR_COLUMNS = [
        "plasma_temp_c",
        "plasma_power_kw",
        "primary_gas_flow_slpm",
        "secondary_gas_flow_slpm",
        "powder_feed_rate_g_min",
        "carrier_gas_flow_slpm",
        "substrate_temp_c",
        "spray_distance_mm",
        "chamber_pressure_mbar",
        "ambient_temp_c",
        "ambient_humidity_pct",
        "deposition_rate_um_s",
    ]

    # Rolling window sizes in seconds
    WINDOW_SIZES = [5, 15, 30]

    def __init__(self):
        self._feature_names: Optional[List[str]] = None

    def readings_to_dataframe(self, readings: List[SensorReading]) -> pd.DataFrame:
        """Convert sensor readings to pandas DataFrame."""
        data = []
        for r in readings:
            data.append({
                "time_seconds": r.time_seconds,
                "plasma_temp_c": r.plasma_temp_c,
                "plasma_power_kw": r.plasma_power_kw,
                "primary_gas_flow_slpm": r.primary_gas_flow_slpm,
                "secondary_gas_flow_slpm": r.secondary_gas_flow_slpm,
                "powder_feed_rate_g_min": r.powder_feed_rate_g_min,
                "carrier_gas_flow_slpm": r.carrier_gas_flow_slpm,
                "substrate_temp_c": r.substrate_temp_c,
                "spray_distance_mm": r.spray_distance_mm,
                "chamber_pressure_mbar": r.chamber_pressure_mbar,
                "ambient_temp_c": r.ambient_temp_c,
                "ambient_humidity_pct": r.ambient_humidity_pct,
                "deposition_rate_um_s": r.deposition_rate_um_s,
            })
        return pd.DataFrame(data)

    def engineer_features(
        self, run_id: str, readings: List[SensorReading]
    ) -> FeatureSet:
        """Engineer all features from sensor readings."""
        df = self.readings_to_dataframe(readings)
        features = {}

        # Basic statistics for each sensor
        for col in self.SENSOR_COLUMNS:
            features[f"{col}_mean"] = df[col].mean()
            features[f"{col}_std"] = df[col].std()
            features[f"{col}_min"] = df[col].min()
            features[f"{col}_max"] = df[col].max()
            features[f"{col}_range"] = df[col].max() - df[col].min()
            features[f"{col}_median"] = df[col].median()

            # Trend (slope of linear fit)
            if len(df) > 1:
                x = df["time_seconds"].values
                y = df[col].values
                slope = np.polyfit(x, y, 1)[0]
                features[f"{col}_trend"] = slope

            # Rate of change statistics
            diff = df[col].diff().dropna()
            features[f"{col}_diff_mean"] = diff.mean() if len(diff) > 0 else 0
            features[f"{col}_diff_std"] = diff.std() if len(diff) > 0 else 0

        # Rolling statistics (using index-based windows since 1Hz sampling)
        for window in self.WINDOW_SIZES:
            for col in self.SENSOR_COLUMNS:
                roll = df[col].rolling(window=window, min_periods=1)

                # Last window statistics (end of run)
                features[f"{col}_roll{window}_last_mean"] = roll.mean().iloc[-1]
                features[f"{col}_roll{window}_last_std"] = roll.std().iloc[-1] or 0

                # Max rolling std (indicates instability)
                features[f"{col}_roll{window}_max_std"] = roll.std().max() or 0

        # Cross-sensor engineered features
        features["energy_density"] = (
            df["plasma_power_kw"].mean() /
            (df["primary_gas_flow_slpm"].mean() + df["secondary_gas_flow_slpm"].mean())
        )

        features["substrate_delta_t"] = (
            df["substrate_temp_c"].mean() - df["ambient_temp_c"].mean()
        )

        features["substrate_temp_rise"] = (
            df["substrate_temp_c"].iloc[-1] - df["substrate_temp_c"].iloc[0]
        )

        features["gas_ratio"] = (
            df["primary_gas_flow_slpm"].mean() / df["secondary_gas_flow_slpm"].mean()
        )

        features["powder_to_carrier_ratio"] = (
            df["powder_feed_rate_g_min"].mean() / df["carrier_gas_flow_slpm"].mean()
        )

        features["total_deposition"] = df["deposition_rate_um_s"].sum()

        features["deposition_efficiency"] = (
            df["deposition_rate_um_s"].mean() /
            df["powder_feed_rate_g_min"].mean() * 1000
        )

        features["spray_distance_variation"] = (
            df["spray_distance_mm"].std() / df["spray_distance_mm"].mean()
        )

        features["plasma_stability"] = (
            1 - df["plasma_power_kw"].std() / df["plasma_power_kw"].mean()
        )

        features["run_duration"] = df["time_seconds"].max()

        # Store feature names for consistent ordering
        feature_names = sorted(features.keys())
        self._feature_names = feature_names

        return FeatureSet(
            run_id=run_id,
            features=features,
            feature_names=feature_names,
        )

    def engineer_batch(
        self, runs: List[Tuple[str, List[SensorReading]]]
    ) -> List[FeatureSet]:
        """Engineer features for multiple runs."""
        return [self.engineer_features(run_id, readings) for run_id, readings in runs]

    def to_dataframe(self, feature_sets: List[FeatureSet]) -> pd.DataFrame:
        """Convert list of feature sets to DataFrame."""
        if not feature_sets:
            return pd.DataFrame()

        data = []
        for fs in feature_sets:
            row = {"run_id": fs.run_id, **fs.features}
            data.append(row)

        return pd.DataFrame(data)

    @property
    def feature_names(self) -> Optional[List[str]]:
        """Get feature names from last engineering run."""
        return self._feature_names

    def get_feature_vector(
        self, features: Dict[str, float], feature_names: List[str]
    ) -> np.ndarray:
        """Get feature vector in specified order."""
        return np.array([features.get(name, 0.0) for name in feature_names])
