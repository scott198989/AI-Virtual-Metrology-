'use client';

import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useState } from 'react';

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.generateRun();
      window.location.reload();
    } catch (error) {
      console.error('Failed to generate run:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold">Thermal Coating Quality Prediction</h1>
        <p className="text-sm text-muted-foreground">AI-Powered Virtual Metrology System</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Generating...' : 'New Run'}
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            2
          </span>
        </Button>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
