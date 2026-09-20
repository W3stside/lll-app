import { NotificationPromptBanner } from "./NotificationPromptBanner";
import { NotificationSettings } from "./NotificationSettings";
import { OpenSpotsBanner } from "./OpenSpotsBanner";

import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useOpenSpotsAlerts } from "@/hooks/useOpenSpotsAlerts";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePushPromptBanner } from "@/hooks/usePushPromptBanner";

// Container: one-time "enable notifications" prompt shown on any page
export function NotificationPromptContainer() {
  const { visible, status, pending, error, enable, dismiss } =
    usePushPromptBanner();

  if (!visible) return null;

  return (
    <NotificationPromptBanner
      status={status}
      pending={pending}
      error={error}
      onEnable={enable}
      onDismiss={dismiss}
    />
  );
}

// Container: owns the push state so NotificationSettings stays presentational
export function NotificationSettingsContainer() {
  const { status, pending, error, enable, disable } = usePushNotifications();
  const {
    preferences,
    pending: preferencePending,
    error: preferenceError,
    toggle,
  } = useNotificationPreferences();

  return (
    <NotificationSettings
      status={status}
      pending={pending}
      error={error ?? preferenceError}
      onEnable={enable}
      onDisable={disable}
      preferences={preferences}
      preferencePending={preferencePending}
      onTogglePreference={toggle}
    />
  );
}

export interface IOpenSpotsAlertsContainer {
  signupOpen: boolean;
}

// Container: one dismissable banner per game that still needs players
export function OpenSpotsAlertsContainer({
  signupOpen,
}: IOpenSpotsAlertsContainer) {
  const { alerts, dismiss } = useOpenSpotsAlerts(signupOpen);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-3 w-full max-w-[600px]">
      {alerts.map(({ key, game, openSpots }) => (
        <OpenSpotsBanner
          key={key}
          game={game}
          openSpots={openSpots}
          onDismiss={() => {
            dismiss(key);
          }}
        />
      ))}
    </div>
  );
}
