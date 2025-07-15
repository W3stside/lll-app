import { RemainingSpots } from "../ui";

import { ORANGE_TW, RED_TW } from "@/constants/colours";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { Gender, type IGame } from "@/types";
import { cn } from "@/utils/tailwind";

const MAX_ADDRESS_LENGTH = 22;

interface IGames extends IGame {
  date: string | undefined;
  signupsAmt: number | null;
  waitlistAmt: number | null;
  waitlistLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Games({
  game_id,
  location,
  time,
  address,
  mapUrl,
  speed,
  gender,
  teams,
  signupsAmt,
  waitlistAmt,
  waitlistLabel = "Waitlist only",
  cancelled = false,
  hidden = false,
  children,
  className,
}: IGames) {
  return (
    <div
      key={game_id}
      className={cn(
        "flex flex-col container gap-y-4 pl-9 w-full",
        {
          "!bg-transparent": cancelled || hidden,
        },
        className,
      )}
    >
      <div className="flex flex-row flex-wrap items-start w-full">
        {hidden && (
          <small className="mb-1 px-1 bg-[var(--background-window-highlight)]">
            HIDDEN GAME! ADMIN VIEW ONLY
          </small>
        )}
        <div className="flex gap-x-4 w-full">
          <strong className="flex items-center gap-x-2 text-lg">
            {teams !== undefined ? "Tournament" : "Game"} {game_id}{" "}
            {gender === Gender.FEMALE && (
              <span className=" text-black text-[11px] bg-red-100 px-2 h-[20px] leading-[1.9]">
                Ladies
              </span>
            )}
          </strong>
          <strong className="ml-auto whitespace-nowrap">{location}</strong>
        </div>
        <div className="flex gap-x-4 w-full">
          Time:
          <strong className="ml-auto whitespace-nowrap">{time}</strong>
        </div>
        <div className="flex gap-x-4 w-full">
          Address:
          <a
            href={mapUrl}
            onClick={(e) => {
              e.stopPropagation();
            }}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-500 ml-auto"
          >
            <strong className="flex lg:hidden whitespace-nowrap">
              {address.substring(0, MAX_ADDRESS_LENGTH)}...
            </strong>
            <strong className="hidden lg:flex whitespace-nowrap">
              {address}
            </strong>
          </a>
        </div>
        <div className="flex gap-x-4 w-full">
          Game pace:
          <strong className="ml-auto whitespace-nowrap uppercase italic">
            {speed}
          </strong>
        </div>
        {!hidden && !cancelled && (
          <RemainingSpots
            title="Spots remaining:"
            signedUp={signupsAmt}
            maxSignups={
              teams !== undefined
                ? MAX_SIGNUPS_PER_GAME * 2
                : MAX_SIGNUPS_PER_GAME
            }
            className="pl-0 text-md [&>div]:!px-2.5 [&>div]:!py-0.5"
          />
        )}
        {(hidden ||
          cancelled ||
          (waitlistAmt !== null && waitlistAmt <= 0)) && (
          <div className={`px-2 p-1 ${cancelled ? RED_TW : ORANGE_TW}`}>
            {cancelled ? "CANCELLED" : hidden ? "HIDDEN" : waitlistLabel}
          </div>
        )}
      </div>
      {!hidden && <div>{children}</div>}
    </div>
  );
}
