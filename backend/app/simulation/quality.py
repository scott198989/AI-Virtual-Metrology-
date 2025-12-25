"""Quality outcome generation based on process physics."""
import numpy as np
from dataclasses import dataclass
from typing import List
from .sensors import SensorReading, SetupParams


@dataclass
class QualityMetrics:
    """Final quality metrics for a coating run."""

    run_id: str

    # Continuous metrics
    thickness_um: float  # Actual coating thickness
    thickness_uniformity_pct: float  # Std dev / mean (lower is better)
    porosity_pct: float  # 0-15% (lower is better)
    adhesion_strength_mpa: float  # Bond strength (higher is better)
    surface_roughness_ra: float  # Ra value in microns (lower is better)

    # Categorical defects
    has_delamination: bool
    has_cracks: bool
    has_voids: bool

    @property
    def defect_flag(self) -> bool:
        """Any critical defect present."""
        return self.has_delamination or self.has_cracks or self.has_voids

    @property
    def quality_grade(self) -> str:
        """Overall quality grade based on metrics."""
        if self.defect_flag:
            return "reject"

        score = 0
        # Thickness within 5% of target gets points
        # Porosity under 5% is good
        if self.porosity_pct < 3:
            score += 3
        elif self.porosity_pct < 5:
            score += 2
        elif self.porosity_pct < 8:
            score += 1

        # Uniformity under 5% is excellent
        if self.thickness_uniformity_pct < 3:
            score += 3
        elif self.thickness_uniformity_pct < 5:
            score += 2
        elif self.thickness_uniformity_pct < 8:
            score += 1

        # Adhesion over 40 MPa is excellent
        if self.adhesion_strength_mpa > 50:
            score += 3
        elif self.adhesion_strength_mpa > 40:
            score += 2
        elif self.adhesion_strength_mpa > 30:
            score += 1

        # Roughness under 5 um is good
        if self.surface_roughness_ra < 3:
            score += 2
        elif self.surface_roughness_ra < 5:
            score += 1

        if score >= 9:
            return "A"
        elif score >= 6:
            return "B"
        elif score >= 3:
            return "C"
        else:
            return "reject"


class QualityCalculator:
    """Calculate quality outcomes from process data using physics-based model."""

    SUBSTRATE_ADHESION = {
        "steel": 45.0,  # MPa baseline
        "aluminum": 35.0,
        "titanium": 55.0,
    }

    COATING_POROSITY = {
        "YSZ": 5.0,  # % baseline
        "alumina": 4.0,
        "chromium": 3.0,
    }

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def calculate_quality(
        self,
        run_id: str,
        setup: SetupParams,
        readings: List[SensorReading],
        is_ood: bool = False,
    ) -> QualityMetrics:
        """Calculate final quality metrics from sensor readings."""

        # Extract time series data
        plasma_temps = np.array([r.plasma_temp_c for r in readings])
        plasma_powers = np.array([r.plasma_power_kw for r in readings])
        powder_feeds = np.array([r.powder_feed_rate_g_min for r in readings])
        substrate_temps = np.array([r.substrate_temp_c for r in readings])
        spray_distances = np.array([r.spray_distance_mm for r in readings])
        deposition_rates = np.array([r.deposition_rate_um_s for r in readings])

        # Calculate derived process states
        particle_temp = self._calc_particle_temperature(
            plasma_temps, plasma_powers
        )
        particle_velocity = self._calc_particle_velocity(
            plasma_powers, powder_feeds
        )
        splat_quality = self._calc_splat_quality(
            particle_temp, particle_velocity, spray_distances
        )
        thermal_stress = self._calc_thermal_stress(
            substrate_temps, deposition_rates
        )

        # Calculate quality metrics
        thickness = self._calc_thickness(deposition_rates, readings)
        thickness_uniformity = self._calc_uniformity(deposition_rates)
        porosity = self._calc_porosity(setup, splat_quality, particle_velocity)
        adhesion = self._calc_adhesion(
            setup, substrate_temps, thermal_stress
        )
        roughness = self._calc_roughness(splat_quality, spray_distances)

        # Calculate defect probabilities
        delamination_prob = self._calc_delamination_prob(
            thermal_stress, adhesion
        )
        crack_prob = self._calc_crack_prob(thermal_stress, thickness)
        void_prob = self._calc_void_prob(porosity, splat_quality)

        # OOD runs have higher defect probability
        if is_ood:
            delamination_prob *= 1.5
            crack_prob *= 1.5
            void_prob *= 1.5

        # Sample defects based on probabilities
        has_delamination = self.rng.random() < delamination_prob
        has_cracks = self.rng.random() < crack_prob
        has_voids = self.rng.random() < void_prob

        return QualityMetrics(
            run_id=run_id,
            thickness_um=thickness,
            thickness_uniformity_pct=thickness_uniformity,
            porosity_pct=porosity,
            adhesion_strength_mpa=adhesion,
            surface_roughness_ra=roughness,
            has_delamination=has_delamination,
            has_cracks=has_cracks,
            has_voids=has_voids,
        )

    def _calc_particle_temperature(
        self, plasma_temps: np.ndarray, plasma_powers: np.ndarray
    ) -> float:
        """Calculate average particle temperature in flight."""
        # Particles reach ~60-80% of plasma temperature
        efficiency = 0.7 + 0.1 * (np.mean(plasma_powers) / 55 - 1)
        return np.mean(plasma_temps) * efficiency

    def _calc_particle_velocity(
        self, plasma_powers: np.ndarray, powder_feeds: np.ndarray
    ) -> float:
        """Calculate average particle velocity in m/s."""
        # Higher power = faster particles, higher feed = slower (momentum transfer)
        base_velocity = 200  # m/s typical
        power_factor = np.mean(plasma_powers) / 55
        feed_factor = 50 / np.mean(powder_feeds)
        return base_velocity * power_factor * np.sqrt(feed_factor)

    def _calc_splat_quality(
        self,
        particle_temp: float,
        particle_velocity: float,
        spray_distances: np.ndarray,
    ) -> float:
        """Calculate splat formation quality (0-1 scale)."""
        # Optimal particle temp around 70% of melting point
        temp_quality = 1 - abs(particle_temp - 8400) / 8400

        # Optimal velocity around 200 m/s
        vel_quality = 1 - abs(particle_velocity - 200) / 200

        # Optimal spray distance around 120mm
        dist_quality = 1 - abs(np.mean(spray_distances) - 120) / 120

        return np.clip(0.4 * temp_quality + 0.3 * vel_quality + 0.3 * dist_quality, 0, 1)

    def _calc_thermal_stress(
        self, substrate_temps: np.ndarray, deposition_rates: np.ndarray
    ) -> float:
        """Calculate thermal stress index (higher is worse)."""
        # Fast heating with high deposition = more stress
        temp_gradient = np.max(substrate_temps) - np.min(substrate_temps)
        avg_deposition = np.mean(deposition_rates)

        return temp_gradient * avg_deposition / 100  # Normalized

    def _calc_thickness(
        self, deposition_rates: np.ndarray, readings: List[SensorReading]
    ) -> float:
        """Calculate total coating thickness from deposition rates."""
        # Integrate deposition rate over time
        duration = readings[-1].time_seconds - readings[0].time_seconds
        dt = duration / len(readings)

        total_thickness = np.sum(deposition_rates) * dt

        # Add noise
        total_thickness *= 1 + self.rng.normal(0, 0.02)

        return max(0, total_thickness)

    def _calc_uniformity(self, deposition_rates: np.ndarray) -> float:
        """Calculate thickness uniformity as coefficient of variation."""
        cv = np.std(deposition_rates) / np.mean(deposition_rates) * 100
        return max(0, cv + self.rng.normal(0, 0.5))

    def _calc_porosity(
        self, setup: SetupParams, splat_quality: float, particle_velocity: float
    ) -> float:
        """Calculate coating porosity percentage."""
        base_porosity = self.COATING_POROSITY.get(setup.coating_material, 5.0)

        # Poor splat quality increases porosity
        splat_factor = 2 - splat_quality

        # Too fast or slow particles = more porosity
        vel_factor = 1 + abs(particle_velocity - 200) / 200

        porosity = base_porosity * splat_factor * vel_factor
        porosity += self.rng.normal(0, 0.5)

        return np.clip(porosity, 0, 20)

    def _calc_adhesion(
        self,
        setup: SetupParams,
        substrate_temps: np.ndarray,
        thermal_stress: float,
    ) -> float:
        """Calculate coating adhesion strength in MPa."""
        base_adhesion = self.SUBSTRATE_ADHESION.get(setup.substrate_material, 40.0)

        # Optimal substrate temp around 250-300C for good bonding
        avg_temp = np.mean(substrate_temps)
        temp_factor = 1 - abs(avg_temp - 275) / 275

        # High thermal stress reduces adhesion
        stress_factor = max(0.5, 1 - thermal_stress * 0.2)

        adhesion = base_adhesion * (0.7 + 0.3 * temp_factor) * stress_factor
        adhesion += self.rng.normal(0, 2)

        return max(10, adhesion)

    def _calc_roughness(
        self, splat_quality: float, spray_distances: np.ndarray
    ) -> float:
        """Calculate surface roughness Ra in microns."""
        # Base roughness around 4-6 um
        base_ra = 5.0

        # Poor splat quality = rougher surface
        splat_factor = 2 - splat_quality

        # Distance variation = rougher surface
        dist_variation = np.std(spray_distances) / np.mean(spray_distances)
        dist_factor = 1 + dist_variation * 2

        roughness = base_ra * splat_factor * dist_factor
        roughness += self.rng.normal(0, 0.3)

        return max(1, roughness)

    def _calc_delamination_prob(
        self, thermal_stress: float, adhesion: float
    ) -> float:
        """Calculate probability of delamination defect."""
        # High stress + low adhesion = delamination
        base_prob = 0.02
        stress_factor = thermal_stress * 0.5
        adhesion_factor = max(0, (40 - adhesion) / 40)

        return np.clip(base_prob + stress_factor + adhesion_factor * 0.1, 0, 1)

    def _calc_crack_prob(self, thermal_stress: float, thickness: float) -> float:
        """Calculate probability of cracking defect."""
        base_prob = 0.02
        stress_factor = thermal_stress * 0.3

        # Thicker coatings more prone to cracking
        thickness_factor = max(0, (thickness - 300) / 300) * 0.1

        return np.clip(base_prob + stress_factor + thickness_factor, 0, 1)

    def _calc_void_prob(self, porosity: float, splat_quality: float) -> float:
        """Calculate probability of void defect."""
        base_prob = 0.02

        # High porosity increases void risk
        porosity_factor = max(0, (porosity - 5) / 10) * 0.15

        # Poor splat quality increases void risk
        splat_factor = max(0, 0.7 - splat_quality) * 0.1

        return np.clip(base_prob + porosity_factor + splat_factor, 0, 1)

    def set_seed(self, seed: int):
        """Set random seed for reproducibility."""
        self.rng = np.random.default_rng(seed)
