import sys
import os

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    replacements = {
        'text-white': 'text-brand-dark',
        'text-slate-400': 'text-slate-500',
        'text-slate-300': 'text-slate-600',
        'bg-slate-900/60': 'bg-white shadow-sm',
        'bg-slate-900/50': 'bg-white shadow-sm',
        'bg-slate-900/40': 'bg-white shadow-sm',
        'bg-slate-900': 'bg-white',
        'bg-slate-950/60': 'bg-slate-50',
        'bg-slate-950': 'bg-slate-50',
        'border-slate-800/80': 'border-slate-100',
        'border-slate-800/60': 'border-slate-200',
        'border-slate-800': 'border-slate-200',
        'bg-slate-800/60': 'bg-slate-100',
        'bg-slate-800/30': 'bg-slate-50',
        'bg-slate-800': 'bg-slate-100',
        'text-slate-200': 'text-brand-dark',
        'hover:text-white': 'hover:text-brand-primary',
        'hover:bg-slate-800': 'hover:bg-slate-200',
        'hover:bg-slate-700': 'hover:bg-slate-200',
        'border-slate-700': 'border-slate-200',
        'text-blue-400': 'text-brand-primary',
        'bg-blue-600/20': 'bg-brand-primary/10',
        'border-blue-500/30': 'border-brand-primary/20',
        'text-emerald-400': 'text-emerald-600',
        'text-amber-400': 'text-amber-600',
        'text-rose-400': 'text-rose-600',
        'bg-blue-600': 'bg-brand-primary',
        'hover:bg-blue-500': 'hover:bg-brand-primary/90',
        'shadow-blue-500/20': 'shadow-brand-primary/20',
        'focus:border-blue-500': 'focus:border-brand-primary',
        'divide-slate-800/60': 'divide-slate-100',
        'divide-slate-800': 'divide-slate-100'
    }

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(filepath, 'w') as f:
        f.write(content)

    print(f"Processed {filepath}")

for arg in sys.argv[1:]:
    process_file(arg)
