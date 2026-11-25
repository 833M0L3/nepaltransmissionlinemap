interface StatsSummaryProps {
  hydroCount: number;
  gridCount: number;
  totalCapacityMw: number;
}

export function StatsSummary({ hydroCount, gridCount, totalCapacityMw }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-center">
        <p className="text-base font-bold text-gray-900">{hydroCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-gray-400">Hydro Sites</p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-center">
        <p className="text-base font-bold text-blue-600">
          {Math.round(totalCapacityMw).toLocaleString()}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-blue-400">Total MW</p>
      </div>
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-center">
        <p className="text-base font-bold text-violet-600">{gridCount}</p>
        <p className="text-[10px] uppercase tracking-wide text-violet-400">Grid Lines</p>
      </div>
    </div>
  );
}
