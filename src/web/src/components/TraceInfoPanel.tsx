type TraceInfoPanelProps = {
  responseId: string;
  traceId: string;
  clientReference?: string;
};

export default function TraceInfoPanel({ responseId, traceId, clientReference }: TraceInfoPanelProps) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
      <p className="font-semibold text-slate-300">Trace info</p>
      <p>
        Response ID: <span className="font-mono text-slate-200">{responseId}</span>
      </p>
      <p>
        Trace ID: <span className="font-mono text-slate-200">{traceId}</span>
      </p>
      {clientReference ? (
        <p>
          Client reference: <span className="font-medium text-slate-100">{clientReference}</span>
        </p>
      ) : null}
    </div>
  );
}
