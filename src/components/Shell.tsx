import type { ReactNode } from "react";
import type { Page } from "../App";

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
    <svg width="34" height="34" viewBox="0 0 64 64" role="img" aria-label="Dot-Dash logo">
      <rect width="64" height="64" rx="14" fill="#000" stroke="#3a3a3a" strokeWidth="2" />
      <circle cx="19" cy="32" r="7" fill="#fff" />
      <rect x="31" y="25" width="21" height="14" rx="7" fill="#fff" />
    </svg>
  );
}

export function Shell({ page, go, children }: { page: Page; go: (p: Page) => void; children: ReactNode }) {
  const active = page === "calibrate" ? "settings" : page;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <button className="flex items-center gap-3 rounded-lg text-left" onClick={() => go("home")} aria-label="Dot-Dash home">
            <Logo />
            <span className="text-xl font-bold tracking-tight">Dot-Dash</span>
          </button>
          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={active === n.id ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-base font-semibold transition ${active === n.id ? "bg-surface-2 text-text ring-1 ring-line" : "text-muted hover:bg-surface hover:text-text"}`}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-ok/40 bg-ok/10 px-3 py-1 text-sm font-semibold text-ok md:inline-flex">
            <span aria-hidden="true" className="grayscale">🔒</span> Video stays on this device
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-line px-4 py-5 text-center text-sm text-muted">
        Dot-Dash is an assistive tool, not a medical device. Always keep another way to call for help nearby.
      </footer>
    </div>
  );
}
