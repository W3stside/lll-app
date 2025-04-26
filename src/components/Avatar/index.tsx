import Image from "next/image";

import { ImagePixelated } from "../PixelatedImage";
import { IMAGE_CLASS, MAX_IMAGE_WIDTH } from "./constants";

interface IAvatar {
  src?: string;
  pixelSize?: number;
}

export function Avatar({ src, pixelSize }: IAvatar) {
  if (src === undefined) return null;

  return (
    <div className="w-[80px] h-[80px] relative self-center">
      {pixelSize !== undefined ? (
        <ImagePixelated
          src={src}
          pixelSize={pixelSize}
          height={MAX_IMAGE_WIDTH}
          width={MAX_IMAGE_WIDTH}
          className={IMAGE_CLASS}
        />
      ) : (
        <Image
          src={src}
          alt="Avatar"
          height={MAX_IMAGE_WIDTH}
          width={MAX_IMAGE_WIDTH}
          className={IMAGE_CLASS}
        />
      )}
    </div>
  );
}
