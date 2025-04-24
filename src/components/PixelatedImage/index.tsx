import React, { useRef, useEffect, useCallback } from "react";

export interface ImagePixelatedProps
  extends React.HTMLProps<HTMLCanvasElement> {
  pixelSize?: number;
  centered?: boolean;
  fillTransparencyColor?: string;
  height?: number;
  width?: number;
  src: string;
}

export const ImagePixelated = ({
  src,
  width,
  height,
  pixelSize = 5,
  centered = false,
  fillTransparencyColor,
  className,
}: ImagePixelatedProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintPixels = useCallback(
    (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      if (!isNaN(pixelSize) && pixelSize > 0) {
        for (let x = 0; x < img.width + pixelSize; x += pixelSize) {
          for (let y = 0; y < img.height + pixelSize; y += pixelSize) {
            let xColorPick = x;
            let yColorPick = y;

            if (x >= img.width) {
              xColorPick = x - (pixelSize - (img.width % pixelSize) / 2) + 1;
            }
            if (y >= img.height) {
              yColorPick = y - (pixelSize - (img.height % pixelSize) / 2) + 1;
            }

            const rgba = ctx.getImageData(xColorPick, yColorPick, 1, 1).data;
            ctx.fillStyle = (
              rgba[3] === 0
                ? fillTransparencyColor
                : `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`
            ) as CanvasGradient | CanvasPattern | string;

            if (centered) {
              ctx.fillRect(
                Math.floor(x - (pixelSize - (img.width % pixelSize) / 2)),
                Math.floor(y - (pixelSize - (img.height % pixelSize) / 2)),
                pixelSize,
                pixelSize,
              );
            } else {
              ctx.fillRect(x, y, pixelSize, pixelSize);
            }
          }
        }
      }
    },
    [centered, fillTransparencyColor, pixelSize],
  );

  const pixelate = useCallback(() => {
    let img: HTMLImageElement | undefined = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas !== null && img !== undefined) {
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        img.width = width ?? img.width;
        img.height = height ?? img.height;
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.className = className ?? "";

        ctx.drawImage(img, 0, 0, img.width, img.height);
        paintPixels(ctx, img);
        img = undefined;
      }
    };
  }, [className, height, paintPixels, src, width]);

  useEffect(() => {
    pixelate();
  }, [
    src,
    width,
    height,
    pixelSize,
    centered,
    fillTransparencyColor,
    pixelate,
  ]);

  return <canvas ref={canvasRef} />;
};
