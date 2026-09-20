import Image from "next/image";
import Link from "next/link";

import mail from "@/assets/mail.png";
import { RED_TW } from "@/constants/colours";
import type { PushStatus } from "@/hooks/usePushNotifications";

export interface INotificationPromptBanner {
  status: PushStatus;
  pending: boolean;
  error: Error | null;
  onEnable: () => Promise<void>;
  onDismiss: () => void;
}

// Styled as a Win95 window to match Dialog/CancelDialog: blue title bar with
// an X, bevelled .container body, pixel icon beside the message
export function NotificationPromptBanner({
  status,
  pending,
  error,
  onEnable,
  onDismiss,
}: INotificationPromptBanner) {
  const isIosInstall = status === "ios-needs-install";

  return (
    <div
      role="region"
      aria-label="Enable notifications"
      className="container flex flex-col w-full"
    >
      <div className="container-header !h-auto -mt-2 -mx-1.5 items-center gap-4 px-[8px] !justify-between">
        <h5>Notifications.exe</h5>
        <div
          role="button"
          aria-label="Dismiss"
          className="cursor-pointer p-1 pt-1.5 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <h5>X</h5>
        </div>
      </div>
      <div className="flex flex-col gap-y-4 p-2">
        <div className="flex gap-x-4 items-start">
          <Image
            src={mail}
            alt="notifications"
            width={40}
            height={40}
            className="w-[40px] h-[40px] shrink-0"
          />
          <div className="flex flex-col gap-y-2 text-sm">
            <strong>Never miss a spot!</strong>
            <span>
              Get notified when you&apos;re moved off the waitlist, a game is
              cancelled, a game still needs players, or signups open.
            </span>
            {isIosInstall && (
              <div className="border-in bg-[var(--background-window-highlight)] px-2 py-1 text-xs">
                <strong>iPhone/iPad:</strong> tap <strong>Share</strong> then{" "}
                <strong>Add to Home Screen</strong>, open LLL from your Home
                Screen and enable them in your profile.
              </div>
            )}
            <span className="text-xs">
              You can change this any time in your{" "}
              <Link href="/me" onClick={onDismiss}>
                profile
              </Link>
              .
            </span>
          </div>
        </div>
        <div className="flex gap-x-6 justify-center items-center">
          {!isIosInstall && (
            <button
              disabled={pending}
              className="bg-[#8dc09f]"
              onClick={(e) => {
                e.stopPropagation();
                void onEnable();
              }}
            >
              {pending ? "Enabling..." : "Enable"}
            </button>
          )}
          <button
            disabled={pending}
            className="bg-[var(--background-color-2)]"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            {isIosInstall ? "Got it" : "Not now"}
          </button>
        </div>
        {error !== null && (
          <span className={`px-2 py-1 text-xs ${RED_TW}`}>{error.message}</span>
        )}
      </div>
    </div>
  );
}
