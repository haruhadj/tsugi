import {
  ClockIcon,
  EyeIcon,
  FlameIcon,
  ListOrderedIcon,
  type LucideIcon,
} from "lucide-react";
import { FEED_SORTS, type FeedSort } from "@/server/services/lists";

export const SORTS: Record<FeedSort, { label: string; icon: LucideIcon }> = {
  top: { label: "Top", icon: FlameIcon },
  new: { label: "New", icon: ClockIcon },
  views: { label: "Most viewed", icon: EyeIcon },
  items: { label: "Longest", icon: ListOrderedIcon },
};

export function isFeedSort(value: string | undefined): value is FeedSort {
  return (
    value !== undefined && (FEED_SORTS as readonly string[]).includes(value)
  );
}
