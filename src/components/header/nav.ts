import { CompassIcon, LayoutDashboardIcon, PlusIcon } from "lucide-react";

export const NAV = [
  { href: "/feed", label: "Rundown", icon: CompassIcon, needsSession: false },
  { href: "/", label: "Create", icon: PlusIcon, needsSession: true },
  { href: "/dashboard", label: "Your lists", icon: LayoutDashboardIcon, needsSession: true },
] as const;

export function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
