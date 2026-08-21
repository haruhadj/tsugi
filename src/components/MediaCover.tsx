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
  fluid = false,
  className,
}: {
  src: string | null;
  title: string;
  width: number;
  height: number;
  /**
   * Fill the container's width instead of rendering a fixed `width` × `height` box.
   * The dimensions keep both their other jobs — they give `next/image` the source
   * size to request, and they set the aspect ratio the box holds — they just stop
   * being the rendered size. The placeholder follows the same box, so a missing
   * cover keeps its slot in a row of flexible covers instead of collapsing to the
   * intrinsic size and leaving a gap.
   */
  fluid?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // `aspectRatio` rather than a computed height: the row's width is decided by the
  // flex parent at layout time, and the covers must all land on the same height.
  const box = fluid
    ? { width: "100%", height: "auto", aspectRatio: `${width} / ${height}` }
    : { width, height };

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={title}
        style={box}
        className={cn(
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
          !fluid && "shrink-0",
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
      style={fluid ? box : undefined}
      className={cn("rounded-md object-cover", !fluid && "shrink-0", className)}
      onError={() => setFailed(true)}
    />
  );
}
