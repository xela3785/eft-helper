import type { ReactNode } from 'react';
import { AppNavigation } from './AppNavigation';

interface PageShellProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageShell({ eyebrow, title, description, children, actions }: PageShellProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AppNavigation />
      <section className="rounded-[2rem] border border-slate-800/80 bg-slate-950/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{description}</p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
