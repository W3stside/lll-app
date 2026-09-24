import Link from "next/link";

import type { GameNotificationType, IGameNotification } from "@/types";
import { cn } from "@/utils/tailwind";

export interface INotificationsInbox {
  notifications: IGameNotification[];
}

const TYPE_LABELS: Record<GameNotificationType, string> = {
  promoted: "IN",
  reminder: "REMINDER",
  bumped: "WAITLIST",
  removed: "REMOVED",
  cancelled: "CANCELLED",
};

// Fixed timezone so the server render and hydration produce the same string
const RECEIVED_AT_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function _formatReceivedAt(iso: string): string {
  return RECEIVED_AT_FORMAT.format(new Date(iso));
}

// Styled as a Win95 window like the other Notifications panels
export function NotificationsInbox({ notifications }: INotificationsInbox) {
  return (
    <div className="flex flex-col gap-y-3 text-black container w-full max-w-[720px]">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <div className="mr-auto px-2 py-1">Inbox.exe</div>
      </div>
      <div className="flex flex-col gap-y-2 px-2 pb-2">
        <small>
          Updates about your games. Each one disappears once its game is over,
          and everything clears when signups reset.
        </small>
        {notifications.length === 0 ? (
          <p className="py-4 text-center text-sm">
            Nothing here. You&apos;re all caught up.
          </p>
        ) : (
          <ul className="flex flex-col gap-y-2">
            {notifications.map(
              ({ _id, type, title, body, url, createdAt, readAt }) => (
                <li key={_id}>
                  <Link
                    href={url}
                    className={cn(
                      "flex flex-col gap-y-1 p-2 border-in no-underline text-black",
                      // Unread at the time the inbox was opened
                      {
                        "bg-[var(--background-window-highlight)]":
                          readAt === null,
                      },
                    )}
                  >
                    <div className="flex items-center gap-x-2 text-xs">
                      <span className="px-1 border-out font-bold">
                        {TYPE_LABELS[type]}
                      </span>
                      {readAt === null && <strong>NEW</strong>}
                      <span className="ml-auto">
                        {_formatReceivedAt(createdAt)}
                      </span>
                    </div>
                    <strong>{title}</strong>
                    <span className="text-sm">{body}</span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
