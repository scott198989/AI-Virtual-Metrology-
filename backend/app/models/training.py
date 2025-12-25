"""Model training pipeline for virtual metrology."""
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
    RandomForestClassifier,
)
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
    accuracy_score,
    classification_report,
)

from app.simulation.process import ProductionRun
from app.features.engineering import FeatureEngineer, FeatureSet
from .registry import ModelRegistry


@dataclass
class TrainingMetrics:
    """Metrics from model training."""

    model_name: str
    train_size: int
    test_size: int
    metrics: Dict[str, float]
    feature_importance: Dict[str, float]


@dataclass
class TrainingResult:
    """Result of training all models."""

    thickness_metrics: TrainingMetrics
    porosity_metrics: TrainingMetrics
    defect_metrics: TrainingMetrics
    quality_metrics: TrainingMetrics
    feature_names: List[str]


class ModelTrainer:
    """Train virtual metrology prediction models."""

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.feature_engineer = FeatureEngineer()
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self._feature_names: List[str] = []

    def prepare_training_data(
        self, runs: List[ProductionRun]
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Prepare features and targets from production runs."""

        # Engineer features for each run
        feature_sets = []
        targets = []

        for run in runs:
            if run.quality_metrics is None:
                continue

            fs = self.feature_engineer.engineer_features(
                run.id, run.sensor_readings
            )
            feature_sets.append(fs)

            targets.append({
                "run_id": run.id,
                "thickness_um": run.quality_metrics.thickness_um,
                "porosity_pct": run.quality_metrics.porosity_pct,
                "adhesion_strength_mpa": run.quality_metrics.adhesion_strength_mpa,
                "defect_flag": int(run.quality_metrics.defect_flag),
                "quality_grade": run.quality_metrics.quality_grade,
            })

        # Convert to DataFrames
        features_df = self.feature_engineer.to_dataframe(feature_sets)
        targets_df = pd.DataFrame(targets)

        self._feature_names = [
            col for col in features_df.columns if col != "run_id"
        ]

        return features_df, targets_df

    def train_all_models(
        self,
        runs: List[ProductionRun],
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> TrainingResult:
        """Train all virtual metrology models."""

        features_df, targets_df = self.prepare_training_data(runs)

        # Merge on run_id
        data = features_df.merge(targets_df, on="run_id")

        # Prepare feature matrix
        X = data[self._feature_names].values
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

        # Fit and transform scaler
        X_scaled = self.scaler.fit_transform(X)

        # Store scaler
        self.registry.save_model("scaler", self.scaler, {"type": "StandardScaler"})

        # Targets
        y_thickness = data["thickness_um"].values
        y_porosity = data["porosity_pct"].values
        y_defect = data["defect_flag"].values
        y_quality = self.label_encoder.fit_transform(data["quality_grade"].values)

        # Store label encoder
        self.registry.save_model(
            "label_encoder",
            self.label_encoder,
            {"classes": self.label_encoder.classes_.tolist()},
        )

        # Store feature names
        self.registry.save_model(
            "feature_names",
            self._feature_names,
            {"count": len(self._feature_names)},
        )

        # Train-test split
        X_train, X_test, indices_train, indices_test = train_test_split(
            X_scaled, np.arange(len(X_scaled)), test_size=test_size, random_state=random_state
        )

        # Train thickness model
        thickness_metrics = self._train_regression_model(
            "thickness_model",
            X_train, X_test,
            y_thickness[indices_train], y_thickness[indices_test],
            GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=random_state),
        )

        # Train porosity model
        porosity_metrics = self._train_regression_model(
            "porosity_model",
            X_train, X_test,
            y_porosity[indices_train], y_porosity[indices_test],
            RandomForestRegressor(n_estimators=100, max_depth=10, random_state=random_state),
        )

        # Train defect classifier
        defect_metrics = self._train_classification_model(
            "defect_model",
            X_train, X_test,
            y_defect[indices_train], y_defect[indices_test],
            RandomForestClassifier(n_estimators=100, max_depth=10, random_state=random_state),
        )

        # Train quality grade classifier
        quality_metrics = self._train_classification_model(
            "quality_model",
            X_train, X_test,
            y_quality[indices_train], y_quality[indices_test],
            RandomForestClassifier(n_estimators=100, max_depth=10, random_state=random_state),
            multiclass=True,
        )

        # Train quantile models for uncertainty
        self._train_quantile_models(
            X_train, y_thickness[indices_train], random_state
        )

        return TrainingResult(
            thickness_metrics=thickness_metrics,
            porosity_metrics=porosity_metrics,
            defect_metrics=defect_metrics,
            quality_metrics=quality_metrics,
            feature_names=self._feature_names,
        )

    def _train_regression_model(
        self,
        name: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        model,
    ) -> TrainingMetrics:
        """Train a regression model and return metrics."""

        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        metrics = {
            "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "r2": float(r2_score(y_test, y_pred)),
            "mape": float(np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100),
        }

        # Feature importance
        importance = dict(zip(self._feature_names, model.feature_importances_))

        # Save model
        self.registry.save_model(name, model, {"metrics": metrics, "type": "regression"})

        return TrainingMetrics(
            model_name=name,
            train_size=len(X_train),
            test_size=len(X_test),
            metrics=metrics,
            feature_importance=importance,
        )

    def _train_classification_model(
        self,
        name: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        model,
        multiclass: bool = False,
    ) -> TrainingMetrics:
        """Train a classification model and return metrics."""

        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)

        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
        }

        if multiclass:
            # Multi-class ROC-AUC
            try:
                metrics["roc_auc"] = float(
                    roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
                )
            except ValueError:
                metrics["roc_auc"] = 0.0
        else:
            # Binary ROC-AUC
            try:
                metrics["roc_auc"] = float(roc_auc_score(y_test, y_prob[:, 1]))
            except (ValueError, IndexError):
                metrics["roc_auc"] = 0.0

        # Feature importance
        importance = dict(zip(self._feature_names, model.feature_importances_))

        # Save model
        self.registry.save_model(
            name, model, {"metrics": metrics, "type": "classification"}
        )

        return TrainingMetrics(
            model_name=name,
            train_size=len(X_train),
            test_size=len(X_test),
            metrics=metrics,
            feature_importance=importance,
        )

    def _train_quantile_models(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        random_state: int,
    ):
        """Train quantile regression models for uncertainty estimation."""

        # Lower bound (10th percentile)
        model_low = GradientBoostingRegressor(
            loss="quantile",
            alpha=0.1,
            n_estimators=100,
            max_depth=5,
            random_state=random_state,
        )
        model_low.fit(X_train, y_train)
        self.registry.save_model(
            "thickness_model_q10", model_low, {"quantile": 0.1}
        )

        # Upper bound (90th percentile)
        model_high = GradientBoostingRegressor(
            loss="quantile",
            alpha=0.9,
            n_estimators=100,
            max_depth=5,
            random_state=random_state,
        )
        model_high.fit(X_train, y_train)
        self.registry.save_model(
            "thickness_model_q90", model_high, {"quantile": 0.9}
        )

    @property
    def feature_names(self) -> List[str]:
        """Get feature names used in training."""
        return self._feature_names
