export const WHATS_APP = "https://wa.me/";
export const WHATS_APP_GROUP_URL =
  "https://chat.whatsapp.com/HtFbF7KNjyg7rnDmHek9e5";
export const NAVLINKS = [
  { name: "Home", url: "/" },
  { name: "Games", url: "/signup" },
  { name: "Profile", url: "/me" },
  { name: "Wall of Shame", url: "/shame" },
  { name: "About", url: "/about" },
] as const;
export const NAVLINKS_MAP = {
  HOME: "/",
  SIGNUP: "/signup",
  SHAME: "/shame",
  ABOUT: "/about",
  LOGIN: "/login",
  PROFILES: "/profiles",
  NOT_FOUND: "/404",
} as const;

export const ADMIN_PATH = "/admin";

export const RULEBOOK_URL =
  "https://drive.google.com/file/d/1NFRmuEgL-mPpbCyVqeUZFI8m_TPbShLq/view";

export const BUY_ME_A_COFFEE = "https://buymeacoffee.com/w3stside";
export const SUPABASE_BASE_AVATAR_URI =
  "https://mcvuagpkcgjesgzmheac.supabase.co/storage/v1/object/public/avatars/avatars/";
