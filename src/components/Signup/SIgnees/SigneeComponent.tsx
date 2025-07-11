import Link from "next/link";
import type { MouseEventHandler } from "react";

import { Avatar } from "@/components/Avatar";
import { PlaceholderAvatar } from "@/components/Uploader/PlaceholderAvatar";
import { Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { NAVLINKS_MAP, WHATS_APP } from "@/constants/links";
import { Role } from "@/types";
import type { IUserSafe } from "@/types/users";
import { cn } from "@/utils/tailwind";
import { formatPhoneNumber } from "@/utils/user";

export interface ISigneeComponent extends IUserSafe {
  children?: React.ReactNode;
  childrenBelow?: React.ReactNode;
  errorMsg: string | null;
  loading: boolean;
  avatarClassName?: string;
  hideAvatar?: boolean;
  className?: string;
  handleCancel?: MouseEventHandler<HTMLButtonElement>;
  handleAddToShame?: MouseEventHandler<HTMLButtonElement>;
}

export function SigneeComponent({
  _id,
  first_name,
  last_name,
  phone_number,
  role,
  avatarUrl = null,
  avatarClassName = "text-[8px] md:text-[10px] h-[40px] w-[40px] md:h-[55px] md:w-[55px]",
  hideAvatar = false,
  errorMsg,
  loading,
  className,
  children,
  childrenBelow = null,
  handleCancel,
  handleAddToShame,
}: ISigneeComponent) {
  const formattedNumber = formatPhoneNumber(phone_number);

  return (
    <div className="container flex-col items-start justify-start gap-y-1 h-auto elevation-2">
      <div className="container-header w-[calc(100%+12px)] !bg-[var(--background-container-header-alt)] !h-[27px] -mt-2 -ml-2">
        {role === Role.ADMIN && (
          <div className="bg-[var(--background-color)] font-bold mx-2 !flex items-center px-1.5 text-[ghostwhite]">
            Admin
          </div>
        )}
        <span className="cursor-pointer" onClick={handleCancel}>
          {handleCancel !== undefined ? "x" : "-"}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col w-full py-1 px-0 sm:py-2 sm:px-4 md:px-0",
          className,
        )}
      >
        <div className="flex flex-row-reverse justify-between items-center w-full gap-x-4">
          {!hideAvatar && _id !== undefined && (
            <Link
              href={`${NAVLINKS_MAP.PROFILES}/${_id.toString()}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="no-underline"
            >
              {avatarUrl !== null ? (
                <Avatar
                  src={avatarUrl}
                  className={avatarClassName}
                  pixelSize={4}
                />
              ) : (
                <PlaceholderAvatar
                  className={cn("text-[10px] md:text-[11px]", avatarClassName)}
                />
              )}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-x-4 size-full">
            <div className="flex flex-col justify-center gap-y-1 h-full mr-auto">
              {loading ? (
                <div className="overflow-hidden w-[50px] h-[50px] relative">
                  <Loader className="absolute -top-[24px] -left-[26px] w-[100px] height-[100px] max-w-none" />
                </div>
              ) : (
                <>
                  {handleCancel !== undefined && (
                    <button
                      className={`self-start h-full md:h-[70%] items-center py-[2px] px-[12px] text-md font-bold ${RED_TW}`}
                      onClick={handleCancel}
                    >
                      <span className="flex sm:hidden">x</span>
                      <span className="hidden sm:flex">Cancel</span>
                    </button>
                  )}
                  {handleAddToShame !== undefined && (
                    <button
                      className={`self-start h-full md:h-[70%] items-center py-[2px] px-[12px] text-md font-bold ${RED_TW}`}
                      onClick={handleAddToShame}
                    >
                      <span className="flex">Shame</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col flex-1 items-center justify-end text-right gap-x-2 ml-auto">
              <Link
                href={`${NAVLINKS_MAP.PROFILES}/${_id?.toString()}`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="w-full"
              >
                <div className="font-bold w-full self-end">
                  {first_name} {last_name}
                </div>
              </Link>
              <div className="flex w-full text-sm text-[var(--text-color-alternate)] justify-end text-right">
                <a
                  href={`${WHATS_APP}/${formattedNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {formattedNumber?.slice(0, 6)}***{formattedNumber?.slice(-3)}
                </a>
              </div>
            </div>
          </div>
          {children}
        </div>
        {childrenBelow !== null && (
          <div className="flex flex-col w-full">{childrenBelow}</div>
        )}
        {errorMsg !== null && (
          <div className="p-2 w-full bg-gray-100 text-red-500 text-sm text-left break-all">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
