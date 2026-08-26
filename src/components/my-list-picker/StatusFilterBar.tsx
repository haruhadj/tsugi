import type { ListStatus } from "@/lib/types/media";

const STATUS_CONFIG: { value: ListStatus; label: string }[] = [
  { value: "current", label: "Watching" },
  { value: "planning", label: "Planning" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
  { value: "repeating", label: "Repeating" },
];

/** The row of status pills, hidden for any status the list has zero of. */
export function StatusFilterBar({
  statusFilter,
  onStatusFilterChange,
  statusCounts,
}: {
  statusFilter: ListStatus | null;
  onStatusFilterChange: (status: ListStatus | null) => void;
  statusCounts: Map<ListStatus, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onStatusFilterChange(null)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          statusFilter === null
            ? "border-primary bg-primary/15 text-primary"
            : "border-border text-muted-foreground hover:bg-accent"
        }`}
      >
        All
      </button>
      {STATUS_CONFIG.map(({ value, label }) => {
        const count = statusCounts.get(value) ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {label} <span className="ml-1 opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
