'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'DELIVERED':
      case 'SUCCESS':
      case 'SIGNED':
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'IN_TRANSIT':
      case 'PREPARING':
      case 'GENERATED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'SCHEDULED':
      case 'IN':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'OUT':
      case 'ADJUSTMENT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'REJECTED':
      case 'ERROR':
      case 'WASTE':
      case 'INACTIVE':
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'SKIPPED_NO_MOVEMENTS':
      case 'ARCHIVED':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getDotColor = (s: string) => {
    switch (s.toUpperCase()) {
      case 'DELIVERED':
      case 'SUCCESS':
      case 'SIGNED':
      case 'ACTIVE':
        return 'bg-emerald-400';
      case 'IN_TRANSIT':
      case 'PREPARING':
      case 'GENERATED':
        return 'bg-blue-400';
      case 'SCHEDULED':
      case 'IN':
        return 'bg-indigo-400';
      case 'OUT':
      case 'ADJUSTMENT':
        return 'bg-amber-400';
      case 'REJECTED':
      case 'ERROR':
      case 'WASTE':
      case 'INACTIVE':
      case 'CRITICAL':
        return 'bg-rose-400';
      default:
        return 'bg-slate-400';
    }
  };

  const formatLabel = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  return (
    <span
      className={cn(
        'inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide uppercase',
        getStyle(status),
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', getDotColor(status))} />
      <span>{formatLabel(status)}</span>
    </span>
  );
}
