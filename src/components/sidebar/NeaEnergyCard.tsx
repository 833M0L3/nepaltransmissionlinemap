import type { NeaEnergyData } from '../../types/geospatial';

interface NeaEnergyCardProps {
  data: NeaEnergyData | null;
}

export function NeaEnergyCard({ data }: NeaEnergyCardProps) {
  if (!data || data.items.length === 0) return null;

  const updatedDate = new Date(data.scraped_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          NEA Daily Grid Status
        </p>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          {updatedDate}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {data.items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
          >
            <p className="text-xs font-bold text-gray-900">{item.display}</p>
            <p className="truncate text-[10px] text-gray-400" title={item.label}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
