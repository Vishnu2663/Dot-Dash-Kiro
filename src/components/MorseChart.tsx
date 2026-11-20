import { MORSE, DELETE_CODE, SPEAK_CODE, pretty } from "../lib/morse";
import { QUICK_PHRASES, candidateQuickPhrases } from "../lib/phrases";

const tight = (code: string) => pretty(code, "");

/** Live chart: highlights the letters and quick phrases the current partial code can still become. */
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
        className={`flex items-center justify-between gap-2 rounded-md border px-2 py-px transition ${exact ? "border-white bg-white text-black" : prefix ? "border-white bg-surface-2" : "border-line bg-surface"} ${code !== "" && !prefix ? "opacity-30" : ""}`}
      >
        <b className="text-lg leading-tight">{ch}</b>
        <span className="font-mono text-base font-bold tracking-wider">{tight(c)}</span>
      </li>
    );
  };

  return (
    <section
      aria-label="Morse code chart"
      className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
    >
      <h2 className="text-lg font-bold">Morse chart</h2>
      <p className="mb-3 mt-1 text-sm text-muted">
        <b className="text-white">•</b> short blink · <b className="text-white">—</b> long blink
      </p>

      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide">Quick phrases</h3>
      <ul className="mb-4 space-y-1">
        {QUICK_PHRASES.map((p) => {
          const live = candidates.some((c) => c.id === p.id);
          const exact = code !== "" && p.match(code);
          return (
            <li
              key={p.id}
              className={`rounded-md border px-2 py-1 transition ${exact ? "border-white bg-white text-black" : live ? "border-white bg-surface-2" : "border-line bg-surface"} ${code !== "" && !live ? "opacity-30" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <b className="text-base leading-tight">{p.label}</b>
                <span className="font-mono text-base font-bold tracking-wider">{tight(p.code)}{p.open ? "…" : ""}</span>
              </div>
              <div className={`text-xs ${exact ? "text-black/70" : "text-muted"}`}>{p.how}</div>
            </li>
          );
        })}
      </ul>

      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide">Letters</h3>
      <ul className="grid grid-cols-2 gap-1">{letters.map(cell)}</ul>
      <ul className="mt-1 grid grid-cols-2 gap-1">{digits.map(cell)}</ul>

      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5">
          <span>Delete letter</span><span className="font-mono text-base font-bold tracking-wider">{tight(DELETE_CODE)}</span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5">
          <span>Speak</span><span className="font-mono text-base font-bold tracking-wider">{tight(SPEAK_CODE)}</span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-danger/60 px-2.5 py-1.5 text-danger">
          <span>Alert</span><span className="font-bold">HELP</span>
        </li>
      </ul>
    </section>
  );
}
