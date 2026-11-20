/**
 * Reduced motion, for the few places JavaScript asks for motion (smooth scrolling).
 * True when the OS prefers reduced motion, or when the "Reduce motion" setting is on
 * (App mirrors it onto <html data-reduce-motion>). CSS handles everything else.
 */
export const REDUCE_MOTION_ATTR = "data-reduce-motion";

export function motionReduced(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.hasAttribute(REDUCE_MOTION_ATTR)) return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Mirror the setting onto <html> so the CSS reduced-motion rule applies. */
export function applyReduceMotion(on: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute(REDUCE_MOTION_ATTR, on);
}
