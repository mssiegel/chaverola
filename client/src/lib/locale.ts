import { useLocation, useNavigate } from "react-router-dom";

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
 * Rewrites a pathname to the given locale, keeping the rest of the path
 * intact — e.g. ("/activity/join", "he") → "/he/activity/join" and
 * ("/he/activity/join", "en") → "/activity/join". Used by the navbar's
 * language switcher to swap locales in place.
 */
export function switchLocalePath(pathname: string, locale: Locale): string {
  const bare =
    localePrefix(pathname) === "/he" ? pathname.slice("/he".length) : pathname;
  const normalized = bare === "" ? "/" : bare;
  if (locale === "en") return normalized;
  return normalized === "/" ? "/he" : `/he${normalized}`;
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
    // Home is the prefix itself ("/he", not "/he/").
    if (normalized === "/") return prefix || "/";
    return `${prefix}${normalized}`;
  };
}

/**
 * `useNavigate` that applies the active locale prefix, so programmatic
 * navigation can't forget it. Use this instead of pairing `useNavigate`
 * with `useLocalePath` by hand.
 */
export function useLocaleNavigate(): (path: string) => void {
  const navigate = useNavigate();
  const localePath = useLocalePath();
  return (path: string) => navigate(localePath(path));
}
