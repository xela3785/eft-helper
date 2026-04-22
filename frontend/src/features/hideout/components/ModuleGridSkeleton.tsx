interface ModuleGridSkeletonProps {
  count?: number;
}

export function ModuleGridSkeleton({ count = 4 }: ModuleGridSkeletonProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <article
          key={index}
          className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-slate-800" />
              <div className="space-y-3">
                <div className="h-3 w-24 rounded-full bg-slate-800" />
                <div className="h-5 w-40 rounded-full bg-slate-800" />
                <div className="h-3 w-28 rounded-full bg-slate-800" />
              </div>
            </div>
            <div className="h-10 w-24 rounded-2xl bg-slate-800" />
          </div>
          <div className="mt-5 h-16 rounded-2xl bg-slate-800" />
          <div className="mt-5 h-20 rounded-2xl bg-slate-800" />
          <div className="mt-5 space-y-3">
            <div className="h-20 rounded-2xl bg-slate-800" />
            <div className="h-20 rounded-2xl bg-slate-800" />
          </div>
          <div className="mt-5 h-11 rounded-2xl bg-slate-800" />
        </article>
      ))}
    </div>
  );
}
