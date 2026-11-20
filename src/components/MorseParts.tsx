import { useRef, useState } from "react";
import type { Question } from "../lib/api";
import { codeFor, lookahead, pretty } from "../lib/morse";
import { matchQuickPhrase } from "../lib/phrases";
import { SOURCE_LABEL, type Suggestion } from "../lib/suggest";
import { Button } from "./ui";

/** How the message last changed: decides which part fades in. */
type Change = "none" | "append" | "delete" | "replace";

/**
 * Remembers the previous message so the Composer knows what changed. The result only changes when
 * the text changes, so the many re-renders per second during blink input never restart an animation.
 */
function useTextChange(text: string): { change: Change; generation: number } {
  const state = useRef({ text, change: "none" as Change, generation: 0 });
  const s = state.current;
  if (s.text !== text) {
    const append = text.length === s.text.length + 1 && text.startsWith(s.text);
    const del = text.length < s.text.length && s.text.startsWith(text);
    const change: Change = append ? "append" : del ? "delete" : "replace";
    state.current = { text, change, generation: change === "replace" ? s.generation + 1 : s.generation };
  }
  return { change: state.current.change, generation: state.current.generation };
}

/** The code being blinked right now and the message typed so far. */
export function Composer({ code, text }: { code: string; text: string }) {
  const { exact, more } = lookahead(code);
  const quick = matchQuickPhrase(code);
  const { change, generation } = useTextChange(text);
  const head = text.slice(0, -1);
  const last = text.slice(-1);

  return (
    <div>
      <div className="flex min-h-20 flex-wrap items-center gap-x-6 gap-y-2">
        {/* One span per symbol, keyed by position: only the newly recognised symbol scales in. */}
        <p className="flex min-w-0 flex-wrap items-center gap-x-4 font-mono text-6xl font-bold text-text" aria-label="Current dots and dashes">
          {code
            ? [...code].map((c, i) => (
                <span key={i} className="anim-symbol inline-block">{c === "." ? "•" : "—"}</span>
              ))
            : <span className="text-muted" aria-hidden="true">• — •</span>}
        </p>
        {code && (
          <p className="min-w-0 text-xl text-muted" aria-live="polite">
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
        {text ? (
          // A chosen sentence fades in as a whole; a new letter fades in on its own.
          <span key={`g${generation}`} className={generation > 0 && change === "replace" ? "anim-enter inline-block" : ""}>
            {head}
            <span key={`l${text.length}`} className={change === "append" ? "anim-enter inline-block whitespace-pre" : "whitespace-pre"}>{last}</span>
          </span>
        ) : (
          <span className="text-4xl font-semibold text-muted">Blink to spell your message…</span>
        )}
        {/* Static caret: a blinking caret could be mistaken for a blink cue. */}
        <span className="ml-1 inline-block h-12 w-1.5 translate-y-1.5 bg-text align-baseline" aria-hidden="true" />
      </p>
    </div>
  );
}

/** One suggestion tile. It animates only if it mounted while no code was being blinked. */
function SuggestionTile({
  suggestion, index, code, onPick, animateOnMount,
}: { suggestion: Suggestion; index: number; code: string; onPick: (s: string) => void; animateOnMount: boolean }) {
  // Decided once, at mount. Toggling the class later would restart the animation after every letter.
  const [animate] = useState(animateOnMount);
  const n = String(index + 1);
  const numCode = codeFor(n) ?? "";
  const exact = code !== "" && code === numCode;
  const partial = code !== "" && numCode.startsWith(code) && !exact;
  const off = code !== "" && !numCode.startsWith(code);
  const look = exact
    ? "border-inverse bg-inverse text-on-inverse"
    : partial
      ? "border-inverse bg-surface-3 text-text"
      : off
        ? "border-line bg-surface-2 text-muted"
        : "border-line-strong bg-surface-2 text-text hover:border-inverse";
  return (
    <li className={animate ? "anim-tile" : ""} style={animate ? ({ "--i": index } as React.CSSProperties) : undefined}>
      <button
        onClick={() => onPick(suggestion.text)}
        className={`flex min-h-28 w-full items-center gap-4 rounded-tile border-4 p-4 text-left ${look}`}
      >
        <span className="flex w-24 shrink-0 flex-col items-center rounded-control border-2 border-current px-2 py-1.5 text-center">
          <span className="text-4xl font-bold leading-none">{n}</span>
          <span className="mt-1 font-mono text-base font-bold tracking-wider">{pretty(numCode, "")}</span>
        </span>
        <span className="flex min-w-0 flex-col items-start gap-2">
          <span className="min-w-0 break-words text-3xl font-bold leading-snug">{suggestion.text}</span>
          <span className="rounded-chip border border-current px-2 py-0.5 text-sm font-semibold">
            <span className="sr-only">Source: </span>
            {SOURCE_LABEL[suggestion.source]}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Numbered sentence tiles. Each shows the Morse code of its number. */
export function Suggestions({
  suggestions, loading, note, code, typed, onPick,
}: { suggestions: Suggestion[]; loading: boolean; note: string; code: string; typed: string; onPick: (s: string) => void }) {
  if (!suggestions.length) {
    return (
      <div className="rounded-control border-2 border-dashed border-line-strong p-5 text-lg text-muted">
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
        {suggestions.map((s, i) => (
          <SuggestionTile key={s.text} suggestion={s} index={i} code={code} onPick={onPick} animateOnMount={code === ""} />
        ))}
      </ul>
      <p className="mt-4 text-base text-muted" aria-live="polite">
        <b className="text-text">To choose one, blink its number in Morse</b> (shown on each tile), then wait 1.5 s. Keep spelling to narrow the list.
        {loading && " · improving suggestions…"}
        {note && ` · ${note}`}
      </p>
    </div>
  );
}

/**
 * Shown while a caregiver question is waiting for a blink answer. It slides in at the top of the main
 * column. That column never holds the blink gauge, and on phones it comes after the gauge, so the
 * gauge is never covered or pushed down.
 */
export function QuestionCard({
  question, onAnswer, onHide,
}: { question: Question | null; onAnswer: (a: "yes" | "no") => void; onHide: () => void }) {
  if (!question) return null;
  return (
    <section key={question.id} role="alert" aria-live="assertive" className="anim-slide-in rounded-card border-2 border-inverse bg-surface-2 p-5 shadow-raised sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">Your caregiver asks</p>
      <p className="mt-2 break-words text-4xl font-extrabold sm:text-5xl">{question.text}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button onClick={() => onAnswer("yes")} className="rounded-tile border-4 border-ok bg-ok-tint p-5 text-left text-ok">
          <span className="block text-4xl font-extrabold">YES</span>
          <span className="mt-1 block text-xl">Blink <b>once, short</b> (•)</span>
        </button>
        <button onClick={() => onAnswer("no")} className="rounded-tile border-4 border-danger bg-danger-tint p-5 text-left text-danger">
          <span className="block text-4xl font-extrabold">NO</span>
          <span className="mt-1 block text-xl">Blink <b>once, long</b> (—)</span>
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-base text-muted">After your blink, keep your eyes open for 1.5 seconds. Spelling is paused until you answer.</p>
        <Button variant="ghost" onClick={onHide}>Hide for now</Button>
      </div>
    </section>
  );
}
