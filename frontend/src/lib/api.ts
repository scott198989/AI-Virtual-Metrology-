// API client for Virtual Metrology System

import type {
  Run,
  RunListResponse,
  TimeSeriesResponse,
  QualityPrediction,
  Uncertainty,
  DriftStatus,
  Metrics,
  Summary,
  Comparison,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Health check
  health: () => fetchApi<{ status: string; initialized: boolean; timestamp: string }>('/api/health'),

  // Initialize system
  initialize: (numRuns: number = 50) =>
    fetchApi<{ runsGenerated: number; modelsTrained: boolean }>(`/api/initialize?num_runs=${numRuns}`, {
      method: 'POST',
    }),

  // Runs
  getRuns: (limit = 100, offset = 0, status?: string) => {
    let url = `/api/runs?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    return fetchApi<RunListResponse>(url);
  },

  getRun: (runId: string) => fetchApi<Run>(`/api/runs/${runId}`),

  getTimeseries: (runId: string) => fetchApi<TimeSeriesResponse>(`/api/runs/${runId}/timeseries`),

  getPrediction: (runId: string) => fetchApi<QualityPrediction>(`/api/runs/${runId}/quality_prediction`),

  getUncertainty: (runId: string) => fetchApi<Uncertainty>(`/api/runs/${runId}/uncertainty`),

  getComparison: (runId: string) => fetchApi<Comparison>(`/api/runs/${runId}/comparison`),

  // Metrics and summary
  getMetrics: () => fetchApi<Metrics>('/api/metrics'),

  getSummary: () => fetchApi<Summary>('/api/summary'),

  // Drift
  getDrift: (recentN = 20) => fetchApi<DriftStatus>(`/api/drift?recent_n=${recentN}`),

  // Simulation
  simulate: (numRuns: number = 50, seed?: number) => {
    const body: { num_runs: number; seed?: number } = { num_runs: numRuns };
    if (seed !== undefined) body.seed = seed;
    return fetchApi<{ runsGenerated: number; modelsTrained: boolean }>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  generateRun: () =>
    fetchApi<Run>('/api/runs/generate', {
      method: 'POST',
    }),

  // Export
  exportRun: (runId: string, format: 'json' | 'csv' = 'json') =>
    fetchApi<unknown>(`/api/export/${runId}?format=${format}`),
};
