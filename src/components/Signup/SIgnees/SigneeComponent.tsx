import type { MouseEventHandler } from "react";

import { Loader } from "@/components/ui";
import { WHATS_APP } from "@/constants/links";
import type { IBaseUser } from "@/types/users";
import { cn } from "@/utils/tailwind";

interface ISigneeComponent extends IBaseUser {
  children?: React.ReactNode;
  childrenBelow?: React.ReactNode;
  errorMsg: string | null;
  loading: boolean;
  handleCancel?: MouseEventHandler<HTMLButtonElement>;
  setGames?: (users: IBaseUser[]) => void;
}

export function SigneeComponent({
  first_name,
  last_name,
  phone_number,
  errorMsg,
  loading,
  children,
  childrenBelow = null,
  handleCancel,
}: ISigneeComponent) {
  return (
    <div
      className={cn(
        "container flex-col items-start justify-start gap-y-1 h-auto elevation-2",
      )}
    >
      <div className="container-header w-[calc(100%+12px)] !bg-gray-800 -mt-2 -ml-2">
        <span className="cursor-pointer" onClick={handleCancel}>
          x
        </span>
      </div>
      <div className="flex justify-between items-center w-full py-2 px-4">
        <div className="flex flex-col items-start justify-center">
          <strong>
            {first_name} {last_name}
          </strong>{" "}
          <div className="text-sm text-gray-800">
            <span className="hidden sm:inline">WhatsApp: </span>
            <a
              href={`${WHATS_APP}/${phone_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {phone_number}
            </a>
          </div>
        </div>
        {loading ? (
          <div className="overflow-hidden w-[50px] h-[50px] relative">
            <Loader className="absolute -top-[24px] -left-[26px] w-[100px] height-[100px] max-w-none" />
          </div>
        ) : (
          handleCancel !== undefined && (
            <button className="self-end" onClick={handleCancel}>
              Cancel
            </button>
          )
        )}
        {children}
      </div>
      {childrenBelow !== null && (
        <div className="flex flex-col py-2 px-4">{childrenBelow}</div>
      )}
      {errorMsg !== null && (
        <div className="p-2 w-full bg-gray-100 text-red-500 text-sm text-left break-all">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
