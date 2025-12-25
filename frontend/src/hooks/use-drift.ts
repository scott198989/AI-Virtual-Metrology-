'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { DriftStatus } from '@/lib/types';

export function useDrift(recentN = 20) {
  const [drift, setDrift] = useState<DriftStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrift = async () => {
      try {
        setIsLoading(true);
        const data = await api.getDrift(recentN);
        setDrift(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch drift status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrift();
  }, [recentN]);

  return { drift, isLoading, error };
}
