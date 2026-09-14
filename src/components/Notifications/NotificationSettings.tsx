import { Loader } from "../ui";

import type { PushStatus } from "@/hooks/usePushNotifications";

export interface INotificationSettings {
  status: PushStatus;
  pending: boolean;
  error: Error | null;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
}

const WHAT_YOU_GET = (
  <ul className="list-disc ml-5 text-sm">
    <li>You move off the waitlist into a game</li>
    <li>A game you signed up for is cancelled</li>
    <li>Signups open for the week</li>
  </ul>
);

function _renderStatusBody({
  status,
  pending,
  onEnable,
  onDisable,
}: Omit<INotificationSettings, "error">) {
  switch (status) {
    case "loading":
      return <Loader className="w-[200px]" />;
    case "subscribed":
      return (
        <>
          <span>
            <strong className="text-green-700">ON</strong> for this device.
            We&apos;ll let you know when:
          </span>
          {WHAT_YOU_GET}
          <button
            onClick={(e) => {
              e.stopPropagation();
              void onDisable();
            }}
            disabled={pending}
          >
            {pending ? "..." : "Turn off"}
          </button>
        </>
      );
    case "unsubscribed":
      return (
        <>
          <span>Get a notification on this device when:</span>
          {WHAT_YOU_GET}
          <button
            onClick={(e) => {
              e.stopPropagation();
              void onEnable();
            }}
            disabled={pending}
          >
            {pending ? "..." : "Enable notifications"}
          </button>
        </>
      );
    case "denied":
      return (
        <span>
          Notifications are <strong>blocked</strong> for this site. Allow them
          in your browser/site settings, then reload this page.
        </span>
      );
    case "ios-needs-install":
      return (
        <>
          <span>
            On iPhone/iPad, notifications only work from the installed app
            (iOS 16.4+):
          </span>
          <ol className="list-decimal ml-5 text-sm">
            <li>Open this site in Safari</li>
            <li>
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
            </li>
            <li>Open LLL from your Home Screen</li>
            <li>Come back to this page and enable notifications</li>
          </ol>
        </>
      );
    case "unsupported":
    default:
      return (
        <span>
          This browser doesn&apos;t support notifications. Try Chrome, Firefox,
          Edge or Safari.
        </span>
      );
  }
}

export function NotificationSettings({
  error,
  ...props
}: INotificationSettings) {
  return (
    <div className="flex flex-col gap-y-3 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <div className="mr-auto px-2 py-1">Notifications</div> X
      </div>
      <div className="flex flex-col items-start gap-y-2 px-2 py-2">
        {_renderStatusBody(props)}
        {error !== null && (
          <span className="px-2 py-1 text-xs text-red-500">
            {error.message}
          </span>
        )}
      </div>
    </div>
  );
}
