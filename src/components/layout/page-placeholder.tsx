export function PagePlaceholder({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Scheduled for {phase}.
      </div>
    </div>
  );
}
