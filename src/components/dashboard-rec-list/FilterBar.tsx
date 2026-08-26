import { cn } from "@/lib/utils";
import { FILTERS, type Filter } from "@/components/dashboard-rec-list/useDashboardRecs";

export function FilterBar({
  filter,
  counts,
  onChange,
}: {
  filter: Filter;
  counts: Record<Filter, number>;
  onChange: (filter: Filter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter lists"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
    >
      {FILTERS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={filter === option.id}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            filter === option.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
          <span className="font-mono tabular-nums opacity-70">{counts[option.id]}</span>
        </button>
      ))}
    </div>
  );
}
