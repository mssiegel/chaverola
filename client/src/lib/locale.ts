import { useLocation } from "react-router-dom";

/**
 * Chaverola mirrors every route under an `/he` prefix (Hebrew variant). For now
 * `/he` renders the same English text — no translation, no RTL — but internal
 * navigation must preserve whichever prefix the user is currently under so they
 * never accidentally fall out of the Hebrew tree.
 */
export type Locale = "en" | "he";

export function localePrefix(pathname: string): "" | "/he" {
  return pathname === "/he" || pathname.startsWith("/he/") ? "/he" : "";
}

export function useLocale(): Locale {
  const { pathname } = useLocation();
  return localePrefix(pathname) === "/he" ? "he" : "en";
}

/**
 * Returns a function that prefixes an app-absolute path (e.g. `/activity/join`)
 * with the active locale prefix.
 */
export function useLocalePath(): (path: string) => string {
  const { pathname } = useLocation();
  const prefix = localePrefix(pathname);
  return (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${prefix}${normalized}` || "/";
  };
}
