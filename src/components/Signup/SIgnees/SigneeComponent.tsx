import Link from "next/link";
import type { MouseEventHandler } from "react";

import { Avatar } from "@/components/Avatar";
import { Loader } from "@/components/ui";
import { NAVLINKS_MAP, WHATS_APP } from "@/constants/links";
import { supabase } from "@/lib/supabase";
import type { IBaseUser, IUserSafe } from "@/types/users";
import { cn } from "@/utils/tailwind";

interface ISigneeComponent extends IUserSafe {
  children?: React.ReactNode;
  childrenBelow?: React.ReactNode;
  errorMsg: string | null;
  loading: boolean;
  avatarSize?: number;
  hideAvatar?: boolean;
  handleCancel?: MouseEventHandler<HTMLButtonElement>;
  setGames?: (users: IBaseUser[]) => void;
}

export function SigneeComponent({
  _id,
  first_name,
  last_name,
  phone_number,
  avatarSize = 80,
  hideAvatar = false,
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
      <div className="flex justify-between items-center w-full py-1 px-0 sm:py-2 sm:px-4 gap-x-4">
        {!hideAvatar && _id !== undefined && (
          <Link
            href={`${NAVLINKS_MAP.PROFILES}/${_id.toString()}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Avatar
              src={
                supabase.storage.from("avatars").getPublicUrl(_id.toString())
                  .data.publicUrl
              }
              width={avatarSize}
              height={avatarSize}
              className="h-[50px] w-[50px] sm:h-auto sm:w-auto"
            />
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-4 w-full">
          <div
            className={cn({
              "hidden mr-auto": !hideAvatar,
            })}
          >
            {loading ? (
              <div className="overflow-hidden w-[50px] h-[50px] relative">
                <Loader className="absolute -top-[24px] -left-[26px] w-[100px] height-[100px] max-w-none" />
              </div>
            ) : (
              handleCancel !== undefined && (
                <button className="self-center" onClick={handleCancel}>
                  <span className="hidden sm:flex">Cancel</span>
                  <span className="flex sm:hidden py-0 px-1">X</span>
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
          <div
            className={cn({
              "hidden ml-auto": hideAvatar,
            })}
          >
            {loading ? (
              <div className="overflow-hidden w-[50px] h-[50px] relative">
                <Loader className="absolute -top-[24px] -left-[26px] w-[100px] height-[100px] max-w-none" />
              </div>
            ) : (
              handleCancel !== undefined && (
                <button className="self-center" onClick={handleCancel}>
                  <span className="hidden sm:flex">Cancel</span>
                  <span className="flex sm:hidden py-0 px-1">X</span>
                </button>
              )
            )}
          </div>
        </div>
        {children}
      </div>
      {childrenBelow !== null && (
        <div className="flex flex-col py-2 px-4 w-full">{childrenBelow}</div>
      )}
      {errorMsg !== null && (
        <div className="p-2 w-full bg-gray-100 text-red-500 text-sm text-left break-all">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
