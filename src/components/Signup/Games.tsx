import { RemainingSpots } from "../ui";

import { ORANGE_TW } from "@/constants/colours";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { Gender, type IGame } from "@/types/users";

interface IGames extends IGame {
  date: string;
  signupsAmt: number;
  waitlistAmt: number;
  children?: React.ReactNode;
}

export function Games({
  game_id,
  location,
  time,
  address,
  mapUrl,
  speed,
  gender,
  signupsAmt,
  waitlistAmt,
  children,
}: IGames) {
  return (
    <div key={game_id} className="flex flex-col container gap-y-4 pl-9 w-full">
      <div className="flex flex-row flex-wrap items-start w-full">
        <div className="flex gap-x-4 w-full">
          <strong className="flex items-center gap-x-2 text-lg">
            Game {game_id}{" "}
            {gender === Gender.FEMALE && (
              <span className="text-[11px] bg-red-100 px-2 h-[20px] leading-[1.9]">
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
          title="Spots remaining:"
          signedUp={signupsAmt}
          maxSignups={MAX_SIGNUPS_PER_GAME}
          className="pl-0 text-md [&>div]:!px-2.5 [&>div]:!py-0.5"
        />
        {waitlistAmt <= 0 && (
          <div className={`px-2 p-1 ${ORANGE_TW}`}>Waitlist only</div>
        )}
        {/* {waitlistAmt < 0 && (
          <RemainingSpots
            title="Waitlist remaining:"
            signedUp={-waitlistAmt}
            maxSignups={MAX_WAITLIST_PER_GAME}
            className="mt-0.5 pl-0 text-md [&>div]:!px-2.5 [&>div]:!py-0.5"
          />
        )} */}
      </div>
      <div>{children}</div>
    </div>
  );
}
