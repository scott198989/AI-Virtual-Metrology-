'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Run, TimeSeriesResponse, QualityPrediction, Uncertainty, Comparison } from '@/lib/types';

export function useRun(runId: string) {
  const [run, setRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRun = async () => {
      try {
        setIsLoading(true);
        const data = await api.getRun(runId);
        setRun(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch run');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) fetchRun();
  }, [runId]);

  return { run, isLoading, error };
}

export function useTimeseries(runId: string) {
  const [timeseries, setTimeseries] = useState<TimeSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        setIsLoading(true);
        const data = await api.getTimeseries(runId);
        setTimeseries(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch timeseries');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) fetchTimeseries();
  }, [runId]);

  return { timeseries, isLoading, error };
}

export function usePrediction(runId: string) {
  const [prediction, setPrediction] = useState<QualityPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setIsLoading(true);
        const data = await api.getPrediction(runId);
        setPrediction(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) fetchPrediction();
  }, [runId]);

  return { prediction, isLoading, error };
}

export function useUncertainty(runId: string) {
  const [uncertainty, setUncertainty] = useState<Uncertainty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUncertainty = async () => {
      try {
        setIsLoading(true);
        const data = await api.getUncertainty(runId);
        setUncertainty(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch uncertainty');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) fetchUncertainty();
  }, [runId]);

  return { uncertainty, isLoading, error };
}

export function useComparison(runId: string) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setIsLoading(true);
        const data = await api.getComparison(runId);
        setComparison(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setIsLoading(false);
      }
    };

    if (runId) fetchComparison();
  }, [runId]);

  return { comparison, isLoading, error };
}
