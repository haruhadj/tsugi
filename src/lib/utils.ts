import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's class composer: conditional classes in, conflicting Tailwind utilities resolved. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
