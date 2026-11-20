import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

const VARIANTS = {
  primary:
    "bg-white text-black hover:bg-neutral-200 shadow-[0_10px_30px_-10px_rgb(255_255_255/0.45)] border border-transparent",
  secondary: "bg-white/[0.06] text-text hover:bg-white/[0.11] border border-white/10",
  ghost: "bg-transparent text-text hover:bg-white/[0.07] border border-transparent",
  danger: "bg-danger text-black hover:brightness-110 shadow-[0_10px_30px_-10px_rgb(255_93_108/0.6)] border border-transparent",
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
      className={`inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,background-color,box-shadow,opacity] duration-200 ease-spring active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function Card({
  children, className = "", as: Tag = "section",
}: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={`surface rounded-3xl p-4 sm:p-6 ${className}`}>{children}</Tag>;
}

const TONES = {
  neutral: "bg-white/[0.06] text-muted border-white/10",
  ok: "bg-ok/12 text-ok border-ok/35",
  warn: "bg-dash/12 text-dash border-dash/35",
  danger: "bg-danger/12 text-danger border-danger/35",
};

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 sm:mb-7">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-base text-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}

/** Coaching banner above the main interaction area. Animates when its text changes. */
export function Coach({ text, tone = "info" }: { text: string; tone?: "info" | "warn" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-3xl border px-4 py-3.5 sm:px-5 sm:py-4 ${tone === "warn" ? "border-dash/40 bg-dash/[0.08]" : "border-white/10 bg-white/[0.04]"}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold text-black ${tone === "warn" ? "bg-dash" : "bg-white"}`}
      >
        {tone === "warn" ? "!" : "i"}
      </span>
      <p key={text} className="anim-pop text-lg font-semibold leading-snug sm:text-2xl">{text}</p>
    </div>
  );
}

/** Floating toast for alerts and answers. Stays visible wherever the page is scrolled. */
export function Notice({
  notice, onDismiss,
}: { notice: { text: string; ok: boolean } | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-40 flex justify-center px-3">
      <div
        role="alert"
        key={notice.text}
        className={`anim-slide glass pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-3xl border-2 py-2 pl-5 pr-2 text-lg font-bold shadow-2xl shadow-black/60 sm:text-2xl ${notice.ok ? "border-ok/70 text-ok" : "border-danger/70 text-danger"}`}
      >
        <span className="py-1.5">{notice.text}</span>
        <Button variant="ghost" className="shrink-0" onClick={onDismiss} aria-label="Dismiss message">✕</Button>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-lg text-text placeholder:text-muted transition focus:border-white/60 focus:outline-none focus:ring-4 focus:ring-white/10";

/** Animated dots and dashes used as a brand mark in the hero. */
export function MorseSignal({ className = "" }: { className?: string }) {
  const marks = [".", "-", ".", ".", "-", "-", "."];
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-hidden="true">
      {marks.map((m, i) => (
        <span
          key={i}
          className={`rounded-full bg-white ${m === "." ? "size-3" : "h-3 w-8"}`}
          style={{ animation: `signal 2.8s ${i * 0.18}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}
