import type { Question } from "../lib/api";
import { codeFor, lookahead, pretty } from "../lib/morse";
import { matchQuickPhrase } from "../lib/phrases";
import { SOURCE_LABEL, type Suggestion } from "../lib/suggest";
import { Button } from "./ui";

/** The code being blinked right now and the message typed so far. */
export function Composer({ code, text }: { code: string; text: string }) {
  const { exact, more } = lookahead(code);
  const quick = matchQuickPhrase(code);
  return (
    <div>
      <div className="flex min-h-20 flex-wrap items-center gap-x-6 gap-y-2">
        <p className="font-mono text-6xl font-bold tracking-[.2em] text-white" aria-label="Current dots and dashes">
          {code ? pretty(code) : <span className="text-line">• — •</span>}
        </p>
        {code && (
          <p className="text-xl text-muted" aria-live="polite">
            {quick ? (
              <>Quick phrase: <b className="text-3xl text-text">{quick.label}</b> · wait 1.5 s to say it</>
            ) : exact ? (
              <>Letter so far: <b className="text-3xl text-text">{exact}</b></>
            ) : (
              <span className="text-danger">Not a letter yet</span>
            )}
            {more.length > 0 && <> · could become <b className="text-text">{more.slice(0, 8).join(" ")}</b></>}
          </p>
        )}
      </div>
      <p className="mt-2 min-h-28 break-words text-6xl font-bold leading-tight" aria-live="polite" aria-label="Your message">
        {text || <span className="text-4xl font-semibold text-muted">Blink to spell your message…</span>}
        <span className="ml-1 inline-block h-12 w-1.5 translate-y-1.5 animate-pulse bg-accent align-baseline" aria-hidden="true" />
      </p>
    </div>
  );
}

/** Numbered sentence tiles. Each shows the Morse code of its number. */
export function Suggestions({
  suggestions, loading, note, code, typed, onPick,
}: { suggestions: Suggestion[]; loading: boolean; note: string; code: string; typed: string; onPick: (s: string) => void }) {
  if (!suggestions.length) {
    return (
      <div className="rounded-xl border border-dashed border-line p-5 text-lg text-muted">
        <p>
          {loading
            ? "Finding sentences…"
            : typed.trim().length >= 2
              ? "No sentence starts with these letters yet. Keep spelling, or delete a letter."
              : "After you spell 2 letters, sentences that start with them appear here."}
        </p>
        <p className="mt-2 text-base" aria-live="polite">{note}</p>
      </div>
    );
  }
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Suggested sentences. Blink a number to choose one.">
        {suggestions.map((s, i) => {
          const n = String(i + 1);
          const numCode = codeFor(n) ?? "";
          const exact = code !== "" && code === numCode;
          const partial = code !== "" && numCode.startsWith(code) && !exact;
          const off = code !== "" && !numCode.startsWith(code);
          return (
            <li key={s.text}>
              <button
                onClick={() => onPick(s.text)}
                className={`anim-pop flex min-h-28 w-full items-center gap-4 rounded-2xl border-4 p-4 text-left transition ${exact ? "border-white bg-white text-black" : partial ? "border-white bg-surface-2" : "border-line bg-surface-2 hover:border-white"} ${off ? "opacity-40" : ""}`}
              >
                <span className="flex w-24 shrink-0 flex-col items-center rounded-xl border border-current/40 px-2 py-1.5 text-center">
                  <span className="text-4xl font-bold leading-none">{n}</span>
                  <span className="mt-1 font-mono text-base font-bold tracking-wider">{pretty(numCode, "")}</span>
                </span>
                <span className="flex min-w-0 flex-col items-start gap-2">
                  <span className="text-3xl font-bold leading-snug">{s.text}</span>
                  <span className="rounded-md border border-current/50 px-2 py-0.5 text-sm font-semibold">
                    <span className="sr-only">Source: </span>
                    {SOURCE_LABEL[s.source]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-base text-muted" aria-live="polite">
        <b className="text-white">To choose one, blink its number in Morse</b> (shown on each tile), then wait 1.5 s. Keep spelling to narrow the list.
        {loading && " · improving suggestions…"}
        {note && ` · ${note}`}
      </p>
    </div>
  );
}

/** Shown while a caregiver question is waiting for a blink answer. */
export function QuestionCard({
  question, onAnswer, onHide,
}: { question: Question | null; onAnswer: (a: "yes" | "no") => void; onHide: () => void }) {
  if (!question) return null;
  return (
    <section role="alert" aria-live="assertive" className="anim-slide rounded-3xl border-2 border-white bg-surface-2 p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Your caregiver asks</p>
      <p className="mt-2 text-4xl font-extrabold sm:text-5xl">{question.text}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button onClick={() => onAnswer("yes")} className="rounded-2xl border-2 border-ok bg-ok/15 p-5 text-left text-ok transition hover:bg-ok/25">
          <span className="block text-4xl font-extrabold">YES</span>
          <span className="mt-1 block text-xl">Blink <b>once, short</b> (•)</span>
        </button>
        <button onClick={() => onAnswer("no")} className="rounded-2xl border-2 border-danger bg-danger/15 p-5 text-left text-danger transition hover:bg-danger/25">
          <span className="block text-4xl font-extrabold">NO</span>
          <span className="mt-1 block text-xl">Blink <b>once, long</b> (—)</span>
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-base text-muted">After your blink, keep your eyes open for 1.5 seconds. Spelling is paused until you answer.</p>
        <Button variant="ghost" onClick={onHide}>Hide for now</Button>
      </div>
    </section>
  );
}
