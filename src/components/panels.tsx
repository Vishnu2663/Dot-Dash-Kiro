import { useEffect, useRef } from "react";
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
    <div className="overflow-hidden rounded-2xl border border-line bg-black">
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
          <div className="absolute left-3 top-3">
            {faceFound ? <Badge tone="ok">● Face found</Badge> : <Badge tone="warn">No face — move closer or add light</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Live eye-closure meter with the threshold marker. */
export function EyeMeter({ score, threshold }: { score: number; threshold: number }) {
  const closed = score > threshold;
  return (
    <div role="meter" aria-label="How closed your eyes are" aria-valuenow={Math.round(score * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">Eyes</span>
        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${closed ? "bg-danger text-black" : "bg-ok/20 text-ok"}`}>
          {closed ? "CLOSED" : "OPEN"}
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${closed ? "bg-danger" : "bg-ok"}`}
          style={{ width: `${Math.min(1, score) * 100}%` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${threshold * 100}%` }} title="Closed-eye threshold" />
      </div>
    </div>
  );
}

const BAR_MAX = 3.5;

/** Shows what the blink in progress will count as. */
export function BlinkBar({ closedFor, timing }: { closedFor: number; timing: Timing }) {
  const pos = (s: number) => `${Math.min(100, (s / BAR_MAX) * 100)}%`;
  const zone =
    closedFor <= 0 ? null
    : closedFor < timing.naturalMax ? "ignored"
    : closedFor < timing.dotMax ? "dot"
    : closedFor < timing.dashMax ? "dash"
    : "sos";
  const labels = {
    ignored: "Too short — counts as a normal blink",
    dot: "DOT — open now to enter a dot",
    dash: "DASH — open now to enter a dash",
    sos: "SOS — alert is being sent",
  };
  const zones = [
    { from: 0, to: timing.naturalMax, cls: "bg-surface-2", name: "ignored" },
    { from: timing.naturalMax, to: timing.dotMax, cls: "bg-dot/60", name: "dot" },
    { from: timing.dotMax, to: timing.dashMax, cls: "bg-dash/60", name: "dash" },
    { from: timing.dashMax, to: BAR_MAX, cls: "bg-danger/50", name: "sos" },
  ];
  const textColor = zone === "sos" ? "text-danger" : zone === "dash" ? "text-dash" : zone === "dot" ? "text-dot" : "text-muted";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted">
        <span>Blink length</span>
        <span className="font-mono normal-case">{closedFor.toFixed(1)} s</span>
      </div>
      <div className="relative flex h-6 overflow-hidden rounded-full border border-line">
        {zones.map((z) => (
          <div
            key={z.name}
            className={`h-full ${z.cls} ${zone === z.name ? "brightness-150" : ""}`}
            style={{ width: `${((z.to - z.from) / BAR_MAX) * 100}%` }}
          />
        ))}
        {closedFor > 0 && <div className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow" style={{ left: pos(closedFor) }} />}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>ignore</span><span>• dot</span><span>— dash</span><span>SOS</span>
      </div>
      <p className={`mt-2 min-h-7 text-base font-semibold ${textColor}`}>
        {zone ? labels[zone] : "Close your eyes to start a blink"}
      </p>
    </div>
  );
}

/** Camera, eye meter and blink bar stacked, used on every blink-driven page. */
export function Sidebar({
  tracker, score, closedFor, timing, children,
}: {
  tracker: { stream: MediaStream | null; status: TrackerStatus; error: string; faceFound: boolean; start: () => Promise<boolean> };
  score: number;
  closedFor: number;
  timing: Timing;
  children?: React.ReactNode;
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
        <BlinkBar closedFor={closedFor} timing={timing} />
      </Card>
      {children}
    </>
  );
}
