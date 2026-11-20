import { MORSE, DELETE_CODE, SPEAK_CODE, pretty } from "../lib/morse";
import { QUICK_PHRASES, candidateQuickPhrases } from "../lib/phrases";

const tight = (code: string) => pretty(code, "");

/**
 * Live chart: highlights the letters and quick phrases the current partial code can still become.
 * Letters it can no longer become switch to the muted text colour (not opacity), so they still meet
 * contrast. Colour changes are instant: nothing moves while the patient blinks.
 */
export function MorseChart({ code }: { code: string }) {
  const entries = Object.entries(MORSE);
  const letters = entries.filter(([, v]) => /[A-Z]/.test(v));
  const digits = entries.filter(([, v]) => /\d/.test(v));
  const candidates = candidateQuickPhrases(code);

  const cell = ([c, ch]: [string, string]) => {
    const exact = code !== "" && c === code;
    const prefix = code !== "" && c.startsWith(code);
    return (
      <li
        key={ch}
        className={`flex items-center justify-between gap-2 rounded-chip border px-2 py-px ${exact ? "border-inverse bg-inverse text-on-inverse" : prefix ? "border-inverse bg-surface-3 text-text" : code !== "" ? "border-line bg-surface text-muted" : "border-line bg-surface text-text"}`}
      >
        <b className="text-lg leading-tight">{ch}</b>
        <span className="font-mono text-base font-bold tracking-wider">{tight(c)}</span>
      </li>
    );
  };

  return (
    <section
      id="morse-chart"
      tabIndex={-1}
      aria-label="Morse code chart"
      className="rounded-tile border border-line bg-surface p-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto"
    >
      <h2 className="text-lg font-bold">Morse chart</h2>
      <p className="mb-3 mt-1 text-sm text-muted">
        <b className="text-text">•</b> short blink · <b className="text-text">—</b> long blink
      </p>

      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide">Quick phrases</h3>
      <ul className="mb-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
        {QUICK_PHRASES.map((p) => {
          const live = candidates.some((c) => c.id === p.id);
          const exact = code !== "" && p.match(code);
          return (
            <li
              key={p.id}
              className={`rounded-chip border px-2 py-1 ${exact ? "border-inverse bg-inverse text-on-inverse" : live ? "border-inverse bg-surface-3 text-text" : code !== "" ? "border-line bg-surface text-muted" : "border-line bg-surface text-text"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <b className="text-base leading-tight">{p.label}</b>
                <span className="font-mono text-base font-bold tracking-wider">{tight(p.code)}{p.open ? "…" : ""}</span>
              </div>
              <div className={`text-xs ${exact ? "text-on-inverse-muted" : "text-muted"}`}>{p.how}</div>
            </li>
          );
        })}
      </ul>

      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide">Letters</h3>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-2">{letters.map(cell)}</ul>
      <ul className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-2">{digits.map(cell)}</ul>

      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-3 xl:grid-cols-1">
        <li className="flex items-center justify-between rounded-chip border border-line px-2.5 py-1.5">
          <span>Delete letter</span><span className="font-mono text-base font-bold tracking-wider">{tight(DELETE_CODE)}</span>
        </li>
        <li className="flex items-center justify-between rounded-chip border border-line px-2.5 py-1.5">
          <span>Speak</span><span className="font-mono text-base font-bold tracking-wider">{tight(SPEAK_CODE)}</span>
        </li>
        <li className="flex items-center justify-between rounded-chip border border-danger px-2.5 py-1.5 text-danger">
          <span>Alert</span><span className="font-bold">HELP</span>
        </li>
      </ul>
    </section>
  );
}
