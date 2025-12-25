"""Noise and variation generation for realistic sensor simulation."""
import numpy as np
from typing import Optional
from dataclasses import dataclass


@dataclass
class NoiseConfig:
    """Configuration for noise generation."""

    sensor_noise_pct: float = 0.02  # 2% Gaussian noise
    drift_rate_per_min: float = 0.001  # 0.1% drift per minute
    batch_variation_pct: float = 0.03  # 3% batch-to-batch variation
    ood_probability: float = 0.05  # 5% chance of OOD run


class NoiseGenerator:
    """Generate realistic noise, drift, and variation for sensor data."""

    def __init__(self, config: Optional[NoiseConfig] = None, seed: int = 42):
        self.config = config or NoiseConfig()
        self.rng = np.random.default_rng(seed)
        self._drift_state: dict[str, float] = {}

    def add_sensor_noise(self, value: float, sensor_name: str) -> float:
        """Add Gaussian noise to a sensor reading."""
        noise = self.rng.normal(0, value * self.config.sensor_noise_pct)
        return value + noise

    def add_sensor_noise_array(
        self, values: np.ndarray, sensor_name: str
    ) -> np.ndarray:
        """Add Gaussian noise to an array of sensor readings."""
        noise = self.rng.normal(0, np.abs(values) * self.config.sensor_noise_pct)
        return values + noise

    def get_drift(self, sensor_name: str, time_minutes: float) -> float:
        """Get cumulative drift for a sensor over time (random walk)."""
        if sensor_name not in self._drift_state:
            self._drift_state[sensor_name] = 0.0

        # Random walk step
        step = self.rng.normal(0, self.config.drift_rate_per_min * time_minutes)
        self._drift_state[sensor_name] += step
        return self._drift_state[sensor_name]

    def apply_drift(
        self, values: np.ndarray, sensor_name: str, timestamps_min: np.ndarray
    ) -> np.ndarray:
        """Apply cumulative drift to sensor values over time."""
        drifted = values.copy()
        cumulative_drift = 0.0

        for i, t in enumerate(timestamps_min):
            if i > 0:
                dt = t - timestamps_min[i - 1]
                step = self.rng.normal(0, self.config.drift_rate_per_min * dt)
                cumulative_drift += step
            drifted[i] = values[i] * (1 + cumulative_drift)

        return drifted

    def get_batch_variation(self, base_value: float) -> float:
        """Get batch-specific variation factor."""
        variation = self.rng.normal(1.0, self.config.batch_variation_pct)
        return base_value * variation

    def is_ood_run(self) -> bool:
        """Determine if this run should be out-of-distribution."""
        return self.rng.random() < self.config.ood_probability

    def get_ood_factor(self) -> float:
        """Get OOD perturbation factor (1.0 for normal, varies for OOD)."""
        if self.is_ood_run():
            # Either significantly higher or lower
            direction = self.rng.choice([-1, 1])
            magnitude = self.rng.uniform(0.15, 0.30)  # 15-30% deviation
            return 1.0 + direction * magnitude
        return 1.0

    def reset_drift(self):
        """Reset drift state for new run."""
        self._drift_state.clear()

    def set_seed(self, seed: int):
        """Set random seed for reproducibility."""
        self.rng = np.random.default_rng(seed)
        self._drift_state.clear()
