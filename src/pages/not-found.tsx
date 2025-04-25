"use client";
import Link from "next/link";

import { NAVLINKS_MAP } from "@/constants/links";

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="mb-[56px]">
        <h1 className="sr-only">Not Found</h1>
      </div>

      <h2 className="h2-bold mb-4">Oops...</h2>
      <p className="mb-8 caption">Something went wrong...</p>

      <Link href={NAVLINKS_MAP.HOME}>
        <button>Go back to home</button>
      </Link>
    </div>
  );
}
