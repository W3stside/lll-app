import Image from "next/image";

import ebaumsWorld from "@/assets/ebaums-world.png";
import fedRates from "@/assets/fed-rates.png";
import findClassmates from "@/assets/find-classmates.png";
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
        <strong className="pr-2">x</strong>
      </div>
      <div className="flex flex-wrap gap-x-4 items-start justify-center">
        <div className="flex flex-col gap-y-1 flex-1 max-w-full">
          <p>There's always more at LLL! </p>
          <div className="flex gap-x-2 h-20">
            <Image
              src={ebaumsWorld}
              alt="ebaums world"
              className="max-h-full max-w-fit"
            />
            <Image
              src={findClassmates}
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
