import type { ReactNode } from "react";
import { Badge, Button, Card } from "../components/ui";
import type { Settings } from "../lib/settings";
import { motionReduced } from "../lib/motion";
import type { Page } from "../App";

const B = ({ children }: { children: ReactNode }) => <b className="text-text">{children}</b>;

function Step({ n, title, done, children, action }: { n: number; title: string; done?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="relative flex gap-4 sm:gap-5">
      <div className="flex flex-col items-center">
        <span className={`grid size-11 shrink-0 place-items-center rounded-pill text-xl font-bold ${done ? "bg-ok text-on-status" : "bg-inverse text-on-inverse"}`} aria-hidden="true">
          {done ? "✓" : n}
        </span>
        <span className="mt-2 w-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <div className="mb-6 flex-1 rounded-tile border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-bold">Step {n}: {title}</h3>
          {done && <Badge tone="ok">Done</Badge>}
        </div>
        <div className="mt-3 space-y-2 text-lg text-muted">{children}</div>
        {action && <div className="mt-4 flex flex-wrap gap-3">{action}</div>}
      </div>
    </li>
  );
}

function Fold({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-tile border border-line bg-surface p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-bold">
        {title}
        <span className="text-muted transition-transform duration-150 ease-standard group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <div className="mt-3 space-y-2 text-lg text-muted">{children}</div>
    </details>
  );
}

export function Home({ go, settings }: { go: (p: Page) => void; settings: Settings }) {
  const cameraOk = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const calibrated = settings.calibrated;

  return (
    <div className="space-y-12">
      <section className="rounded-card border border-line bg-gradient-to-br from-surface-2 to-bg p-6 sm:p-10">
        <div className="flex flex-wrap gap-2">
          <Badge tone="ok"><span aria-hidden="true" className="grayscale">🔒</span> Video never leaves this device</Badge>
          <Badge>Free · only needs a webcam</Badge>
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Talk with your eyes.</h1>
        <p className="mt-4 max-w-2xl text-xl text-muted">
          Spell messages with <B>eye blinks</B> as Morse code, or pick common needs in Easy mode with a single blink. Dot-Dash speaks for you and can alert a caregiver in an emergency.
        </p>
        {!cameraOk && (
          <p className="mt-4 rounded-control bg-danger-tint p-4 text-danger" role="alert">
            This browser can't use the camera. Open Dot-Dash in Chrome on localhost or HTTPS.
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" onClick={() => go(calibrated ? "easy" : "calibrate")}>{calibrated ? "Start talking" : "Start setup"}</Button>
          <Button size="lg" onClick={() => document.getElementById("setup")?.scrollIntoView({ behavior: motionReduced() ? "auto" : "smooth" })}>See the steps ↓</Button>
        </div>
      </section>

      <section aria-labelledby="setup">
        <h2 id="setup" className="mb-2 text-3xl font-bold">Set up, step by step</h2>
        <p className="mb-6 max-w-3xl text-lg text-muted">Do these once. A caregiver can help with steps 1 to 3. It takes about 5 minutes.</p>
        <ol>
          <Step n={1} title="Get ready">
            <ul className="list-disc space-y-1 pl-6">
              <li>Use <B>Google Chrome</B> on a laptop or tablet with a camera. Allow the camera when asked.</li>
              <li>Place the screen at eye level, <B>about an arm's length</B> (50–70 cm) from the face.</li>
              <li>Light should fall on the <B>face</B>, not come from behind. Avoid a bright window behind you.</li>
              <li>Sit comfortably and keep the head still. Only the eyes need to move.</li>
            </ul>
          </Step>
          <Step n={2} title="Calibrate (about 1 minute)" done={calibrated} action={<Button variant="primary" onClick={() => go("calibrate")}>{calibrated ? "Calibrate again" : "Start calibration"}</Button>}>
            <p>Dot-Dash learns how you blink. You will be guided through:</p>
            <ol className="list-decimal space-y-1 pl-6">
              <li>Eyes open, then eyes closed.</li>
              <li><B>3 short blinks</B> (about half a second).</li>
              <li><B>3 long blinks</B> (about 1.5 seconds), as a separate step.</li>
            </ol>
          </Step>
          <Step n={3} title="Set up caregiver alerts" done={!!settings.passcode} action={<Button onClick={() => go("settings")}>{settings.passcode ? "Review in Settings" : "Open Settings"}</Button>}>
            <p>A caregiver opens the Dot-Dash Telegram bot and presses <B>Start</B>, then enters the <B>alert passcode</B> in Settings and sends a test message.</p>
            <p>After that, keeping the eyes closed for 3 seconds, or spelling HELP, sends an alert to their phone. This step is optional but recommended.</p>
          </Step>
          <Step n={4} title="Start talking" action={<><Button variant="primary" onClick={() => go("easy")}>Easy mode</Button><Button onClick={() => go("talk")}>Morse mode</Button></>}>
            <p><B>Easy mode:</B> blink when Water, Pain, Toilet or another option is highlighted. <B>Morse mode:</B> spell with blinks, then blink the number of a suggested sentence.</p>
          </Step>
        </ol>
      </section>

      <section aria-labelledby="manual" className="space-y-3">
        <h2 id="manual" className="mb-2 text-3xl font-bold">User manual</h2>
        <Fold title="Easy mode: choose with one blink" open>
          <ol className="list-decimal space-y-1 pl-6">
            <li>A white highlight moves across the options one by one. The bar at the bottom of the option shows how long it stays.</li>
            <li><B>Blink once</B> (about half a second or longer) while the option you want is highlighted.</li>
            <li>It is spoken aloud and shown on screen. The last option, <B>Back to menu</B>, returns to Home.</li>
          </ol>
        </Fold>
        <Fold title="Morse mode: spell and pick a sentence">
          <ul className="list-disc space-y-1 pl-6">
            <li><B>Short blink</B> (about half a second) = dot •. <B>Long blink</B> (1 to 3 seconds) = dash —.</li>
            <li>Open your eyes and wait 1.5 seconds: the letter appears. Wait 3 seconds for a new word.</li>
            <li>The Morse chart on the left lights up the letters you can still make.</li>
            <li>After 2 letters, up to six sentences that <B>start with your letters</B> appear, each with a number.</li>
            <li><B>Blink the number</B> in Morse to choose that sentence, for example 2 is • • — — —. The tile shows its code. Nothing is chosen on its own.</li>
            <li>Delete a letter with • • — —. Speak the message with • — • —.</li>
            <li><B>Quick phrases</B> (top of the chart): <B>keep blinking short</B> (6 or more) = Water, <B>4 long blinks</B> = Toilet, <B>keep blinking long</B> (6 or more) = Pain. They are spoken at once.</li>
          </ul>
        </Fold>
        <Fold title="Emergency alert">
          <p>Keep your eyes <B>closed for 3 seconds</B>, or spell <B>HELP</B> in Morse. One alert goes to the caregiver's phone, and no more than one every 30 seconds.</p>
        </Fold>
        <Fold title="Not working? Quick fixes">
          <ul className="list-disc space-y-1 pl-6">
            <li><B>"No face found":</B> move closer, face the camera, add light on the face.</li>
            <li><B>Blinks missed or extra:</B> Settings → Blink sensitivity, or calibrate again.</li>
          </ul>
        </Fold>
        <div><Button onClick={() => go("guide")}>Open the full guide</Button></div>
      </section>

      <section aria-labelledby="modes">
        <h2 id="modes" className="mb-4 text-3xl font-bold">Choose how to communicate</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => go("easy")} className="group rounded-tile border-2 border-line-strong bg-surface p-6 text-left hover:border-inverse hover:bg-surface-2">
            <span className="text-4xl" aria-hidden="true">▦</span>
            <h3 className="mt-3 text-2xl font-bold">Easy mode</h3>
            <p className="mt-2 text-lg text-muted">A highlight moves across Water, Pain, Toilet, Turn me, Call nurse, Yes and No. Blink to choose. No Morse knowledge needed.</p>
            <p className="mt-4 font-semibold group-hover:underline">Open Easy mode →</p>
          </button>
          <button onClick={() => go("talk")} className="group rounded-tile border-2 border-line-strong bg-surface p-6 text-left hover:border-inverse hover:bg-surface-2">
            <span className="font-mono text-4xl font-bold" aria-hidden="true">• —</span>
            <h3 className="mt-3 text-2xl font-bold">Morse mode</h3>
            <p className="mt-2 text-lg text-muted">Spell anything with blinks. Full-sentence suggestions that match your letters appear after 2 letters; blink a number to choose one.</p>
            <p className="mt-4 font-semibold group-hover:underline">Open Morse mode →</p>
          </button>
        </div>
      </section>

      <Card>
        <h3 className="text-xl font-bold">For caregivers</h3>
        <p className="mt-2 text-base text-muted">Blink sensitivity, scanning speed, sounds and language are in Settings.</p>
        <Button className="mt-4" onClick={() => go("settings")}>Open Settings</Button>
      </Card>
    </div>
  );
}
