export type SummaryItem = {
  label: string;
  value: string;
};

type ResultSummaryGridProps = {
  items: SummaryItem[];
};

export default function ResultSummaryGrid({ items }: ResultSummaryGridProps) {
  return (
    <dl className="grid gap-4 text-sm text-slate-200">
      {items.map(item => (
        <div key={item.label} className="rounded-xl border border-slate-800/60 bg-slate-950/30 px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="text-base font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
