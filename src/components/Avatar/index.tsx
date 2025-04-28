import Image from "next/image";

import { ImagePixelated } from "../PixelatedImage";
import { IMAGE_CLASS } from "./constants";

import { cn } from "@/utils/tailwind";

interface IAvatar {
  src?: string;
  pixelSize?: number;

  className?: string;
}

export function Avatar({
  src,

  className,
  pixelSize,
}: IAvatar) {
  if (src === undefined) return null;

  return (
    <div className={cn("relative self-center overflow-hidden", className)}>
      {pixelSize !== undefined ? (
        <ImagePixelated
          src={src}
          pixelSize={pixelSize}
          className={cn(IMAGE_CLASS, "!max-w-full !max-h-full")}
        />
      ) : (
        <Image
          src={src}
          alt="Avatar"
          className={cn(IMAGE_CLASS, "!max-w-full !max-h-full")}
        />
      )}
    </div>
  );
}
