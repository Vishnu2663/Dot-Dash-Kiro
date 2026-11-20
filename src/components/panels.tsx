import { useEffect, useRef, type ReactNode } from "react";
import type { Timing } from "../lib/blink";
import type { TrackerStatus } from "../lib/tracker";
import { Badge, Button, Card } from "./ui";

export function CameraPanel({
  stream, status, error, faceFound, onStart,
}: {
  stream: MediaStream | null;
  status: TrackerStatus;
  error: string;
  faceFound: boolean;
  onStart: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-bg">
      <div className="relative aspect-[4/3]">
        <video ref={ref} muted playsInline className={`h-full w-full -scale-x-100 object-cover ${stream ? "" : "invisible"}`} />
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <span className="text-5xl grayscale" aria-hidden="true">📷</span>
            {status === "loading" ? (
              <p className="text-lg text-muted" role="status">Starting camera… the first time can take a few seconds.</p>
            ) : (
              <>
                <p className="text-lg text-muted">{error || "Camera is off"}</p>
                <Button variant="primary" onClick={onStart}>{status === "error" ? "Try again" : "Start camera"}</Button>
              </>
            )}
          </div>
        )}
        {stream && (
          <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)]">
            {faceFound ? <Badge tone="ok">● Face found</Badge> : <Badge tone="warn">No face — move closer or add light</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Live eye-closure meter with the threshold marker. The fill moves with transform only. */
export function EyeMeter({ score, threshold }: { score: number; threshold: number }) {
  const closed = score > threshold;
  const value = Math.min(1, Math.max(0, score));
  return (
    <div role="meter" aria-label="How closed your eyes are" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">Eyes</span>
        <span className={`rounded-pill border px-3 py-0.5 text-sm font-bold ${closed ? "border-danger bg-danger text-on-status" : "border-ok bg-ok-tint text-ok"}`}>
          {closed ? "CLOSED" : "OPEN"}
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-pill border border-line-strong bg-surface-2">
        <div
          className={`motion-progress absolute inset-0 rounded-pill ${closed ? "bg-danger" : "bg-ok"}`}
          style={{ transform: `scaleX(${value})`, transition: "transform var(--duration-gauge) linear" }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-inverse" style={{ left: `${threshold * 100}%` }} title="Closed-eye threshold" />
      </div>
    </div>
  );
}

/** Seconds shown across the full width of the blink gauge. */
export const GAUGE_MAX_S = 3.5;

export type BlinkZone = "ignored" | "dot" | "dash" | "sos";

/** Which zone a closure of `closedFor` seconds falls in, or null while the eyes are open. */
export function zoneFor(closedFor: number, timing: Timing): BlinkZone | null {
  if (closedFor <= 0) return null;
  if (closedFor < timing.naturalMax) return "ignored";
  if (closedFor < timing.dotMax) return "dot";
  if (closedFor < timing.dashMax) return "dash";
  return "sos";
}

const ZONE_TEXT: Record<BlinkZone, string> = {
  ignored: "Too short — counts as a normal blink",
  dot: "DOT — open now to enter a dot",
  dash: "DASH — open now to enter a dash",
  sos: "SOS — alert is being sent",
};

/**
 * Live blink gauge. The track shows the four zones and labelled boundary ticks. While the eyes are
 * closed, a fill grows from the left (transform: scaleX) and an edge marker moves with it
 * (transform: translateX). Both are progress indicators, so they keep moving under reduced motion.
 */
export function BlinkGauge({ closedFor, timing }: { closedFor: number; timing: Timing }) {
  const zone = zoneFor(closedFor, timing);
  const frac = (s: number) => Math.min(1, Math.max(0, s / GAUGE_MAX_S));
  const pct = (s: number) => `${frac(s) * 100}%`;
  const fill = frac(closedFor);
  const zones: { from: number; to: number; cls: string; name: BlinkZone }[] = [
    { from: 0, to: timing.naturalMax, cls: "bg-surface-2", name: "ignored" },
    { from: timing.naturalMax, to: timing.dotMax, cls: "bg-accent-zone-dot", name: "dot" },
    { from: timing.dotMax, to: timing.dashMax, cls: "bg-accent-zone-dash", name: "dash" },
    { from: timing.dashMax, to: GAUGE_MAX_S, cls: "bg-danger-tint", name: "sos" },
  ];
  const textColor = zone === "sos" ? "text-danger" : zone === "dot" || zone === "dash" ? "text-accent" : "text-muted";
  const progress = { transition: "transform var(--duration-gauge) linear" };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted">
        <span>Blink length</span>
        <span className="font-mono normal-case text-text">{closedFor.toFixed(1)} s</span>
      </div>

      {/* Labelled dot/dash boundary, above the track */}
      <div className="relative mb-1 h-5" aria-hidden="true">
        <span
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-text"
          style={{ left: pct(timing.dotMax) }}
        >
          • dot | dash —
        </span>
      </div>

      <div
        role="meter"
        aria-label="Blink length"
        aria-valuemin={0}
        aria-valuemax={GAUGE_MAX_S}
        aria-valuenow={Number(closedFor.toFixed(1))}
        aria-valuetext={zone ? ZONE_TEXT[zone] : "Eyes open"}
        className="relative h-7 overflow-hidden rounded-pill border border-line-strong"
      >
        <div className="absolute inset-0 flex">
          {zones.map((z) => (
            <div key={z.name} className={`h-full ${z.cls}`} style={{ width: `${((z.to - z.from) / GAUGE_MAX_S) * 100}%` }} />
          ))}
        </div>
        <div
          className={`motion-progress absolute inset-0 ${zone === "sos" ? "bg-danger" : "bg-accent"}`}
          style={{ ...progress, transform: `scaleX(${fill})` }}
        />
        {/* Boundary ticks drawn above the fill so they stay visible */}
        {[timing.naturalMax, timing.dotMax, timing.dashMax].map((s, i) => (
          <div
            key={i}
            className={`absolute inset-y-0 -translate-x-1/2 bg-inverse ${s === timing.dotMax ? "w-1" : "w-0.5"}`}
            style={{ left: pct(s) }}
          />
        ))}
        {/* Edge marker: a full-width layer moved with translateX, so only transform changes */}
        <div className="motion-progress absolute inset-0" style={{ ...progress, transform: `translateX(${fill * 100}%)` }}>
          {closedFor > 0 && <div className="absolute inset-y-0 left-0 w-1.5 -translate-x-1/2 rounded-pill bg-inverse shadow-raised" />}
        </div>
      </div>

      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>ignore</span><span>• dot</span><span>— dash</span><span>SOS</span>
      </div>
      <p className={`mt-2 min-h-7 text-base font-semibold ${textColor}`}>
        {zone ? ZONE_TEXT[zone] : "Close your eyes to start a blink"}
      </p>
    </div>
  );
}

/** Camera, eye meter and blink gauge, used on every blink-driven page. */
export function Sidebar({
  tracker, score, closedFor, timing, children,
}: {
  tracker: { stream: MediaStream | null; status: TrackerStatus; error: string; faceFound: boolean; start: () => Promise<boolean> };
  score: number;
  closedFor: number;
  timing: Timing;
  children?: ReactNode;
}) {
  return (
    <>
      <CameraPanel
        stream={tracker.stream}
        status={tracker.status}
        error={tracker.error}
        faceFound={tracker.faceFound}
        onStart={() => void tracker.start()}
      />
      <Card className="space-y-5">
        <EyeMeter score={score} threshold={timing.threshold} />
        <BlinkGauge closedFor={closedFor} timing={timing} />
      </Card>
      {children}
    </>
  );
}
