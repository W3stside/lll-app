import Image from "next/image";

import { ImagePixelated } from "../PixelatedImage";
import { IMAGE_CLASS, MAX_IMAGE_WIDTH } from "./constants";

import { cn } from "@/utils/tailwind";

interface IAvatar {
  src?: string;
  pixelSize?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function Avatar({
  src,
  width = MAX_IMAGE_WIDTH,
  height = MAX_IMAGE_WIDTH,
  className,
  pixelSize,
}: IAvatar) {
  if (src === undefined) return null;

  return (
    <div className="relative self-center">
      {pixelSize !== undefined ? (
        <ImagePixelated
          src={src}
          pixelSize={pixelSize}
          height={height}
          width={width}
          className={cn(IMAGE_CLASS, className)}
        />
      ) : (
        <Image
          src={src}
          alt="Avatar"
          height={height}
          width={width}
          className={cn(IMAGE_CLASS, className)}
        />
      )}
    </div>
  );
}
