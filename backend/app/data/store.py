"""In-memory data store for the application."""
from typing import Optional, List, Dict
from datetime import datetime

from app.simulation.process import ThermalCoatingSimulator, ProductionRun
from app.models.registry import ModelRegistry
from app.models.training import ModelTrainer, TrainingResult
from app.models.inference import ModelInference, QualityPrediction
from app.models.uncertainty import UncertaintyEstimator
from app.drift.detection import DriftDetector, DriftStatus
from app.config import get_settings


class DataStore:
    """Central data store managing simulation, models, and drift detection."""

    def __init__(self, seed: int = 42):
        self.settings = get_settings()
        self.seed = seed

        # Initialize components
        self.simulator = ThermalCoatingSimulator(seed=seed)
        self.registry = ModelRegistry(model_dir=self.settings.model_dir)
        self.trainer = ModelTrainer(self.registry)
        self.inference: Optional[ModelInference] = None
        self.uncertainty: Optional[UncertaintyEstimator] = None
        self.drift_detector = DriftDetector()

        # State
        self._initialized = False
        self._training_result: Optional[TrainingResult] = None
        self._last_drift_status: Optional[DriftStatus] = None

    def initialize(self, num_runs: int = 50):
        """Initialize data store with simulated data and trained models."""

        # Generate initial dataset
        runs = self.simulator.generate_dataset(
            num_runs=num_runs,
            duration_seconds=120,
            sample_rate_hz=1.0,
        )

        # Train models
        self._training_result = self.trainer.train_all_models(runs)

        # Initialize inference components
        self.inference = ModelInference(self.registry)
        self.uncertainty = UncertaintyEstimator(self.registry)

        # Set drift detector reference
        self.drift_detector.set_reference_data(runs)

        self._initialized = True

        return {
            "runsGenerated": len(runs),
            "modelsTrainted": True,
            "trainingMetrics": {
                "thickness": self._training_result.thickness_metrics.metrics,
                "porosity": self._training_result.porosity_metrics.metrics,
                "defect": self._training_result.defect_metrics.metrics,
            },
        }

    def is_initialized(self) -> bool:
        """Check if data store is initialized."""
        return self._initialized

    def get_all_runs(self) -> List[ProductionRun]:
        """Get all production runs."""
        return self.simulator.get_all_runs()

    def get_run(self, run_id: str) -> Optional[ProductionRun]:
        """Get a specific run by ID."""
        return self.simulator.get_run(run_id)

    def get_timeseries(self, run_id: str) -> Optional[List[dict]]:
        """Get time series data for a run."""
        return self.simulator.get_timeseries_data(run_id)

    def get_prediction(self, run_id: str) -> Optional[QualityPrediction]:
        """Get quality prediction for a run."""
        if not self.inference:
            return None

        run = self.simulator.get_run(run_id)
        if not run:
            return None

        return self.inference.predict(run_id, run.sensor_readings)

    def get_uncertainty(self, run_id: str) -> Optional[dict]:
        """Get uncertainty metrics for a run."""
        if not self.uncertainty:
            return None

        run = self.simulator.get_run(run_id)
        if not run:
            return None

        metrics = self.uncertainty.estimate_uncertainty(run_id, run.sensor_readings)
        return metrics.to_dict()

    def get_drift_status(self, recent_n: int = 20) -> DriftStatus:
        """Get current drift status."""
        runs = self.get_all_runs()
        recent_runs = runs[-recent_n:] if len(runs) > recent_n else runs

        self._last_drift_status = self.drift_detector.detect_drift(recent_runs)
        return self._last_drift_status

    def get_metrics(self) -> dict:
        """Get model performance metrics."""
        if not self._training_result:
            return {
                "thickness": {"metrics": {}, "featureImportance": {}},
                "porosity": {"metrics": {}, "featureImportance": {}},
                "defect": {"metrics": {}, "featureImportance": {}},
                "quality": {"metrics": {}},
            }

        def to_float_dict(d: dict) -> dict:
            """Convert numpy types to Python floats."""
            return {k: float(v) for k, v in d.items()}

        def get_top_features(importance: dict, n: int = 10) -> dict:
            """Get top N features by importance as Python floats."""
            sorted_items = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:n]
            return {k: float(v) for k, v in sorted_items}

        return {
            "thickness": {
                "metrics": to_float_dict(self._training_result.thickness_metrics.metrics),
                "featureImportance": get_top_features(self._training_result.thickness_metrics.feature_importance),
            },
            "porosity": {
                "metrics": to_float_dict(self._training_result.porosity_metrics.metrics),
                "featureImportance": get_top_features(self._training_result.porosity_metrics.feature_importance),
            },
            "defect": {
                "metrics": to_float_dict(self._training_result.defect_metrics.metrics),
                "featureImportance": get_top_features(self._training_result.defect_metrics.feature_importance),
            },
            "quality": {
                "metrics": to_float_dict(self._training_result.quality_metrics.metrics),
                "featureImportance": get_top_features(self._training_result.quality_metrics.feature_importance),
            },
        }

    def get_summary(self) -> dict:
        """Get summary statistics."""
        return self.simulator.get_summary_statistics()

    def regenerate_data(self, num_runs: int = 50, seed: Optional[int] = None) -> dict:
        """Regenerate dataset and retrain models."""
        if seed is not None:
            self.seed = seed

        self.simulator.reset(seed)
        return self.initialize(num_runs)

    def add_run(self) -> ProductionRun:
        """Add a new simulated run."""
        run = self.simulator.generate_single_run()
        return run


# Global data store instance
_data_store: Optional[DataStore] = None


def get_data_store() -> DataStore:
    """Get or create the global data store instance."""
    global _data_store
    if _data_store is None:
        _data_store = DataStore(seed=get_settings().random_seed)
    return _data_store


def reset_data_store():
    """Reset the global data store."""
    global _data_store
    _data_store = None
