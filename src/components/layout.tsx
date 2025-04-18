"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { Footer } from "./footer";
import { Navbar } from "./navbar";

import { USER_INFO_KEY } from "@/constants/storage";

interface ILayout {
  children: React.ReactNode;
}

export function Layout({ children }: ILayout) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    if (userInfo === null) {
      // Redirect to the login page if user info is not found
      void router.push("/login");
    }
  }, [router]);
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
