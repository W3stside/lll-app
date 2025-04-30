import { useCallback, useEffect, useState } from "react";

enum Theme {
  LIGHT = "light-theme",
  DARK = "dark-theme",
}

export function useClientTheme() {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = useCallback(() => {
    if (typeof window !== "undefined") {
      document.body.classList.toggle(Theme.DARK);

      if (document.body.classList.contains(Theme.DARK)) {
        setIsDark(true);
      } else {
        setIsDark(false);
      }

      localStorage.setItem(
        "theme",
        document.body.classList.contains(Theme.DARK) ? Theme.DARK : Theme.LIGHT,
      );
    }
  }, []);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === Theme.DARK) {
      document.body.classList.toggle(Theme.DARK);

      if (document.body.classList.contains(Theme.DARK)) {
        setIsDark(true);
      } else {
        setIsDark(false);
      }
    }
  }, []);

  return {
    isDark,
    toggleTheme,
  };
}
