"use client";
import Link from "next/link";

import image404 from "@/assets/404.jpeg";
import { ImagePixelated } from "@/components/PixelatedImage";
import { NAVLINKS_MAP } from "@/constants/links";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h1 className="mr-auto px-2 py-1">404 404 404</h1>{" "}
        <strong className="pr-2">x</strong>
      </div>
      <div>
        <h1 className="sr-only">Not Found</h1>
      </div>
      <div className="flex flex-col items-center justify-center gap-y-4 p-5">
        <ImagePixelated
          src={image404.src}
          pixelSize={6}
          width={300}
          height={300}
          alt="404"
          className="w-[300px] h-[300px]"
        />
        <h1>WHAT ARE YOU DOING HERE!?</h1>

        <Link href={NAVLINKS_MAP.HOME} className="no-underline">
          <button className="text-xl">
            <b>Go back home</b>
          </button>
        </Link>
      </div>
    </div>
  );
}
