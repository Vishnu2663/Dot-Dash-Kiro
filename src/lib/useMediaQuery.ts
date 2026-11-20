import { useSyncExternalStore } from "react";

/** True while the media query matches. Re-renders when it changes (rotation, resize). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop layout breakpoint (Tailwind `lg`). */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
