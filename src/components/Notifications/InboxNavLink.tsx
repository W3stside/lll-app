import Image from "next/image";
import Link from "next/link";

import mail from "@/assets/mail.png";
import { NAVLINKS_MAP } from "@/constants/links";

export interface IInboxNavLink {
  unreadCount: number;
}

const MAX_BADGE_COUNT = 9;

export function InboxNavLink({ unreadCount }: IInboxNavLink) {
  const hasUnread = unreadCount > 0;

  return (
    <Link href={NAVLINKS_MAP.NOTIFICATIONS} className="whitespace-nowrap">
      <button
        className="underline flex items-center gap-x-1.5 w-max"
        aria-label={hasUnread ? `Inbox, ${unreadCount} unread` : "Inbox"}
      >
        <Image src={mail} alt="" className="w-[16px] h-[16px]" />
        {/* Label hidden on phones: the navbar is already full there */}
        <span className="hidden sm:inline">Inbox</span>
        {hasUnread && (
          <span className="px-1 text-[10px] leading-4 font-bold text-white bg-red-600 no-underline">
            {unreadCount > MAX_BADGE_COUNT
              ? `${MAX_BADGE_COUNT}+`
              : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}
