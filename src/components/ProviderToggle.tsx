"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Provider } from "@/lib/types/media";

const STORAGE_KEY = "tsugi:search-provider";

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

function readStoredProvider(): Provider {
  if (typeof window === "undefined") return "anilist";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "anilist" || stored === "mal" ? stored : "anilist";
}

export function ProviderToggle({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (provider: Provider) => void;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredProvider();
    if (stored !== value) onChange(stored);
    // Runs once on mount only; the render-time default and this corrected
    // value are never the same paint, so no cascading-render cost applies.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, value);
  }, [hydrated, value]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Search source</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as Provider)}
        className="flex flex-row gap-4"
      >
        {(Object.keys(PROVIDER_LABELS) as Provider[]).map((provider) => (
          <div key={provider} className="flex items-center gap-2">
            <RadioGroupItem value={provider} id={`provider-${provider}`} className="size-[18px]" />
            <Label htmlFor={`provider-${provider}`} className="min-h-11 flex items-center">
              {PROVIDER_LABELS[provider]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
