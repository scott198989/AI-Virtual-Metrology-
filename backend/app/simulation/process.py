"""Main thermal coating simulation orchestrator."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import numpy as np

from .sensors import SensorDataGenerator, SensorReading, SetupParams
from .quality import QualityCalculator, QualityMetrics
from .noise import NoiseConfig


@dataclass
class ProductionRun:
    """Complete production run data."""

    id: str
    batch_id: str
    start_time: datetime
    end_time: datetime
    status: str  # "running", "completed", "failed"
    setup_params: SetupParams
    sensor_readings: List[SensorReading] = field(default_factory=list)
    quality_metrics: Optional[QualityMetrics] = None
    is_ood: bool = False

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "batchId": self.batch_id,
            "startTime": self.start_time.isoformat(),
            "endTime": self.end_time.isoformat() if self.end_time else None,
            "status": self.status,
            "isOod": self.is_ood,
            "setupParams": {
                "substrateMaterial": self.setup_params.substrate_material,
                "coatingMaterial": self.setup_params.coating_material,
                "targetThicknessUm": self.setup_params.target_thickness_um,
                "sprayDistanceMm": self.setup_params.spray_distance_mm,
                "robotSpeedMmS": self.setup_params.robot_speed_mm_s,
            },
            "qualityMetrics": self._quality_to_dict() if self.quality_metrics else None,
        }

    def _quality_to_dict(self) -> dict:
        """Convert quality metrics to dictionary."""
        q = self.quality_metrics
        return {
            "thicknessUm": round(q.thickness_um, 2),
            "thicknessUniformityPct": round(q.thickness_uniformity_pct, 2),
            "porosityPct": round(q.porosity_pct, 2),
            "adhesionStrengthMpa": round(q.adhesion_strength_mpa, 2),
            "surfaceRoughnessRa": round(q.surface_roughness_ra, 2),
            "hasDelamination": q.has_delamination,
            "hasCracks": q.has_cracks,
            "hasVoids": q.has_voids,
            "defectFlag": q.defect_flag,
            "qualityGrade": q.quality_grade,
        }


class ThermalCoatingSimulator:
    """Orchestrates complete thermal coating process simulation."""

    SUBSTRATE_MATERIALS = ["steel", "aluminum", "titanium"]
    COATING_MATERIALS = ["YSZ", "alumina", "chromium"]

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        self.sensor_gen = SensorDataGenerator(seed=seed)
        self.quality_calc = QualityCalculator(seed=seed)
        self.runs: Dict[str, ProductionRun] = {}

    def generate_dataset(
        self,
        num_runs: int = 50,
        duration_seconds: int = 120,
        sample_rate_hz: float = 1.0,
        start_date: Optional[datetime] = None,
    ) -> List[ProductionRun]:
        """Generate a complete dataset of production runs."""

        start_date = start_date or datetime.now() - timedelta(days=7)
        runs = []

        for i in range(num_runs):
            # Generate run with random setup params
            run = self.generate_single_run(
                duration_seconds=duration_seconds,
                sample_rate_hz=sample_rate_hz,
                start_time=start_date + timedelta(hours=i * 3),
                run_index=i,
            )
            runs.append(run)
            self.runs[run.id] = run

        return runs

    def generate_single_run(
        self,
        duration_seconds: int = 120,
        sample_rate_hz: float = 1.0,
        start_time: Optional[datetime] = None,
        run_index: Optional[int] = None,
        setup: Optional[SetupParams] = None,
    ) -> ProductionRun:
        """Generate a single production run with all data."""

        run_id = str(uuid.uuid4())[:8]
        batch_id = f"BATCH-{self.rng.integers(1000, 9999)}"
        start_time = start_time or datetime.now()

        # Generate or use provided setup params
        if setup is None:
            setup = self._generate_random_setup()

        # Determine if this is an OOD run (5% chance)
        is_ood = self.rng.random() < 0.05

        # Generate sensor readings
        sensor_readings = self.sensor_gen.generate_run_data(
            setup=setup,
            duration_seconds=duration_seconds,
            sample_rate_hz=sample_rate_hz,
            start_time=start_time,
            is_ood=is_ood,
        )

        # Calculate quality metrics
        quality_metrics = self.quality_calc.calculate_quality(
            run_id=run_id,
            setup=setup,
            readings=sensor_readings,
            is_ood=is_ood,
        )

        # Determine run status
        status = "completed"
        if quality_metrics.defect_flag and self.rng.random() < 0.3:
            status = "failed"

        end_time = start_time + timedelta(seconds=duration_seconds)

        run = ProductionRun(
            id=run_id,
            batch_id=batch_id,
            start_time=start_time,
            end_time=end_time,
            status=status,
            setup_params=setup,
            sensor_readings=sensor_readings,
            quality_metrics=quality_metrics,
            is_ood=is_ood,
        )

        self.runs[run_id] = run
        return run

    def _generate_random_setup(self) -> SetupParams:
        """Generate random but realistic setup parameters."""
        return SetupParams(
            substrate_material=self.rng.choice(self.SUBSTRATE_MATERIALS),
            coating_material=self.rng.choice(self.COATING_MATERIALS),
            target_thickness_um=float(self.rng.uniform(200, 400)),
            spray_distance_mm=float(self.rng.uniform(100, 140)),
            robot_speed_mm_s=float(self.rng.uniform(400, 600)),
        )

    def get_run(self, run_id: str) -> Optional[ProductionRun]:
        """Get a production run by ID."""
        return self.runs.get(run_id)

    def get_all_runs(self) -> List[ProductionRun]:
        """Get all production runs."""
        return list(self.runs.values())

    def get_timeseries_data(self, run_id: str) -> Optional[List[dict]]:
        """Get time series data for a run in API-friendly format."""
        run = self.runs.get(run_id)
        if not run:
            return None

        return [
            {
                "timestamp": r.timestamp.isoformat(),
                "timeSeconds": r.time_seconds,
                "plasmaTempC": round(r.plasma_temp_c, 1),
                "plasmaPowerKw": round(r.plasma_power_kw, 2),
                "primaryGasFlowSlpm": round(r.primary_gas_flow_slpm, 2),
                "secondaryGasFlowSlpm": round(r.secondary_gas_flow_slpm, 2),
                "powderFeedRateGMin": round(r.powder_feed_rate_g_min, 2),
                "carrierGasFlowSlpm": round(r.carrier_gas_flow_slpm, 2),
                "substrateTempC": round(r.substrate_temp_c, 1),
                "sprayDistanceMm": round(r.spray_distance_mm, 2),
                "chamberPressureMbar": round(r.chamber_pressure_mbar, 1),
                "ambientTempC": round(r.ambient_temp_c, 1),
                "ambientHumidityPct": round(r.ambient_humidity_pct, 1),
                "depositionRateUmS": round(r.deposition_rate_um_s, 3),
            }
            for r in run.sensor_readings
        ]

    def reset(self, seed: Optional[int] = None):
        """Reset simulator state."""
        if seed is not None:
            self.seed = seed
        self.rng = np.random.default_rng(self.seed)
        self.sensor_gen.set_seed(self.seed)
        self.quality_calc.set_seed(self.seed)
        self.runs.clear()

    def get_summary_statistics(self) -> dict:
        """Get summary statistics across all runs."""
        if not self.runs:
            return {}

        runs = list(self.runs.values())
        qualities = [r.quality_metrics for r in runs if r.quality_metrics]

        grades = {"A": 0, "B": 0, "C": 0, "reject": 0}
        for q in qualities:
            grades[q.quality_grade] = grades.get(q.quality_grade, 0) + 1

        return {
            "totalRuns": len(runs),
            "completedRuns": sum(1 for r in runs if r.status == "completed"),
            "failedRuns": sum(1 for r in runs if r.status == "failed"),
            "oodRuns": sum(1 for r in runs if r.is_ood),
            "averageThickness": round(
                np.mean([q.thickness_um for q in qualities]), 2
            ),
            "averagePorosity": round(
                np.mean([q.porosity_pct for q in qualities]), 2
            ),
            "defectRate": round(
                sum(1 for q in qualities if q.defect_flag) / len(qualities) * 100, 1
            ),
            "gradeDistribution": grades,
        }
