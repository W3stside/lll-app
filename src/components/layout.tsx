import dynamic from "next/dynamic";

import { Footer } from "./footer";
import { Loader } from "./ui";

import type { IUser } from "@/types/users";

const Navbar = dynamic(
  async () => await import("./navbar").then((mod) => ({ default: mod.Navbar })),
  { ssr: false, loading: () => <Loader /> }, // Disable SSR and provide a loading fallback
);

interface ILayout {
  children: React.ReactNode;
  usersById: Record<string, IUser>;
}

export function Layout({ children, usersById }: ILayout) {
  return (
    <>
      <Navbar usersById={usersById} />
      <div className="flex flex-col gap-y-8 items-center justify-start pb-10 px-2.5 h-auto">
        {children}
      </div>
      <Footer />
    </>
  );
}
