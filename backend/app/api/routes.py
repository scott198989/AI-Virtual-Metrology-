"""FastAPI routes for virtual metrology API."""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from .schemas import (
    RunResponse,
    RunListResponse,
    TimeSeriesResponse,
    TimeSeriesPointResponse,
    QualityPredictionResponse,
    UncertaintyResponse,
    DriftStatusResponse,
    MetricsResponse,
    SummaryResponse,
    HealthResponse,
    InitializeResponse,
    SimulateRequest,
    FeatureDriftResponse,
    PredictionIntervalResponse,
)
from app.data.store import get_data_store


router = APIRouter(prefix="/api", tags=["Virtual Metrology"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    store = get_data_store()
    return HealthResponse(
        status="healthy",
        initialized=store.is_initialized(),
        timestamp=datetime.now().isoformat(),
    )


@router.post("/initialize", response_model=InitializeResponse)
async def initialize(num_runs: int = Query(default=50, ge=10, le=500)):
    """Initialize the system with simulated data and trained models."""
    store = get_data_store()
    result = store.initialize(num_runs=num_runs)
    return InitializeResponse(
        runsGenerated=result["runsGenerated"],
        modelsTrained=result["modelsTrainted"],
        trainingMetrics=result["trainingMetrics"],
    )


@router.get("/runs", response_model=RunListResponse)
async def get_runs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = None,
):
    """Get list of production runs."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    runs = store.get_all_runs()

    # Filter by status if provided
    if status:
        runs = [r for r in runs if r.status == status]

    # Sort by start time (most recent first)
    runs = sorted(runs, key=lambda r: r.start_time, reverse=True)

    # Paginate
    total = len(runs)
    runs = runs[offset : offset + limit]

    return RunListResponse(
        runs=[RunResponse(**r.to_dict()) for r in runs],
        total=total,
    )


@router.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(run_id: str):
    """Get details for a specific run."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return RunResponse(**run.to_dict())


@router.get("/runs/{run_id}/timeseries", response_model=TimeSeriesResponse)
async def get_timeseries(run_id: str):
    """Get time series sensor data for a run."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    timeseries = store.get_timeseries(run_id)
    if timeseries is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return TimeSeriesResponse(
        runId=run_id,
        data=[TimeSeriesPointResponse(**point) for point in timeseries],
        duration=timeseries[-1]["timeSeconds"] if timeseries else 0,
        sampleCount=len(timeseries),
    )


@router.get("/runs/{run_id}/quality_prediction", response_model=QualityPredictionResponse)
async def get_quality_prediction(run_id: str):
    """Get quality prediction for a run."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    prediction = store.get_prediction(run_id)
    if prediction is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return QualityPredictionResponse(**prediction.to_dict())


@router.get("/runs/{run_id}/uncertainty", response_model=UncertaintyResponse)
async def get_uncertainty(run_id: str):
    """Get uncertainty metrics for a run's predictions."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    uncertainty = store.get_uncertainty(run_id)
    if uncertainty is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return UncertaintyResponse(
        runId=uncertainty["runId"],
        predictionInterval=PredictionIntervalResponse(**uncertainty["predictionInterval"]),
        intervalWidth=uncertainty["intervalWidth"],
        relativeUncertainty=uncertainty["relativeUncertainty"],
        confidenceLevel=uncertainty["confidenceLevel"],
        epistemicUncertainty=uncertainty["epistemicUncertainty"],
        aleatoricUncertainty=uncertainty["aleatoricUncertainty"],
    )


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get model performance metrics."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    return store.get_metrics()


@router.get("/drift", response_model=DriftStatusResponse)
async def get_drift_status(recent_n: int = Query(default=20, ge=5, le=100)):
    """Get current drift status."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    drift_status = store.get_drift_status(recent_n=recent_n)
    drift_dict = drift_status.to_dict()

    return DriftStatusResponse(
        overallStatus=drift_dict["overallStatus"],
        psi=drift_dict["psi"],
        featureDrift={
            name: FeatureDriftResponse(**fd)
            for name, fd in drift_dict["featureDrift"].items()
        },
        driftedFeatures=drift_dict["driftedFeatures"],
        lastUpdated=drift_dict["lastUpdated"],
        referenceRunCount=drift_dict["referenceRunCount"],
        currentRunCount=drift_dict["currentRunCount"],
    )


@router.get("/summary", response_model=SummaryResponse)
async def get_summary():
    """Get summary statistics."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    return store.get_summary()


@router.post("/simulate", response_model=InitializeResponse)
async def simulate(request: SimulateRequest):
    """Regenerate dataset and retrain models."""
    store = get_data_store()
    result = store.regenerate_data(num_runs=request.num_runs, seed=request.seed)

    return InitializeResponse(
        runsGenerated=result["runsGenerated"],
        modelsTrained=result["modelsTrainted"],
        trainingMetrics=result["trainingMetrics"],
    )


@router.post("/runs/generate")
async def generate_run():
    """Generate a new production run."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    run = store.add_run()
    return RunResponse(**run.to_dict())


@router.get("/runs/{run_id}/comparison")
async def get_comparison(run_id: str):
    """Get predicted vs actual comparison for a run."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    prediction = store.get_prediction(run_id)

    return {
        "runId": run_id,
        "predicted": {
            "thickness": prediction.thickness_um if prediction else None,
            "porosity": prediction.porosity_pct if prediction else None,
            "defectProbability": prediction.defect_probability if prediction else None,
            "qualityGrade": prediction.quality_grade if prediction else None,
        },
        "actual": {
            "thickness": run.quality_metrics.thickness_um if run.quality_metrics else None,
            "porosity": run.quality_metrics.porosity_pct if run.quality_metrics else None,
            "defectFlag": run.quality_metrics.defect_flag if run.quality_metrics else None,
            "qualityGrade": run.quality_metrics.quality_grade if run.quality_metrics else None,
        },
        "errors": {
            "thicknessError": abs(
                prediction.thickness_um - run.quality_metrics.thickness_um
            ) if prediction and run.quality_metrics else None,
            "thicknessErrorPct": abs(
                (prediction.thickness_um - run.quality_metrics.thickness_um)
                / run.quality_metrics.thickness_um * 100
            ) if prediction and run.quality_metrics else None,
        },
    }


@router.get("/export/{run_id}")
async def export_run(run_id: str, format: str = Query(default="json", regex="^(json|csv)$")):
    """Export run data."""
    store = get_data_store()

    if not store.is_initialized():
        raise HTTPException(status_code=503, detail="System not initialized")

    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    timeseries = store.get_timeseries(run_id)
    prediction = store.get_prediction(run_id)

    if format == "json":
        return {
            "run": run.to_dict(),
            "timeseries": timeseries,
            "prediction": prediction.to_dict() if prediction else None,
        }
    else:
        # CSV format - return timeseries as CSV string
        import csv
        import io

        output = io.StringIO()
        if timeseries:
            writer = csv.DictWriter(output, fieldnames=timeseries[0].keys())
            writer.writeheader()
            writer.writerows(timeseries)

        return {
            "csv": output.getvalue(),
            "filename": f"run_{run_id}_timeseries.csv",
        }
