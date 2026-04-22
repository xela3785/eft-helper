import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={safeValue}
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-[width] duration-300"
          role="progressbar"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="text-right text-xs font-medium text-slate-400">{safeValue}%</p>
    </div>
  );
}
