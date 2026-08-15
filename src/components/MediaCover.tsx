"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MediaCover({
  src,
  title,
  width,
  height,
  className,
}: {
  src: string | null;
  title: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={title}
        style={{ width, height }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageIcon className="size-1/3" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      width={width}
      height={height}
      className={cn("shrink-0 rounded-md object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
