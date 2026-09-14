import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { type PushStatus, usePushNotifications } from "./usePushNotifications";

import { NAVLINKS_MAP, SMS_VERIFICATION } from "@/constants/links";
import { useUser } from "@/context/User/context";

// Per device, not per user: push subscriptions are per device too
const PROMPT_SEEN_KEY = "lll:push-prompt-seen";

// Login/verify: user isn't in yet. /me: already has the full settings panel
const EXCLUDED_PATHS = new Set<string>([
  NAVLINKS_MAP.LOGIN,
  SMS_VERIFICATION,
  "/me",
]);

// Only states where the banner can actually lead somewhere
const PROMPTABLE_STATUSES = new Set<PushStatus>([
  "unsubscribed",
  "ios-needs-install",
]);

function _hasSeenPrompt(): boolean {
  try {
    return window.localStorage.getItem(PROMPT_SEEN_KEY) !== null;
  } catch (err) {
    // Storage blocked (private mode etc.) - treat as seen rather than nag on
    // every page load
    return true;
  }
}

function _markPromptSeen(): void {
  try {
    window.localStorage.setItem(PROMPT_SEEN_KEY, new Date().toISOString());
  } catch (err) {
    // Nothing to do: worst case the banner shows again next visit
  }
}

export function usePushPromptBanner() {
  const { status, pending, error, enable } = usePushNotifications();
  const { user } = useUser();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const isLoggedIn = user._id !== undefined && user._id !== null;
  const isExcludedPath = pathname !== null && EXCLUDED_PATHS.has(pathname);

  useEffect(() => {
    if (
      visible ||
      !isLoggedIn ||
      isExcludedPath ||
      !PROMPTABLE_STATUSES.has(status) ||
      _hasSeenPrompt()
    ) {
      return;
    }

    // "Shown once" means marked on display, not on dismiss. It stays up for
    // the rest of this visit (Layout persists across client-side navigation)
    _markPromptSeen();
    setVisible(true);
  }, [isExcludedPath, isLoggedIn, status, visible]);

  // Hide once the user successfully turns notifications on
  useEffect(() => {
    if (status === "subscribed") {
      setVisible(false);
    }
  }, [status]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible: visible && !isExcludedPath,
    status,
    pending,
    error,
    enable,
    dismiss,
  };
}
