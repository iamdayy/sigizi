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
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'IN_TRANSIT':
      case 'PREPARING':
      case 'GENERATED':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'SCHEDULED':
      case 'IN':
        return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'OUT':
      case 'ADJUSTMENT':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'REJECTED':
      case 'ERROR':
      case 'WASTE':
      case 'INACTIVE':
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'SKIPPED_NO_MOVEMENTS':
      case 'ARCHIVED':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getDotColor = (s: string) => {
    switch (s.toUpperCase()) {
      case 'DELIVERED':
      case 'SUCCESS':
      case 'SIGNED':
      case 'ACTIVE':
        return 'bg-emerald-500';
      case 'IN_TRANSIT':
      case 'PREPARING':
      case 'GENERATED':
        return 'bg-blue-500';
      case 'SCHEDULED':
      case 'IN':
        return 'bg-indigo-500';
      case 'OUT':
      case 'ADJUSTMENT':
        return 'bg-amber-500';
      case 'REJECTED':
      case 'ERROR':
      case 'WASTE':
      case 'INACTIVE':
      case 'CRITICAL':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
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
