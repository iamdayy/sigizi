'use client';

import React, { useState } from 'react';
import { Download, Check, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  filename?: string;
  className?: string;
  label?: string;
  onExport?: () => void;
}

export default function ExportButton({
  filename = 'export-data.xlsx',
  className,
  label = 'Export Excel',
  onExport,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleClick = () => {
    setIsExporting(true);
    if (onExport) {
      onExport();
    }
    setTimeout(() => {
      setIsExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    }, 800);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isExporting}
      className={cn(
        'inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 shadow-sm',
        exported
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white',
        className
      )}
      title={`Unduh berkas ${filename}`}
    >
      {exported ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
          <span>Terekspor</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isExporting ? 'Mengekspor...' : label}</span>
        </>
      )}
    </button>
  );
}
