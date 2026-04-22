import type { HideoutModule } from '../../../entities/module/types';
import { getModuleInitials } from '../lib/progress';

interface ModuleIconProps {
  module: HideoutModule;
  size?: 'sm' | 'md';
}

const sizeClassNames = {
  sm: 'size-10 rounded-xl',
  md: 'size-14 rounded-2xl',
};

export function ModuleIcon({ module, size = 'md' }: ModuleIconProps) {
  const sizeClassName = sizeClassNames[size];

  if (module.imageLink) {
    return (
      <img
        alt={module.name}
        className={`${sizeClassName} shrink-0 border border-slate-700 bg-slate-900 object-cover`}
        src={module.imageLink}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex shrink-0 items-center justify-center border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-200`}
    >
      {getModuleInitials(module.name)}
    </div>
  );
}
