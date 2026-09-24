import { Collapsible } from "../ui";

import { RED_TW } from "@/constants/colours";
import type { IGameOccurrence, IUser } from "@/types";
import { GAME_HISTORY_CSV_URL } from "@/utils/api/occurrences";
import { parseOccurrenceKey } from "@/utils/date";
import {
  ATTENDANCE_LABELS,
  getOccurrencePlayers,
  summariseOccurrence,
} from "@/utils/gameHistory";

const LIST_LABELS = {
  confirmed: "",
  waitlist: " (waitlist)",
} as const;

interface IGameHistory {
  // Newest first
  occurrences: IGameOccurrence[];
  usersById: Record<string, IUser | undefined>;
  startCollapsed?: boolean;
}

function _stopPropagation(e: React.MouseEvent) {
  // Keeps clicks inside the section from collapsing it
  e.stopPropagation();
}

function _describe({ name, game_number, time }: IGameOccurrence) {
  const game =
    name ?? (game_number !== undefined ? `Game ${game_number}` : "Game");
  return `${game} @ ${time}`;
}

export function GameHistory({
  occurrences,
  usersById,
  startCollapsed = true,
}: IGameHistory) {
  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !px-0 !border-0"
      collapsedHeight={39}
      startCollapsed={startCollapsed}
    >
      <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
        <small className="px-2 py-1 text-xs mr-auto">
          [+/-] <span className="hidden xl:inline">expand/minimise</span>
        </small>
        Game history
      </div>
      <div
        className="container flex-col sm:flex-row text-xs gap-2"
        onClick={_stopPropagation}
      >
        <div className="flex-3">
          Every game&apos;s final lists are saved here when you clear all
          signups, together with the attendance and payments marked in
          &quot;Track payment per game&quot;. Showing the latest weeks; the
          download has everything.
        </div>
        <a
          href={GAME_HISTORY_CSV_URL}
          download
          className="flex-0.5 no-underline self-center"
        >
          <button className="bg-[var(--background-color-2)] justify-center font-bold whitespace-nowrap">
            Download CSV
          </button>
        </a>
      </div>
      <div className="flex flex-col gap-y-2 pt-3" onClick={_stopPropagation}>
        {occurrences.length === 0 ? (
          <p className="pl-4">
            Nothing yet. History starts the next time you clear all signups.
          </p>
        ) : (
          occurrences.map((occurrence) => {
            const { confirmed, played, noShows, unpaid } =
              summariseOccurrence(occurrence);
            const date = parseOccurrenceKey(occurrence.occurrence);

            return (
              <div
                key={occurrence._id}
                className="container !flex-col !max-w-none text-sm"
              >
                <details>
                  <summary className="cursor-pointer">
                    <strong>
                      {date?.toDateString() ?? occurrence.occurrence} ·{" "}
                      {_describe(occurrence)}
                    </strong>{" "}
                    · {occurrence.location}
                    {occurrence.cancelled && (
                      <span className={`ml-2 px-1 ${RED_TW}`}>CANCELLED</span>
                    )}
                    <div className="text-xs">
                      {occurrence.archivedAt === null
                        ? "This week: lists are saved when signups are cleared · "
                        : `${confirmed} on the list · `}
                      {played} played · {noShows} no-show · {unpaid} unpaid
                    </div>
                  </summary>
                  <ul className="mt-2 flex flex-col gap-y-1 text-xs">
                    {getOccurrencePlayers(occurrence).map(
                      ({ userId, list, attendance, payment }) => {
                        const user = usersById[userId];

                        return (
                          <li
                            key={userId}
                            className="flex flex-wrap justify-between gap-x-2 border-b border-[var(--border-light)]"
                          >
                            <span>
                              {user !== undefined
                                ? `${user.first_name} ${user.last_name}`
                                : "(deleted account)"}
                              {list !== null && LIST_LABELS[list]}
                            </span>
                            <span>
                              {attendance !== undefined
                                ? ATTENDANCE_LABELS[attendance]
                                : "-"}{" "}
                              · {payment ?? "-"}
                            </span>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </details>
              </div>
            );
          })
        )}
      </div>
    </Collapsible>
  );
}
