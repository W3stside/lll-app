import Image from "next/image";

import { ImagePixelated } from "../PixelatedImage";
import { IMAGE_CLASS } from "./constants";

import { cn } from "@/utils/tailwind";

interface IAvatar {
  src?: string;
  pixelSize?: number;
  className?: string;
  width?: number;
  height?: number;
}

export function Avatar({
  src,
  className,
  pixelSize,
  width = 80,
  height = 80,
}: IAvatar) {
  if (src === undefined) return null;

  return (
    <div className={cn("relative self-center overflow-hidden", className)}>
      {pixelSize !== undefined ? (
        <ImagePixelated
          src={src}
          pixelSize={pixelSize}
          className={cn(IMAGE_CLASS, "!max-w-full !max-h-full")}
          width={width}
          height={height}
        />
      ) : (
        <Image
          src={src}
          alt="Avatar"
          className={cn(IMAGE_CLASS, "!max-w-full !max-h-full")}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}
