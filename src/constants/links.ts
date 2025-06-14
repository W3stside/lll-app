import doc from "@/assets/doc.png";
import error from "@/assets/error.png";
import games from "@/assets/games.png";
import info from "@/assets/info.png";

export const WHATS_APP = "https://wa.me";
export const WHATS_APP_GROUP_URL =
  "https://chat.whatsapp.com/HtFbF7KNjyg7rnDmHek9e5";
export const NAVLINKS = [
  { name: "Home", url: "/" },
  { name: "Games", url: "/signup", icon: games },
  { name: "Profile", url: "/me", icon: doc },
  { name: "Wall of Shame", url: "/shame", icon: error },
  { name: "About", url: "/about", icon: info, className: "hidden lg:flex" },
] as const;
export const NAVLINKS_MAP = {
  HOME: "/",
  SIGNUP: "/signup",
  SHAME: "/shame",
  ABOUT: "/about",
  LOGIN: "/login",
  PROFILES: "/profiles",
  NOT_FOUND: "/404",
  BANNED: "/shadow-realm",
} as const;

export const ADMIN_PATH = "/admin";

export const INSTAGRAM_URL = "https://www.instagram.com/lisbons_lowest_league/";
export const RULEBOOK_URL =
  "https://drive.google.com/file/d/1NFRmuEgL-mPpbCyVqeUZFl8m_TPbShLq/view?usp=sharing";

export const BUY_ME_A_COFFEE = "https://ko-fi.com/w3stside";
export const SUPABASE_BASE_AVATAR_URI =
  "https://mcvuagpkcgjesgzmheac.supabase.co/storage/v1/object/public/";
