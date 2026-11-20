import type { ReactNode } from "react";
import type { Page } from "../App";
import { Badge } from "./ui";

const NAV: { id: Page; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "talk", label: "Morse" },
  { id: "easy", label: "Easy mode" },
  { id: "caregiver", label: "Caregiver" },
  { id: "guide", label: "Guide" },
  { id: "settings", label: "Settings" },
];

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" role="img" aria-label="Dot-Dash logo" className="shrink-0">
      <rect width="64" height="64" rx="14" className="fill-bg stroke-line-strong" strokeWidth="2" />
      <circle cx="19" cy="32" r="7" className="fill-inverse" />
      <rect x="31" y="25" width="21" height="14" rx="7" className="fill-inverse" />
    </svg>
  );
}

/**
 * Header, navigation, main area and footer. The nav wraps (a 3-column grid on phones) instead of
 * scrolling sideways. The header is sticky only from md up, so on phones it doesn't keep two rows of
 * navigation above the blink gauge. Solid background, no blur.
 */
export function Shell({ page, go, children }: { page: Page; go: (p: Page) => void; children: ReactNode }) {
  const active = page === "calibrate" ? "settings" : page;
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse"
      >
        Skip to content
      </a>
      <header className="z-20 border-b border-line bg-bg md:sticky md:top-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <button className="flex min-h-11 items-center gap-3 rounded-control text-left" onClick={() => go("home")} aria-label="Dot-Dash home">
            <Logo />
            <span className="text-xl font-bold tracking-tight">Dot-Dash</span>
          </button>
          <nav aria-label="Main" className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-1 sm:flex-wrap">
            {NAV.map((n) => {
              const current = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  aria-current={current ? "page" : undefined}
                  className={`min-h-11 rounded-control border-2 px-3 py-2 text-base font-semibold ${current ? "border-line-strong bg-surface-3 text-text" : "border-transparent text-muted hover:bg-surface-2 hover:text-text"}`}
                >
                  {n.label}
                </button>
              );
            })}
          </nav>
          <Badge tone="ok" className="ml-auto hidden md:inline-flex">
            <span aria-hidden="true" className="grayscale">🔒</span> Video stays on this device
          </Badge>
        </div>
      </header>
      <main id="main" className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-line px-4 py-5 text-center text-sm text-muted">
        Dot-Dash is an assistive tool, not a medical device. Always keep another way to call for help nearby.
      </footer>
    </div>
  );
}
