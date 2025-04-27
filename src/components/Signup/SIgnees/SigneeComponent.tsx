import Link from "next/link";
import type { MouseEventHandler } from "react";

import { Avatar } from "@/components/Avatar";
import { PlaceholderAvatar } from "@/components/Uploader/PlaceholderAvatar";
import { Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { NAVLINKS_MAP, WHATS_APP } from "@/constants/links";
import type { IUserSafe } from "@/types/users";
import { cn } from "@/utils/tailwind";
import { formatPhoneNumber } from "@/utils/user";

export interface ISigneeComponent extends IUserSafe {
  children?: React.ReactNode;
  childrenBelow?: React.ReactNode;
  errorMsg: string | null;
  loading: boolean;
  avatar_url?: string;
  avatarSize?: number;
  hideAvatar?: boolean;
  className?: string;
  handleCancel?: MouseEventHandler<HTMLButtonElement>;
}

export function SigneeComponent({
  _id,
  first_name,
  last_name,
  phone_number,
  avatar_url,
  avatarSize = 80,
  hideAvatar = false,
  errorMsg,
  loading,
  className,
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
              {avatar_url !== undefined ? (
                <Avatar
                  src={avatar_url}
                  width={avatarSize}
                  height={avatarSize}
                  className="h-[40px] w-[40px] md:h-[55px] md:w-[55px]"
                />
              ) : (
                <PlaceholderAvatar className="h-[40px] w-[40px] md:h-[55px] md:w-[55px] text-[8px] md:text-[11px]" />
              )}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-x-4 size-full">
            <div className="flex h-full mr-auto">
              {loading ? (
                <div className="overflow-hidden w-[50px] h-[50px] relative">
                  <Loader className="absolute -top-[24px] -left-[26px] w-[100px] height-[100px] max-w-none" />
                </div>
              ) : (
                handleCancel !== undefined && (
                  <button
                    className={`self-center h-full md:h-[70%] items-center py-[2px] px-[12px] text-md font-bold ${RED_TW}`}
                    onClick={handleCancel}
                  >
                    <span className="flex sm:hidden">x</span>
                    <span className="hidden sm:flex">Cancel</span>
                  </button>
                )
              )}
            </div>

            <div className="flex flex-col items-center justify-end text-right gap-x-2 ml-auto">
              <Link
                href={`${NAVLINKS_MAP.PROFILES}/${_id?.toString()}`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="w-full"
              >
                <div className="font-bold w-full self-end">
                  {first_name} {last_name}
                </div>{" "}
              </Link>
              <div className="flex w-full text-sm text-gray-800 justify-end text-right">
                <a
                  href={`${WHATS_APP}/${formatPhoneNumber(phone_number)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {formatPhoneNumber(phone_number)}
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
