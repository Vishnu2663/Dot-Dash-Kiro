import { useCallback, useEffect, useRef, useState } from "react";
import { Coach, Card, Button, Notice } from "../components/ui";
import { Sidebar } from "../components/panels";
import type { BlinkEvent } from "../lib/blink";
import { ALERT_MESSAGES, sendAlert } from "../lib/api";
import { playCue } from "../lib/audio";
import { EASY_OPTIONS } from "../lib/phrases";
import type { Settings } from "../lib/settings";
import { speak } from "../lib/speech";
import { useBlinkInput } from "../lib/tracker";

/** Every option plus a final "Back to menu" tile. */
const TILES = [...EASY_OPTIONS.map((o) => ({ label: o.label, icon: o.icon })), { label: "Back to menu", icon: "↩" }];

export function Easy({ settings, onHome }: { settings: Settings; onHome: () => void }) {
  const [active, setActive] = useState(0);
  const [chosenText, setChosenText] = useState("");
  const [flash, setFlash] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    const id = setInterval(() => {
      activeRef.current = (activeRef.current + 1) % TILES.length;
      setActive(activeRef.current);
    }, settings.scanMs);
    return () => clearInterval(id);
  }, [settings.scanMs]);

  const choose = useCallback(
    (index: number) => {
      if (index === EASY_OPTIONS.length) return onHome();
      const opt = EASY_OPTIONS[index];
      setChosenText(opt.say);
      setFlash(index);
      setTimeout(() => setFlash((f) => (f === index ? null : f)), 900);
      playCue("select", settings.sound);
      speak(opt.say, settings.lang);
    },
    [onHome, settings.lang, settings.sound],
  );

  const raiseAlert = useCallback(async () => {
    playCue("alert", settings.sound);
    speak("I need help", settings.lang);
    setNotice({ text: "Sending alert…", ok: true });
    const r = await sendAlert("SOS");
    setNotice({ text: ALERT_MESSAGES[r], ok: r === "sent" || r === "cooldown" });
  }, [settings.lang, settings.sound]);

  const onEvent = useCallback(
    (e: BlinkEvent) => {
      if (e.type === "sos") void raiseAlert();
      else if (e.type === "symbol") choose(activeRef.current);
    },
    [choose, raiseAlert],
  );

  const input = useBlinkInput(settings.timing, onEvent);

  let coach = "Blink when the option you want is highlighted. It will be spoken aloud.";
  let tone: "info" | "warn" = "info";
  if (input.status !== "running") {
    coach = "Turn on the camera so Dot-Dash can see your eyes.";
    tone = "warn";
  } else if (!input.faceFound) {
    coach = "I can't see your face. Move closer, face the camera and add some light.";
    tone = "warn";
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Camera and blink gauge">
          <Sidebar tracker={input} score={input.score} closedFor={input.closedFor} timing={settings.timing}>
            <Card>
              <h2 className="text-lg font-bold">Emergency</h2>
              <p className="mt-2 text-base text-muted">Keep your eyes shut for 3 seconds to alert your caregiver.</p>
            </Card>
          </Sidebar>
        </aside>
        <div className="min-w-0 space-y-6">
          <Coach text={coach} tone={tone} />
          <Card className="flex min-h-28 flex-wrap items-center gap-4">
            <p className="min-w-0 break-words text-4xl font-bold sm:text-5xl" aria-live="polite">
              {chosenText
                ? <span key={chosenText} className="anim-enter inline-block">“{chosenText}”</span>
                : <span className="text-3xl font-semibold text-muted">Your choice appears here</span>}
            </p>
            {chosenText && (
              <Button className="ml-auto shrink-0" onClick={() => speak(chosenText, settings.lang)}>🔊 Again</Button>
            )}
          </Card>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Options. Blink while one is highlighted to choose it.">
            {TILES.map((t, i) => {
              const on = i === active || i === flash;
              return (
                <li key={t.label} className="relative">
                  {/*
                    The highlight ring scales and fades in on the newly active tile, so the highlight is
                    seen to move. The tile's own colours switch instantly, so text never loses contrast
                    part-way through a fade.
                  */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -inset-1.5 rounded-card border-4 border-inverse transition-[transform,opacity] duration-150 ease-standard ${on ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
                  />
                  <button
                    onClick={() => choose(i)}
                    aria-current={i === active ? "true" : undefined}
                    className={`relative flex min-h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-tile border-4 p-3 text-center ${on ? "border-inverse bg-inverse text-on-inverse" : "border-line-strong bg-surface-2 text-text hover:border-inverse"}`}
                  >
                    <span className="text-5xl grayscale" aria-hidden="true">{t.icon}</span>
                    <span className="text-2xl font-bold leading-tight xl:text-3xl">{t.label}</span>
                    {i === active && (
                      // Progress indicator: shows how long the highlight stays. Keeps moving under reduced motion.
                      <span
                        key={`${active}-${settings.scanMs}`}
                        className="motion-progress absolute inset-x-0 bottom-0 h-2 bg-on-inverse"
                        style={{ animation: `scan ${settings.scanMs}ms linear forwards` }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Last in the DOM, pinned to the bottom of the screen: tab order matches what you see. */}
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
