import { Loader } from "../ui";

import {
  NOTIFICATION_PREFERENCE_KEYS,
  NOTIFICATION_PREFERENCE_LABELS,
} from "@/constants/notifications";
import type { PushStatus } from "@/hooks/usePushNotifications";
import type {
  INotificationPreferences,
  NotificationPreferenceKey,
} from "@/types";

export interface INotificationSettings {
  status: PushStatus;
  pending: boolean;
  error: Error | null;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  preferences: INotificationPreferences;
  // The key currently being saved, if any
  preferencePending: NotificationPreferenceKey | null;
  onTogglePreference: (key: NotificationPreferenceKey) => Promise<void>;
}

const ALWAYS_ON_LABEL = "Signups open for the week";

const WHAT_YOU_GET = (
  <ul className="list-disc ml-5 text-sm">
    {NOTIFICATION_PREFERENCE_KEYS.map((key) => (
      <li key={key}>{NOTIFICATION_PREFERENCE_LABELS[key]}</li>
    ))}
    <li>{ALWAYS_ON_LABEL}</li>
  </ul>
);

interface IPreferenceToggles {
  preferences: INotificationPreferences;
  preferencePending: NotificationPreferenceKey | null;
  onTogglePreference: (key: NotificationPreferenceKey) => Promise<void>;
}

// Only shown once push is on: the choices mean nothing before that
function PreferenceToggles({
  preferences,
  preferencePending,
  onTogglePreference,
}: IPreferenceToggles) {
  return (
    <ul className="flex flex-col gap-y-2 text-sm">
      {NOTIFICATION_PREFERENCE_KEYS.map((key) => (
        <li key={key}>
          <label className="flex items-start gap-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 !w-auto"
              checked={preferences[key]}
              disabled={preferencePending !== null}
              onChange={() => {
                void onTogglePreference(key);
              }}
            />
            <span>
              {NOTIFICATION_PREFERENCE_LABELS[key]}
              {preferencePending === key && " ..."}
            </span>
          </label>
        </li>
      ))}
      <li>
        <label className="flex items-start gap-x-3 cursor-not-allowed">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 !w-auto"
            checked
            disabled
            readOnly
          />
          <span>{ALWAYS_ON_LABEL} (always on)</span>
        </label>
      </li>
    </ul>
  );
}

function _renderStatusBody({
  status,
  pending,
  onEnable,
  onDisable,
  preferences,
  preferencePending,
  onTogglePreference,
}: Omit<INotificationSettings, "error">) {
  switch (status) {
    case "loading":
      return <Loader className="w-[200px]" />;
    case "subscribed":
      return (
        <>
          <span>
            <strong className="text-green-700">ON</strong> for this device.
            Choose what we send you:
          </span>
          <PreferenceToggles
            preferences={preferences}
            preferencePending={preferencePending}
            onTogglePreference={onTogglePreference}
          />
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
            On iPhone/iPad, notifications only work from the installed app (iOS
            16.4+):
          </span>
          <ol className="list-decimal ml-5 text-sm">
            <li>Open this site in Safari</li>
            <li>
              Tap <strong>Share</strong> then{" "}
              <strong>Add to Home Screen</strong>
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
