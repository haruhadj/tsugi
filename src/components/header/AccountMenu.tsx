import { LayoutDashboardIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({
  username,
  onSignOut,
}: {
  username: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          /*
            Hidden below `md`: the bottom tab bar's own "Settings" tab
            reaches the same pages this dropdown does, and its Sign out
            (the only one in the product — ProviderConnections) lives on
            that Settings page, so this trigger is pure duplication on a
            phone rather than a second way in.
          */
          className="hidden gap-2 rounded-full border-border pl-1.5 md:inline-flex"
        >
          <span
            aria-hidden
            className="brand-gradient flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-bold text-primary-foreground"
          >
            {username.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-32 truncate font-mono text-xs sm:inline">
            {username}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
          @{username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboardIcon aria-hidden />
            Your lists
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
