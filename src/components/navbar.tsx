import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/logo.png";
import { NAVLINKS, NAVLINKS_MAP } from "@/constants/links";

interface INavbar {
  title: string;
}

export function Navbar({ title }: INavbar) {
  return (
    <div className="flex flex-col gap-y-8 items-center justify-start pb-10">
      <div className="flex flex-row flex-wrap container-header w-full gap-4 !h-auto !justify-start">
        <Link href={NAVLINKS_MAP.HOME}>
          <Image src={logo} alt="LLL logo" className="max-w-25" />
        </Link>
        <h1 className="lowercase font-thin">{title}</h1>
        <div className="flex-1 sm:grow-0 mb-2 sm:m-0 sm:ml-auto m-2 flex items-center justify-center gap-x-4 w-min">
          {NAVLINKS.flatMap(({ name, url }) =>
            !title.includes(url)
              ? [
                  <Link key={url} href={url} className="whitespace-nowrap">
                    <button className="underline">{name}</button>
                  </Link>,
                ]
              : [],
          )}
        </div>
      </div>
    </div>
  );
}
