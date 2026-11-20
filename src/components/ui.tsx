import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

const VARIANTS = {
  primary: "bg-white text-black hover:bg-neutral-300 border border-transparent",
  secondary: "bg-surface-2 text-text hover:bg-line border border-line",
  ghost: "bg-transparent text-text hover:bg-surface-2 border border-transparent",
  danger: "bg-danger text-black hover:brightness-110 border border-transparent",
};
const SIZES = { md: "px-5 py-3 text-lg", lg: "px-7 py-4 text-2xl" };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = "secondary", size = "md", className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

export function Card({
  children, className = "", as: Tag = "section",
}: { children: ReactNode; className?: string; as?: ElementType }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface/90 p-5 shadow-lg shadow-black/20 sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-muted border-line",
  ok: "bg-ok/15 text-ok border-ok/40",
  warn: "bg-dash/15 text-dash border-dash/40",
  danger: "bg-danger/15 text-danger border-danger/40",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

/** Large coaching banner shown above the main interaction area. */
export function Coach({ text, tone = "info" }: { text: string; tone?: "info" | "warn" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${tone === "warn" ? "border-dash/60 bg-dash/10" : "border-line bg-surface-2"}`}
    >
      <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white text-base font-bold text-black">i</span>
      <p className="text-xl font-semibold leading-snug sm:text-2xl">{text}</p>
    </div>
  );
}

/** Dismissible result banner for alerts and answers. */
export function Notice({
  notice, onDismiss,
}: { notice: { text: string; ok: boolean } | null; onDismiss: () => void }) {
  if (!notice) return null;
  return (
    <div
      role="alert"
      className={`anim-slide flex items-center justify-between gap-4 rounded-2xl border-2 p-4 text-2xl font-bold ${notice.ok ? "border-ok bg-ok/15 text-ok" : "border-danger bg-danger/15 text-danger"}`}
    >
      <span>{notice.text}</span>
      <Button variant="ghost" onClick={onDismiss} aria-label="Dismiss message">✕</Button>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-black px-4 py-3 text-lg text-text placeholder:text-muted focus:border-white focus:outline-none";
