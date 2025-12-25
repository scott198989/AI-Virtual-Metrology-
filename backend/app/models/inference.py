"""Model inference for real-time predictions."""
import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass

from app.simulation.sensors import SensorReading
from app.features.engineering import FeatureEngineer
from .registry import ModelRegistry


@dataclass
class QualityPrediction:
    """Predicted quality metrics."""

    run_id: str
    thickness_um: float
    thickness_lower: float  # 90% CI lower bound
    thickness_upper: float  # 90% CI upper bound
    porosity_pct: float
    defect_probability: float
    quality_grade: str
    confidence: float  # Overall confidence score

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "runId": self.run_id,
            "thicknessUm": round(self.thickness_um, 2),
            "thicknessLower": round(self.thickness_lower, 2),
            "thicknessUpper": round(self.thickness_upper, 2),
            "porosityPct": round(self.porosity_pct, 2),
            "defectProbability": round(self.defect_probability, 4),
            "qualityGrade": self.quality_grade,
            "confidence": round(self.confidence, 3),
        }


class ModelInference:
    """Perform inference using trained models."""

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.feature_engineer = FeatureEngineer()
        self._models_loaded = False

    def _ensure_models_loaded(self):
        """Ensure all required models are loaded."""
        if self._models_loaded:
            return

        required = [
            "thickness_model",
            "porosity_model",
            "defect_model",
            "quality_model",
            "thickness_model_q10",
            "thickness_model_q90",
            "scaler",
            "label_encoder",
            "feature_names",
        ]

        for name in required:
            if not self.registry.model_exists(name):
                raise RuntimeError(f"Model '{name}' not found. Train models first.")
            self.registry.load_model(name)

        self._models_loaded = True

    def predict(
        self, run_id: str, readings: List[SensorReading]
    ) -> QualityPrediction:
        """Make quality predictions for a run."""

        self._ensure_models_loaded()

        # Engineer features
        fs = self.feature_engineer.engineer_features(run_id, readings)

        # Get feature names and create feature vector
        feature_names = self.registry.load_model("feature_names")
        X = np.array([[fs.features.get(name, 0.0) for name in feature_names]])
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        # Scale features
        scaler = self.registry.load_model("scaler")
        X_scaled = scaler.transform(X)

        # Load models
        thickness_model = self.registry.load_model("thickness_model")
        porosity_model = self.registry.load_model("porosity_model")
        defect_model = self.registry.load_model("defect_model")
        quality_model = self.registry.load_model("quality_model")
        q10_model = self.registry.load_model("thickness_model_q10")
        q90_model = self.registry.load_model("thickness_model_q90")
        label_encoder = self.registry.load_model("label_encoder")

        # Make predictions
        thickness = float(thickness_model.predict(X_scaled)[0])
        thickness_lower = float(q10_model.predict(X_scaled)[0])
        thickness_upper = float(q90_model.predict(X_scaled)[0])
        porosity = float(porosity_model.predict(X_scaled)[0])

        # Defect probability
        defect_prob = defect_model.predict_proba(X_scaled)[0]
        defect_probability = float(defect_prob[1]) if len(defect_prob) > 1 else 0.0

        # Quality grade
        quality_pred = quality_model.predict(X_scaled)[0]
        quality_grade = label_encoder.inverse_transform([quality_pred])[0]

        # Calculate confidence based on prediction interval width and model agreement
        interval_width = thickness_upper - thickness_lower
        relative_width = interval_width / thickness if thickness > 0 else 1.0
        confidence = max(0, min(1, 1 - relative_width))

        # Adjust confidence based on defect probability uncertainty
        defect_entropy = -sum(
            p * np.log(p + 1e-10) for p in defect_prob
        ) / np.log(len(defect_prob) + 1e-10)
        confidence = confidence * (1 - 0.3 * defect_entropy)

        return QualityPrediction(
            run_id=run_id,
            thickness_um=max(0, thickness),
            thickness_lower=max(0, thickness_lower),
            thickness_upper=max(0, thickness_upper),
            porosity_pct=max(0, min(20, porosity)),
            defect_probability=defect_probability,
            quality_grade=quality_grade,
            confidence=confidence,
        )

    def predict_batch(
        self, runs: List[tuple[str, List[SensorReading]]]
    ) -> List[QualityPrediction]:
        """Make predictions for multiple runs."""
        return [self.predict(run_id, readings) for run_id, readings in runs]

    def get_feature_importance(self, model_name: str = "thickness_model") -> Dict[str, float]:
        """Get feature importance from a model."""
        self._ensure_models_loaded()

        model = self.registry.load_model(model_name)
        feature_names = self.registry.load_model("feature_names")

        if hasattr(model, "feature_importances_"):
            importance = dict(zip(feature_names, model.feature_importances_))
            # Sort by importance
            return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))

        return {}

    def get_top_features(
        self, model_name: str = "thickness_model", top_n: int = 10
    ) -> List[Dict[str, float]]:
        """Get top N most important features."""
        importance = self.get_feature_importance(model_name)
        top = list(importance.items())[:top_n]
        return [{"name": name, "importance": imp} for name, imp in top]
