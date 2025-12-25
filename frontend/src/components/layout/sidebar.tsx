'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  List,
  Activity,
  AlertTriangle,
  FileText,
  Box,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Production Runs', href: '/runs', icon: List },
  { name: 'Virtual Metrology', href: '/metrology', icon: Gauge },
  { name: 'Drift Monitor', href: '/drift', icon: AlertTriangle },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: '3D Visualization', href: '/visualization', icon: Box },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">VirtualMetrology</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground">System Status</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm">Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
