import { Button, Card, PageTitle } from "../components/ui";
import { MORSE, DELETE_CODE, SPEAK_CODE, pretty } from "../lib/morse";
import { QUICK_PHRASES } from "../lib/phrases";
import type { Page } from "../App";

const ZONES = [
  ["Under 0.4 s", "Ignored", "A natural blink. Nothing happens.", "bg-surface-2"],
  ["0.4 – 1 s", "Dot  •", "A short, deliberate blink.", "bg-dot/60"],
  ["1 – 3 s", "Dash  —", "Hold your eyes closed a little longer.", "bg-dash/60"],
  ["Over 3 s", "SOS", "Sends an alert to your caregiver.", "bg-danger/60"],
];

function CheatSheet() {
  const all = Object.entries(MORSE);
  const row = ([code, ch]: [string, string]) => (
    <li key={ch} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
      <b className="text-xl">{ch}</b>
      <span className="font-mono text-lg tracking-widest text-brand">{pretty(code)}</span>
    </li>
  );
  return (
    <Card>
      <details open>
        <summary className="cursor-pointer text-xl font-bold">Morse cheat sheet</summary>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{all.filter(([, v]) => /[A-Z]/.test(v)).map(row)}</ul>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{all.filter(([, v]) => /\d/.test(v)).map(row)}</ul>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <li className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><b>Delete last letter</b><span className="font-mono text-lg tracking-widest text-accent">{pretty(DELETE_CODE)}</span></li>
          <li className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><b>Speak the sentence</b><span className="font-mono text-lg tracking-widest text-accent">{pretty(SPEAK_CODE)}</span></li>
        </ul>
      </details>
    </Card>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <b className="text-text">{children}</b>;

export function Guide({ go }: { go: (p: Page) => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageTitle title="How Dot-Dash works" subtitle="Everything you need to know in about two minutes." />

      <Card>
        <h2 className="text-2xl font-bold">1. Get ready</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-lg text-muted">
          <li>Use <B>Chrome</B> on a laptop or tablet. Allow the camera when asked.</li>
          <li>Sit about an arm's length from the screen, face the camera, and make sure your face is well lit (light in front, not behind).</li>
          <li>Glasses are fine. If blinks are missed in dim light, a caregiver can lower the sensitivity in Settings.</li>
          <li>Run <B>Calibration</B> once. It learns how fast you blink. Short and long blinks are measured as separate steps.</li>
        </ul>
        <Button className="mt-4" variant="primary" onClick={() => go("calibrate")}>Calibrate now</Button>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">2. How long to blink</h2>
        <p className="mt-2 text-lg text-muted">A blink is counted when you <B>open your eyes again</B>. The "Blink length" bar on screen shows what your blink will count as.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ZONES.map(([range, name, desc, color]) => (
            <li key={name} className="flex gap-4 rounded-xl border border-line p-4">
              <span className={`mt-1 h-10 w-3 shrink-0 rounded-full ${color}`} aria-hidden="true" />
              <div>
                <p className="text-sm text-muted">{range}</p>
                <p className="text-2xl font-bold">{name}</p>
                <p className="text-base text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">3. Spelling with Morse</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-lg text-muted">
          <li>Blink the dots and dashes for a letter, for example <B>• —</B> is <B>A</B>. The screen shows the letters it could become.</li>
          <li>Open your eyes and wait <B>1.5 seconds</B>. The letter appears.</li>
          <li>Wait <B>3 more seconds</B> to start a new word.</li>
          <li>Made a mistake? Blink <B>• • — —</B> to delete the last letter.</li>
          <li>Ready to speak? Blink <B>• — • —</B>, or press Speak.</li>
        </ol>
        <p className="mt-4 rounded-xl bg-surface-2 p-4 text-lg">
          <b>Tip:</b> a few common letters are quick: <b>E</b> = •, <b>T</b> = —, <b>I</b> = • •, <b>S</b> = • • •, <b>O</b> = — — —.
        </p>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">Quick phrases: one pattern, no spelling</h2>
        <p className="mt-2 text-lg text-muted">For urgent needs, blink one simple pattern and it is spoken straight away. They are listed at the top of the Morse chart.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {QUICK_PHRASES.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
              <span><b className="text-xl">{p.label}</b><span className="block text-sm text-muted">{p.how}</span></span>
              <span className="font-mono text-xl font-bold tracking-widest">{pretty(p.code, "")}{p.open ? "…" : ""}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-base text-muted">Two dots can't be used for a phrase because • • is the letter <B>I</B>. These patterns are never letters, so spelling is not affected.</p>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">4. Sentence suggestions</h2>
        <p className="mt-2 text-lg text-muted">
          After <B>2 letters</B>, up to six sentences appear. <B>Every one starts with the letters you spelled</B>, so "I WA" shows "I want…" and nothing else. Each sentence has a number.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-lg text-muted">
          <li>To choose one, <B>blink its number in Morse</B>, then open your eyes and wait 1.5 seconds. For example 1 is • — — — —, 2 is • • — — —, 3 is • • • — —.</li>
          <li>Each tile shows its code and lights up while you blink it, so you can see exactly which one you are about to pick.</li>
          <li>Nothing is ever chosen on its own. To narrow the list, keep spelling. To undo a letter, blink • • — —.</li>
          <li>If no sentence starts with your letters, the list says so. Delete a letter or keep spelling.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">5. Easy mode</h2>
        <p className="mt-2 text-lg text-muted">
          No Morse needed. A highlight moves across <B>Water, Pain, Toilet, Turn me, Call nurse, Yes and No</B>. <B>Blink once</B> while the option you want is highlighted and it is spoken aloud. You can slow the highlight down in Settings.
        </p>
      </Card>

      <Card className="border-danger/50">
        <h2 className="text-2xl font-bold text-danger">6. Emergency alert</h2>
        <p className="mt-2 text-lg text-muted">
          Keep your eyes <B>closed for 3 seconds</B>, or spell <B>HELP</B>. Dot-Dash sends one alert to your caregiver's phone (and no more than one every 30 seconds). A caregiver must set the alert passcode in Settings first.
        </p>
      </Card>

      <CheatSheet />

      <Card>
        <h2 className="text-2xl font-bold">Privacy</h2>
        <p className="mt-2 text-lg text-muted">
          Video is analysed inside your browser and is never uploaded or saved. Only the letters you spell are used to look up suggestions, and alerts contain just a short message.
        </p>
      </Card>
    </div>
  );
}
