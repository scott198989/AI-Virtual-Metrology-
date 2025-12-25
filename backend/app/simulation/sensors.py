"""Sensor data generation for thermal coating process."""
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta
from .noise import NoiseGenerator, NoiseConfig


@dataclass
class SetupParams:
    """Static setup parameters for a coating run."""

    substrate_material: str = "steel"  # steel, aluminum, titanium
    coating_material: str = "YSZ"  # YSZ, alumina, chromium
    target_thickness_um: float = 300.0  # Target coating thickness in microns
    spray_distance_mm: float = 120.0  # Nozzle-to-substrate distance
    robot_speed_mm_s: float = 500.0  # Traverse speed


@dataclass
class ProcessBaselines:
    """Baseline process parameters for thermal spray coating."""

    # Primary plasma parameters
    plasma_temp_c: float = 12000.0  # 8000-15000C
    plasma_power_kw: float = 55.0  # 30-80 kW
    primary_gas_flow_slpm: float = 45.0  # Argon: 30-60 SLPM
    secondary_gas_flow_slpm: float = 10.0  # H2: 5-15 SLPM

    # Powder parameters
    powder_feed_rate_g_min: float = 50.0  # 20-80 g/min
    carrier_gas_flow_slpm: float = 5.0  # 3-8 SLPM

    # Environmental
    substrate_temp_c: float = 200.0  # 100-400C
    chamber_pressure_mbar: float = 1013.0  # ~1 atm
    ambient_temp_c: float = 25.0
    ambient_humidity_pct: float = 45.0


@dataclass
class SensorReading:
    """Single timestep sensor reading."""

    timestamp: datetime
    time_seconds: float

    # Primary process params
    plasma_temp_c: float
    plasma_power_kw: float
    primary_gas_flow_slpm: float
    secondary_gas_flow_slpm: float
    powder_feed_rate_g_min: float
    carrier_gas_flow_slpm: float

    # Secondary sensors
    substrate_temp_c: float
    spray_distance_mm: float
    chamber_pressure_mbar: float
    ambient_temp_c: float
    ambient_humidity_pct: float

    # Derived
    deposition_rate_um_s: float


class SensorDataGenerator:
    """Generate realistic time-series sensor data for thermal coating."""

    MATERIAL_MODIFIERS = {
        "steel": {"temp_factor": 1.0, "power_factor": 1.0},
        "aluminum": {"temp_factor": 0.85, "power_factor": 0.9},
        "titanium": {"temp_factor": 1.1, "power_factor": 1.15},
    }

    COATING_MODIFIERS = {
        "YSZ": {"feed_factor": 1.0, "temp_factor": 1.0},
        "alumina": {"feed_factor": 0.9, "temp_factor": 0.95},
        "chromium": {"feed_factor": 1.1, "temp_factor": 1.05},
    }

    def __init__(
        self,
        baselines: Optional[ProcessBaselines] = None,
        noise_config: Optional[NoiseConfig] = None,
        seed: int = 42,
    ):
        self.baselines = baselines or ProcessBaselines()
        self.noise_gen = NoiseGenerator(noise_config, seed)
        self.rng = np.random.default_rng(seed)

    def generate_run_data(
        self,
        setup: SetupParams,
        duration_seconds: int = 120,
        sample_rate_hz: float = 1.0,
        start_time: Optional[datetime] = None,
        is_ood: bool = False,
    ) -> list[SensorReading]:
        """Generate complete sensor data for a coating run."""

        self.noise_gen.reset_drift()
        start_time = start_time or datetime.now()

        num_samples = int(duration_seconds * sample_rate_hz)
        timestamps = np.linspace(0, duration_seconds, num_samples)

        # Get material and coating modifiers
        mat_mod = self.MATERIAL_MODIFIERS.get(
            setup.substrate_material, {"temp_factor": 1.0, "power_factor": 1.0}
        )
        coat_mod = self.COATING_MODIFIERS.get(
            setup.coating_material, {"feed_factor": 1.0, "temp_factor": 1.0}
        )

        # OOD factor affects all parameters
        ood_factor = 1.0 + (self.rng.uniform(-0.2, 0.2) if is_ood else 0.0)

        # Generate base signals with process dynamics
        readings = []

        # Simulate process dynamics
        plasma_temp_base = (
            self.baselines.plasma_temp_c * mat_mod["temp_factor"] * coat_mod["temp_factor"]
        )
        plasma_power_base = self.baselines.plasma_power_kw * mat_mod["power_factor"]
        powder_feed_base = self.baselines.powder_feed_rate_g_min * coat_mod["feed_factor"]

        # Add slow variations (process oscillations)
        oscillation_period = self.rng.uniform(20, 40)  # seconds
        oscillation_amplitude = 0.02  # 2%

        for i, t in enumerate(timestamps):
            # Time-varying oscillation
            osc = 1 + oscillation_amplitude * np.sin(2 * np.pi * t / oscillation_period)

            # Calculate sensor values with dynamics
            plasma_temp = plasma_temp_base * osc * ood_factor
            plasma_power = plasma_power_base * osc * ood_factor

            # Power affects temperature (feedback)
            plasma_temp *= 0.5 + 0.5 * (plasma_power / plasma_power_base)

            # Gas flows with small variations
            primary_gas = self.baselines.primary_gas_flow_slpm * (
                1 + self.rng.normal(0, 0.01)
            )
            secondary_gas = self.baselines.secondary_gas_flow_slpm * (
                1 + self.rng.normal(0, 0.01)
            )

            # Powder feed with process variation
            powder_feed = powder_feed_base * osc * ood_factor

            # Carrier gas tracks powder feed
            carrier_gas = self.baselines.carrier_gas_flow_slpm * (
                0.9 + 0.2 * powder_feed / powder_feed_base
            )

            # Substrate temperature rises over time
            substrate_temp_rise = 100 * (1 - np.exp(-t / 60))  # Asymptotic rise
            substrate_temp = self.baselines.substrate_temp_c + substrate_temp_rise

            # Spray distance with slight drift
            spray_distance = setup.spray_distance_mm * (
                1 + 0.02 * np.sin(2 * np.pi * t / 30)  # Robot oscillation
            )

            # Chamber pressure slightly varies
            chamber_pressure = self.baselines.chamber_pressure_mbar * (
                1 + self.rng.normal(0, 0.002)
            )

            # Ambient conditions slowly drift
            ambient_temp = self.baselines.ambient_temp_c + 0.5 * np.sin(
                2 * np.pi * t / 120
            )
            ambient_humidity = self.baselines.ambient_humidity_pct + 2 * np.sin(
                2 * np.pi * t / 180
            )

            # Calculate deposition rate based on process conditions
            # Higher power & feed -> higher deposition
            deposition_rate = self._calculate_deposition_rate(
                plasma_power, powder_feed, spray_distance, setup.robot_speed_mm_s
            )

            # Apply sensor noise
            reading = SensorReading(
                timestamp=start_time + timedelta(seconds=float(t)),
                time_seconds=float(t),
                plasma_temp_c=self.noise_gen.add_sensor_noise(plasma_temp, "plasma_temp"),
                plasma_power_kw=self.noise_gen.add_sensor_noise(
                    plasma_power, "plasma_power"
                ),
                primary_gas_flow_slpm=self.noise_gen.add_sensor_noise(
                    primary_gas, "primary_gas"
                ),
                secondary_gas_flow_slpm=self.noise_gen.add_sensor_noise(
                    secondary_gas, "secondary_gas"
                ),
                powder_feed_rate_g_min=self.noise_gen.add_sensor_noise(
                    powder_feed, "powder_feed"
                ),
                carrier_gas_flow_slpm=self.noise_gen.add_sensor_noise(
                    carrier_gas, "carrier_gas"
                ),
                substrate_temp_c=self.noise_gen.add_sensor_noise(
                    substrate_temp, "substrate_temp"
                ),
                spray_distance_mm=self.noise_gen.add_sensor_noise(
                    spray_distance, "spray_distance"
                ),
                chamber_pressure_mbar=self.noise_gen.add_sensor_noise(
                    chamber_pressure, "chamber_pressure"
                ),
                ambient_temp_c=self.noise_gen.add_sensor_noise(
                    ambient_temp, "ambient_temp"
                ),
                ambient_humidity_pct=self.noise_gen.add_sensor_noise(
                    ambient_humidity, "ambient_humidity"
                ),
                deposition_rate_um_s=self.noise_gen.add_sensor_noise(
                    deposition_rate, "deposition_rate"
                ),
            )
            readings.append(reading)

        return readings

    def _calculate_deposition_rate(
        self,
        plasma_power: float,
        powder_feed: float,
        spray_distance: float,
        robot_speed: float,
    ) -> float:
        """Calculate instantaneous deposition rate in um/s."""
        # Base deposition efficiency
        power_factor = plasma_power / 55.0  # Normalized to baseline
        feed_factor = powder_feed / 50.0

        # Distance affects deposition (inverse relationship)
        distance_factor = 120.0 / spray_distance

        # Speed affects dwell time (inverse relationship)
        speed_factor = 500.0 / robot_speed

        # Base rate ~ 2.5 um/s at standard conditions
        base_rate = 2.5

        return (
            base_rate * power_factor * feed_factor * distance_factor * speed_factor
        )

    def set_seed(self, seed: int):
        """Set random seed for reproducibility."""
        self.rng = np.random.default_rng(seed)
        self.noise_gen.set_seed(seed)
