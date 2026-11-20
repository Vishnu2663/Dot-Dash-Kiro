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
    <div className="space-y-6">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <Sidebar tracker={input} score={input.score} closedFor={input.closedFor} timing={settings.timing}>
            <Card>
              <h2 className="text-lg font-bold">Emergency</h2>
              <p className="mt-2 text-base text-muted">Keep your eyes shut for 3 seconds to alert your caregiver.</p>
            </Card>
          </Sidebar>
        </aside>
        <div className="space-y-6">
          <Coach text={coach} tone={tone} />
          <Card className="flex min-h-28 items-center">
            <p className="text-4xl font-bold sm:text-5xl" aria-live="polite">
              {chosenText ? `“${chosenText}”` : <span className="text-3xl font-semibold text-muted">Your choice appears here</span>}
            </p>
            {chosenText && (
              <Button className="ml-auto shrink-0" onClick={() => speak(chosenText, settings.lang)}>🔊 Again</Button>
            )}
          </Card>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Options. Blink while one is highlighted to choose it.">
            {TILES.map((t, i) => (
              <li key={t.label}>
                <button
                  onClick={() => choose(i)}
                  className={`relative flex min-h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-4 p-3 text-center transition ${i === active || i === flash ? "scale-[1.03] border-white bg-white text-black" : "border-line bg-surface-2 hover:border-white"}`}
                >
                  <span className="text-5xl grayscale" aria-hidden="true">{t.icon}</span>
                  <span className="text-2xl font-bold leading-tight xl:text-3xl">{t.label}</span>
                  {i === active && (
                    <span
                      key={`${active}-${settings.scanMs}`}
                      className="absolute inset-x-0 bottom-0 h-2 bg-black/60"
                      style={{ animation: `scan ${settings.scanMs}ms linear forwards` }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
