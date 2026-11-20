import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

// Colour changes are instant. Only transform and opacity animate (press feedback), so nothing
// repaints during blink input.
const VARIANTS = {
  primary: "bg-inverse text-on-inverse border-2 border-inverse shadow-raised",
  secondary: "bg-surface-2 text-text border-2 border-line-strong hover:bg-surface-3",
  ghost: "bg-transparent text-text border-2 border-transparent hover:bg-surface-2",
  danger: "bg-danger text-on-status border-2 border-danger shadow-raised",
};
const SIZES = {
  md: "min-h-12 px-5 py-2.5 text-base sm:text-lg",
  lg: "min-h-14 px-6 py-3 text-lg sm:px-7 sm:text-2xl",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = "secondary", size = "md", className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-transform duration-150 ease-standard active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function Card({
  children, className = "", as: Tag = "section",
}: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={`surface rounded-card p-4 sm:p-6 ${className}`}>{children}</Tag>;
}

const TONES = {
  neutral: "bg-surface-2 text-muted border-line-strong",
  ok: "bg-ok-tint text-ok border-ok",
  warn: "bg-warn-tint text-warn border-warn",
  danger: "bg-danger-tint text-danger border-danger",
};
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-xs font-semibold sm:text-sm ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 sm:mb-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-base text-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}

/**
 * Coaching banner above the main interaction area. Its text changes during blink input, so it
 * does not animate: a moving banner would pull attention away from the blink.
 */
export function Coach({ text, tone = "info" }: { text: string; tone?: "info" | "warn" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-card border-2 px-4 py-3.5 sm:px-5 sm:py-4 ${tone === "warn" ? "border-warn bg-warn-tint" : "border-line bg-surface-2"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-pill text-sm font-bold text-on-status ${tone === "warn" ? "bg-warn" : "bg-inverse"}`}
      >
        {tone === "warn" ? "!" : "i"}
      </span>
      <p className="text-lg font-semibold leading-snug sm:text-2xl">{text}</p>
    </div>
  );
}

/**
 * Toast for alerts and answers. Pinned to the bottom of the viewport so it never covers the blink
 * gauge, which sits near the top on phones. Render it last in the page so tab order matches.
 */
export function Notice({
  notice, onDismiss,
}: { notice: { text: string; ok: boolean } | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
      <div
        role="alert"
        key={notice.text}
        className={`anim-toast pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-card border-2 bg-surface-2 py-2 pl-5 pr-2 text-lg font-bold shadow-raised sm:text-2xl ${notice.ok ? "border-ok text-ok" : "border-danger text-danger"}`}
      >
        <span className="min-w-0 break-words py-1.5">{notice.text}</span>
        <Button variant="ghost" className="shrink-0" onClick={onDismiss} aria-label="Dismiss message">✕</Button>
      </div>
    </div>
  );
}

/** Text inputs. Focus uses the global focus outline, like every other control. */
export const inputClass =
  "w-full min-h-12 rounded-control border-2 border-line-strong bg-bg px-4 py-3 text-lg text-text placeholder:text-muted";
