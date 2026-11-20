import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, PageTitle } from "../components/ui";
import { Sidebar } from "../components/panels";
import { DEFAULT_TIMING, fitTiming, mean, type Timing } from "../lib/blink";
import { saveSettings, type Settings } from "../lib/settings";
import { useBlinkInput } from "../lib/tracker";
import type { Page } from "../App";

const GROUPS = ["Eyes open", "Eyes closed", "Short blinks", "Long blinks"];
const TARGET = 3; // blinks wanted per kind
const SETTLE_S = 1.5; // wait before counting blinks so the user can get ready

type Kind = "open" | "closed" | "short" | "long";
const STEPS: { kind: Kind; group: number; title: string; text: string; limit: number }[] = [
  { kind: "open", group: 0, title: "Eyes open", text: "Look at the screen and keep your eyes OPEN.", limit: 5 },
  { kind: "closed", group: 1, title: "Eyes closed", text: "Now close your eyes and keep them CLOSED.", limit: 3 },
  { kind: "short", group: 2, title: "Short blinks", text: "Do 3 SHORT blinks: close your eyes for about half a second, then open. Pause between blinks.", limit: 25 },
  { kind: "long", group: 3, title: "Long blinks", text: 'Do 3 LONG blinks: close your eyes and count "one, two" before opening (about 1.5 seconds).', limit: 25 },
];

interface Result { timing: Timing; shorts: number; longs: number }

export function Calibrate({ settings, onSaved, go }: { settings: Settings; onSaved: (s: Settings) => void; go: (p: Page) => void }) {
  const [step, setStep] = useState(-1); // -1 idle, STEPS.length done
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [recorded, setRecorded] = useState(0);
  const [hint, setHint] = useState("");
  const [ready, setReady] = useState(false);
  const [liveThreshold, setLiveThreshold] = useState(settings.timing.threshold);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState("");

  const stepRef = useRef(-1);
  const stepStart = useRef(0);
  const doneAt = useRef<number | null>(null); // when the last needed blink was recorded
  const threshold = useRef(DEFAULT_TIMING.threshold);
  const openSamples = useRef<number[]>([]);
  const closedSamples = useRef<number[]>([]);
  const shorts = useRef<number[]>([]);
  const longs = useRef<number[]>([]);
  const closeStart = useRef<number | null>(null);
  const faceRef = useRef(true);
  const statusRef = useRef("idle");

  const beginStep = (i: number) => {
    stepRef.current = i;
    stepStart.current = performance.now();
    doneAt.current = null;
    closeStart.current = null;
    setRecorded(0);
    setHint("");
    setReady(false);
    setStep(i);
  };

  const fail = useCallback((message: string) => {
    stepRef.current = -1;
    doneAt.current = null;
    setStep(-1);
    setFailure(message);
  }, []);

  const finish = useCallback(() => {
    if (shorts.current.length < 2 || longs.current.length < 2) {
      fail(`I only recorded ${shorts.current.length} short and ${longs.current.length} long blinks, so nothing was saved. Make sure your face is visible and well lit, then try again.`);
      return;
    }
    const timing = fitTiming(settings.timing, mean(openSamples.current), mean(closedSamples.current), shorts.current, longs.current);
    const next = { ...settings, timing, calibrated: true };
    saveSettings(next);
    onSaved(next);
    setResult({ timing, shorts: shorts.current.length, longs: longs.current.length });
    stepRef.current = STEPS.length;
    setStep(STEPS.length);
  }, [settings, onSaved, fail]);

  /** Collects raw samples and measures blinks for the current step. */
  const onFrame = useCallback((score: number, t: number) => {
    const s = STEPS[stepRef.current];
    if (!s) return;
    const elapsed = (performance.now() - stepStart.current) / 1000;
    if (s.kind === "open" && elapsed > 0.5) {
      if (faceRef.current) openSamples.current.push(score);
    } else if (s.kind === "closed" && elapsed > 1) {
      closedSamples.current.push(score);
    } else if ((s.kind === "short" || s.kind === "long") && elapsed > SETTLE_S && faceRef.current) {
      const closed = score > threshold.current;
      if (closed && closeStart.current === null) closeStart.current = t;
      if (!closed && closeStart.current !== null) {
        const held = t - closeStart.current;
        closeStart.current = null;
        if (held < 0.2) return;
        if (s.kind === "short" && held > 1.2) return setHint("That was too long. Blink more quickly.");
        if (s.kind === "long" && held < 0.9) return setHint("That was too short. Keep your eyes closed a little longer.");
        if (held > 3) return setHint("That was too long. Open your eyes sooner.");
        const list = s.kind === "short" ? shorts : longs;
        list.current.push(held);
        setHint("");
        setRecorded(list.current.length);
        if (list.current.length >= TARGET) doneAt.current = performance.now();
      }
    }
  }, []);

  const input = useBlinkInput(settings.timing, () => {}, onFrame);
  const { status, faceFound, start } = input;

  useEffect(() => {
    faceRef.current = faceFound;
    statusRef.current = status;
  });

  // Step timer: updates the countdown and decides when a step is over.
  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    const s = STEPS[step];
    const id = setInterval(() => {
      if (statusRef.current !== "running") {
        clearInterval(id);
        return fail("The camera stopped, so calibration was cancelled. Allow camera access and start again.");
      }
      const now = performance.now();
      const elapsed = (now - stepStart.current) / 1000;
      setSecondsLeft(Math.max(0, Math.ceil(s.limit - elapsed)));
      setReady(elapsed > (s.kind === "short" || s.kind === "long" ? SETTLE_S : 0));
      const over = elapsed >= s.limit || (doneAt.current !== null && now - doneAt.current > 1200);
      if (!over) return;
      clearInterval(id);

      if (s.kind === "open" && openSamples.current.length < 30) {
        return fail("I couldn't see your face during the first step. Move closer, face the camera, add light on your face, then try again.");
      }
      if (s.kind === "closed") {
        if (closedSamples.current.length < 15 || mean(closedSamples.current) - mean(openSamples.current) < 0.12) {
          return fail("I couldn't tell the difference between your eyes open and closed. Face the camera in good light, close your eyes fully for the whole step, then try again.");
        }
        threshold.current = (mean(openSamples.current) + mean(closedSamples.current)) / 2;
        setLiveThreshold(threshold.current);
      }
      if (step + 1 >= STEPS.length) finish();
      else beginStep(step + 1);
    }, 100);
    return () => clearInterval(id);
  }, [step, finish, fail]);

  const startCalibration = async () => {
    openSamples.current = [];
    closedSamples.current = [];
    shorts.current = [];
    longs.current = [];
    threshold.current = DEFAULT_TIMING.threshold;
    setResult(null);
    setFailure("");
    if (status === "running" || (await start())) beginStep(0);
    else setFailure("The camera is not available. Click the camera icon in the browser address bar, choose Allow, then press Start again.");
  };

  const current = step >= 0 && step < STEPS.length ? STEPS[step] : null;
  const shownGroup = step < 0 ? -1 : step >= STEPS.length ? GROUPS.length : STEPS[step].group;
  const isBlinkStep = current?.kind === "short" || current?.kind === "long";

  return (
    <div>
      <PageTitle
        title="Calibration"
        subtitle="About one minute. It learns how fast you blink. Sit about an arm's length from the screen, face the camera, and keep your face well lit."
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <Sidebar tracker={input} score={input.score} closedFor={input.closedFor} timing={{ ...settings.timing, threshold: step >= 2 ? liveThreshold : settings.timing.threshold }} />
        </aside>
        <div className="space-y-6">
          <ol className="grid gap-3 sm:grid-cols-4" aria-label="Calibration steps">
            {GROUPS.map((g, i) => (
              <li key={g} className={`rounded-control border p-3 ${i === shownGroup ? "border-inverse bg-surface-3" : i < shownGroup ? "border-ok bg-ok-tint" : "border-line bg-surface"}`}>
                <span className={`grid size-6 place-items-center rounded-pill text-xs font-bold ${i < shownGroup ? "bg-ok text-on-status" : i === shownGroup ? "bg-inverse text-on-inverse" : "bg-surface-2 text-muted"}`}>
                  {i < shownGroup ? "✓" : i + 1}
                </span>
                <p className="mt-1.5 text-base font-bold leading-tight">{g}</p>
              </li>
            ))}
          </ol>

          <Card className="space-y-5">
            {step === -1 && (
              <>
                <h2 className="text-2xl font-bold">Ready?</h2>
                <ol className="list-decimal space-y-1.5 pl-6 text-lg text-muted">
                  <li><b className="text-text">Eyes open</b> and <b className="text-text">eyes closed</b> (a few seconds each).</li>
                  <li><b className="text-text">3 short blinks</b>, then separately <b className="text-text">3 long blinks</b>.</li>
                </ol>
                {failure && <p className="rounded-control border border-danger bg-danger-tint p-4 text-lg font-semibold text-danger" role="alert">{failure}</p>}
                <Button variant="primary" size="lg" onClick={startCalibration} disabled={status === "loading"}>
                  {status === "loading" ? "Starting camera…" : failure ? "Try again" : "Start calibration"}
                </Button>
              </>
            )}

            {current && (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Step {current.group + 1} of 4 · {current.title}</p>
                <p className="text-4xl font-bold leading-tight" aria-live="polite">{ready || !isBlinkStep ? current.text : "Get ready…"}</p>
                <div className="h-3 overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
                  <div
                    className="motion-progress h-full rounded-pill bg-inverse"
                    style={{ transform: `scaleX(${Math.min(1, Math.max(0, 1 - secondsLeft / current.limit))})`, transition: "transform var(--duration-slow) linear" }}
                  />
                </div>
                <p className="text-2xl font-semibold text-muted">
                  {secondsLeft} s left
                  {isBlinkStep && <> · recorded: <b className="text-text">{recorded} / {TARGET}</b></>}
                </p>
                {hint && <p className="text-xl font-semibold text-warn" role="status">{hint}</p>}
              </>
            )}

            {step >= STEPS.length && result && (
              <>
                <h2 className="text-3xl font-bold text-ok">✓ Calibration saved</h2>
                <dl className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Eye-closed threshold", result.timing.threshold.toFixed(2)],
                    ["Dot / dash boundary", `${result.timing.dotMax.toFixed(1)} s`],
                    ["SOS after", `${result.timing.dashMax.toFixed(1)} s`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-control bg-surface-2 p-4">
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="text-2xl font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                {(result.shorts < TARGET || result.longs < TARGET) && (
                  <p className="rounded-control border border-warn bg-warn-tint p-4 text-lg">
                    Only {result.shorts} short and {result.longs} long blinks were recorded, so some default timing is used. Run the calibration again for a better fit.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" size="lg" onClick={() => go("easy")}>Try Easy mode</Button>
                  <Button size="lg" onClick={() => go("talk")}>Try Morse mode</Button>
                  <Button size="lg" onClick={startCalibration}>Run again</Button>
                </div>
              </>
            )}

            {input.error && !failure && <p className="text-lg text-danger" role="alert">{input.error}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
