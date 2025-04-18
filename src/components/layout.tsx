"use client";

import { usePathname } from "next/navigation";

import { Footer } from "./footer";
import { Navbar } from "./navbar";

interface ILayout {
  children: React.ReactNode;
}

export function Layout({ children }: ILayout) {
  const pathname = usePathname();

  return (
    <>
      <Navbar title={pathname.toLowerCase()} />
      <div className="flex flex-col gap-y-8 items-center justify-start pb-10 px-2.5 h-auto">
        {children}
      </div>
      <Footer />
    </>
  );
}
