"""Model registry for saving and loading trained models."""
import os
import joblib
from typing import Any, Dict, Optional
from datetime import datetime
import json


class ModelRegistry:
    """Registry for managing trained model artifacts."""

    def __init__(self, model_dir: str = "./saved_models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self._models: Dict[str, Any] = {}
        self._metadata: Dict[str, dict] = {}

    def save_model(
        self,
        name: str,
        model: Any,
        metadata: Optional[dict] = None,
    ) -> str:
        """Save a model to disk."""
        model_path = os.path.join(self.model_dir, f"{name}.joblib")
        meta_path = os.path.join(self.model_dir, f"{name}_meta.json")

        # Save model
        joblib.dump(model, model_path)

        # Save metadata
        meta = metadata or {}
        meta["saved_at"] = datetime.now().isoformat()
        meta["model_path"] = model_path

        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)

        # Cache in memory
        self._models[name] = model
        self._metadata[name] = meta

        return model_path

    def load_model(self, name: str) -> Optional[Any]:
        """Load a model from disk or cache."""
        # Check memory cache first
        if name in self._models:
            return self._models[name]

        # Try loading from disk
        model_path = os.path.join(self.model_dir, f"{name}.joblib")
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            self._models[name] = model
            self._load_metadata(name)
            return model

        return None

    def _load_metadata(self, name: str):
        """Load metadata for a model."""
        meta_path = os.path.join(self.model_dir, f"{name}_meta.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                self._metadata[name] = json.load(f)

    def get_metadata(self, name: str) -> Optional[dict]:
        """Get metadata for a model."""
        if name not in self._metadata:
            self._load_metadata(name)
        return self._metadata.get(name)

    def list_models(self) -> list[str]:
        """List all available models."""
        models = set()

        # From memory
        models.update(self._models.keys())

        # From disk
        if os.path.exists(self.model_dir):
            for f in os.listdir(self.model_dir):
                if f.endswith(".joblib"):
                    models.add(f.replace(".joblib", ""))

        return sorted(models)

    def model_exists(self, name: str) -> bool:
        """Check if a model exists."""
        if name in self._models:
            return True
        model_path = os.path.join(self.model_dir, f"{name}.joblib")
        return os.path.exists(model_path)

    def delete_model(self, name: str) -> bool:
        """Delete a model."""
        deleted = False

        # Remove from memory
        if name in self._models:
            del self._models[name]
            deleted = True
        if name in self._metadata:
            del self._metadata[name]

        # Remove from disk
        model_path = os.path.join(self.model_dir, f"{name}.joblib")
        meta_path = os.path.join(self.model_dir, f"{name}_meta.json")

        if os.path.exists(model_path):
            os.remove(model_path)
            deleted = True
        if os.path.exists(meta_path):
            os.remove(meta_path)

        return deleted

    def register_in_memory(
        self, name: str, model: Any, metadata: Optional[dict] = None
    ):
        """Register a model in memory only (no disk save)."""
        self._models[name] = model
        self._metadata[name] = metadata or {"registered_at": datetime.now().isoformat()}

    def clear_cache(self):
        """Clear in-memory model cache."""
        self._models.clear()
        self._metadata.clear()
