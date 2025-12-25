'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Run, Summary, Metrics } from '@/lib/types';

export function useRuns(limit = 100) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setIsLoading(true);
        const data = await api.getRuns(limit);
        setRuns(data.runs);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch runs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
  }, [limit]);

  return { runs, total, isLoading, error };
}

export function useSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        const data = await api.getSummary();
        setSummary(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { summary, isLoading, error };
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMetrics();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, isLoading, error };
}
