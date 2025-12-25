# Virtual Metrology System

AI-powered quality prediction for thermal spray coating processes. Predict coating thickness, porosity, and defects in real-time without physical inspection.

## Features

- **Real-time Quality Prediction**: Predict coating thickness, porosity, and defect probability before inspection
- **Physics-based Simulation**: Realistic thermal spray coating process simulation with 12 sensor channels
- **ML-powered Models**: Gradient Boosting, Random Forest, and XGBoost models with uncertainty estimation
- **Drift Detection**: Monitor feature distribution shift with KS-test and PSI metrics
- **Interactive Dashboard**: Modern dark-mode UI with charts, gauges, and KPI cards
- **3D Visualization**: Three.js-powered coating process visualization
- **Export & Reports**: Download run data as JSON or CSV

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │
│  │Dashboard│  │  Runs   │  │Metrology│  │  Drift  │  │  3D   │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └───────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
┌─────────────────────────────┴───────────────────────────────────┐
│                        Backend (FastAPI)                         │
│  ┌───────────┐  ┌──────────┐  ┌────────┐  ┌─────────────────┐  │
│  │Simulation │  │ Features │  │ Models │  │ Drift Detection │  │
│  │  Engine   │  │Engineering│  │Training│  │   (KS + PSI)    │  │
│  └───────────┘  └──────────┘  └────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- scikit-learn, XGBoost
- NumPy, Pandas, SciPy

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts
- Three.js (@react-three/fiber)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/AI-Virtual-Metrology-.git
cd AI-Virtual-Metrology-
```

### 2. Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at http://localhost:8000

API documentation available at http://localhost:8000/docs

### 3. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file (Windows)
copy .env.example .env.local
# Or on macOS/Linux:
cp .env.example .env.local

# Start development server
npm run dev
```

The frontend will start at http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/initialize` | Initialize with simulated data |
| GET | `/api/runs` | List production runs |
| GET | `/api/runs/{id}` | Get run details |
| GET | `/api/runs/{id}/timeseries` | Get sensor time-series |
| GET | `/api/runs/{id}/quality_prediction` | Get VM predictions |
| GET | `/api/runs/{id}/uncertainty` | Get uncertainty metrics |
| GET | `/api/metrics` | Model performance metrics |
| GET | `/api/drift` | Drift status |
| POST | `/api/simulate` | Regenerate dataset |

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Railway will auto-detect the Dockerfile
5. Set environment variables:
   - `CORS_ORIGINS=https://your-frontend.vercel.app`

### Frontend (Vercel)

1. Import your repository on [Vercel](https://vercel.com)
2. Set the root directory to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
4. Deploy

## Project Structure

```
AI-Virtual-Metrology-/
├── backend/
│   ├── app/
│   │   ├── simulation/     # Process simulation
│   │   ├── features/       # Feature engineering
│   │   ├── models/         # ML training & inference
│   │   ├── drift/          # Drift detection
│   │   ├── api/            # FastAPI routes
│   │   └── data/           # Data store
│   ├── Dockerfile
│   ├── railway.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities & API client
│   ├── next.config.js
│   └── package.json
└── README.md
```

## Simulation Model

The system simulates a thermal plasma spray coating process:

### Sensor Data (12 channels)
- Plasma temperature (8000-15000°C)
- Plasma power (30-80 kW)
- Primary gas flow (Ar: 30-60 SLPM)
- Secondary gas flow (H2: 5-15 SLPM)
- Powder feed rate (20-80 g/min)
- Carrier gas flow (3-8 SLPM)
- Substrate temperature (100-400°C)
- Spray distance (100-140 mm)
- Chamber pressure (~1013 mbar)
- Ambient temperature & humidity
- Deposition rate (calculated)

### Quality Metrics
- Coating thickness (µm)
- Thickness uniformity (%)
- Porosity (%)
- Adhesion strength (MPa)
- Surface roughness Ra (µm)
- Defect flags (delamination, cracks, voids)
- Quality grade (A, B, C, reject)

## ML Models

| Model | Target | Algorithm | Metric |
|-------|--------|-----------|--------|
| Thickness | Continuous | GradientBoosting | R² > 0.95 |
| Porosity | Continuous | RandomForest | R² > 0.90 |
| Defect | Binary | RandomForest | AUC > 0.85 |
| Grade | Multi-class | RandomForest | Acc > 0.80 |

Uncertainty estimation via quantile regression (90% prediction intervals).

## Pages

1. **Dashboard** - Real-time KPIs, quality distribution, and recent runs
2. **Production Runs** - Filterable list of all runs with status and grades
3. **Run Detail** - Time-series plots, predicted vs actual, uncertainty bands
4. **Virtual Metrology** - Live predictions with gauges for thickness and defects
5. **Drift Monitor** - Feature drift analysis with KS-test and PSI scores
6. **Reports** - Export run data as JSON or CSV
7. **3D Visualization** - Interactive coating process with quality-mapped colors

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
