interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
    </section>
  );
}
