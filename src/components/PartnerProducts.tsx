import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import ebaumsWorld from "@/assets/ebaums-world.png";
import fedRates from "@/assets/fed-rates.png";
import findClassmates from "@/assets/find-classmates.png";
import pastelle from "@/assets/pastelle.svg";
import { cn } from "@/utils/tailwind";

interface IPartnerProducts {
  className?: string;
}

export function PartnerProducts({ className }: IPartnerProducts) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-y-1 text-black container",
        className,
      )}
    >
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h5 className="mr-auto px-2 py-1">Explore our partner products</h5>{" "}
        <strong className="pr-2">X</strong>
      </div>
      <div className="flex flex-wrap gap-x-4 items-start justify-center">
        <div className="flex flex-col gap-y-1 flex-1 max-w-full">
          <p>There's always more at LLL! </p>
          <div className="flex gap-x-2 h-20">
            <Link
              href="https://pastelle.shop/collection"
              className="w-[160px]"
              target="_blank"
              referrerPolicy="no-referrer"
            >
              <Image
                src={pastelle as StaticImageData}
                alt="pastelle-apparel"
                className="max-h-full max-w-full"
              />
            </Link>
            <Image
              src={ebaumsWorld}
              alt="find classmates"
              className="max-h-full max-w-fit"
            />
          </div>
        </div>
        <Image
          src={findClassmates}
          alt="find classmates"
          className="flex-1 max-w-fit h-35 p-2"
        />
        <Image
          src={fedRates}
          alt="fed cuts rates"
          className="flex-1 max-w-unset max-h-35 p-2"
        />
      </div>
    </div>
  );
}
