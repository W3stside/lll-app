import { NotificationPromptBanner } from "./NotificationPromptBanner";
import { NotificationSettings } from "./NotificationSettings";

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

  return (
    <NotificationSettings
      status={status}
      pending={pending}
      error={error}
      onEnable={enable}
      onDisable={disable}
    />
  );
}
