export function PagePlaceholder({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 glass rounded-3xl border-dashed p-8 text-center text-sm text-slate-500">
        Scheduled for {phase}.
      </div>
    </div>
  );
}
