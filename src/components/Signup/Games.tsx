import { RemainingSpots } from "../ui";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import type { IGame } from "@/types/signups";

export function Games({
  game_id,
  location,
  time,
  address,
  mapUrl,
  speed,
  signupsAmt,
  children,
}: IGame & { signupsAmt: number; children?: React.ReactNode }) {
  return (
    <div key={game_id} className="flex flex-col container gap-y-4 pl-9 w-full">
      <div className="flex flex-row flex-wrap items-start w-full">
        <div className="flex gap-x-4 w-full">
          <strong className="text-lg">Game {game_id}</strong>
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
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-500 ml-auto"
          >
            <strong className="flex lg:hidden whitespace-nowrap">
              {address.substring(0, 22)}...
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
        <RemainingSpots
          signedUp={signupsAmt}
          maxSignups={MAX_SIGNUPS_PER_GAME}
          className="pl-0 text-md [&>div]:!px-2.5 [&>div]:!py-0.5"
        />
      </div>
      <div>{children}</div>
    </div>
  );
}
