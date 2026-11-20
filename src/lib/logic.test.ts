import { describe, expect, it } from "vitest";
import { BlinkDetector, DEFAULT_TIMING, fitTiming, type BlinkEvent } from "./blink";
import { MORSE, applyDecoded, decode, endsWithHelp, lookahead } from "./morse";
import { QUICK_PHRASES, matchQuickPhrase, mergeSuggestions, startsWithLetters } from "./phrases";

/** Feeds a closure of `heldS` seconds then `openS` seconds of open eyes at 30 fps. */
function run(d: BlinkDetector, start: number, heldS: number, openS: number): { events: BlinkEvent[]; end: number } {
  const events: BlinkEvent[] = [];
  let t = start;
  const dt = 1 / 30;
  for (let i = 0; i < Math.round(heldS * 30); i++, t += dt) events.push(...d.update(0.9, t));
  for (let i = 0; i < Math.round(openS * 30); i++, t += dt) events.push(...d.update(0.05, t));
  return { events, end: t };
}
const types = (e: BlinkEvent[]) => e.map((x) => (x.type === "symbol" ? x.symbol : x.type));

describe("BlinkDetector", () => {
  it("ignores natural blinks under 0.4 s", () => {
    expect(types(run(new BlinkDetector(), 0, 0.2, 1).events)).toEqual([]);
  });
  it("emits a dot for a 0.6 s closure", () => {
    expect(types(run(new BlinkDetector(), 0, 0.6, 0.5).events)).toEqual(["."]);
  });
  it("emits a dash for a 1.6 s closure", () => {
    expect(types(run(new BlinkDetector(), 0, 1.6, 0.5).events)).toEqual(["-"]);
  });
  it("ends the letter after 1.5 s open and the word after 3 s more", () => {
    expect(types(run(new BlinkDetector(), 0, 0.6, 2).events)).toEqual([".", "letter-end"]);
    expect(types(run(new BlinkDetector(), 0, 0.6, 5).events)).toEqual([".", "letter-end", "word-end"]);
  });
  it("fires SOS once after 3 s closed and does not add a symbol on open", () => {
    expect(types(run(new BlinkDetector(), 0, 3.5, 0.5).events)).toEqual(["sos"]);
  });
  it("needs debounceFrames consecutive frames to accept a change", () => {
    const d = new BlinkDetector();
    const out: BlinkEvent[] = [];
    out.push(...d.update(0.9, 0), ...d.update(0.05, 0.03), ...d.update(0.9, 0.06), ...d.update(0.05, 0.09));
    expect(out).toEqual([]);
  });
});

describe("fitTiming", () => {
  it("places the threshold midway between open and closed", () => {
    const t = fitTiming(DEFAULT_TIMING, 0.1, 0.9, [0.5, 0.5, 0.5], [1.5, 1.5, 1.5]);
    expect(t.threshold).toBeCloseTo(0.5);
    expect(t.dotMax).toBeCloseTo(1);
    expect(t.dashMax).toBeLessThanOrEqual(3);
  });
  it("keeps default blink timing when short and long are indistinguishable", () => {
    const t = fitTiming(DEFAULT_TIMING, 0.1, 0.9, [0.6, 0.6], [0.7, 0.7]);
    expect(t.dotMax).toBe(DEFAULT_TIMING.dotMax);
  });
  it("clamps the threshold", () => {
    expect(fitTiming(DEFAULT_TIMING, 0, 0.1, [], []).threshold).toBe(0.15);
  });
});

describe("Morse", () => {
  it("decodes letters, digits, delete and send", () => {
    expect(decode(".-")).toEqual({ kind: "char", value: "A" });
    expect(decode(".----")).toEqual({ kind: "char", value: "1" });
    expect(decode("..--").kind).toBe("delete");
    expect(decode(".-.-").kind).toBe("send");
    expect(decode("........").kind).toBe("unknown");
  });
  it("applies decoded input to text", () => {
    expect(applyDecoded("HE", { kind: "char", value: "L" })).toBe("HEL");
    expect(applyDecoded("HEL", { kind: "delete" })).toBe("HE");
  });
  it("detects HELP at the end of a word", () => {
    expect(endsWithHelp("I NEED HELP")).toBe(true);
    expect(endsWithHelp("HELPFUL")).toBe(false);
  });
  it("shows what a partial code could become", () => {
    const r = lookahead(".-");
    expect(r.exact).toBe("A");
    expect(r.more).toContain("R");
  });
  it("has 36 unique symbols", () => {
    expect(new Set(Object.values(MORSE)).size).toBe(36);
  });
});

describe("quick phrases", () => {
  it("never collide with a letter or a control code", () => {
    for (const p of QUICK_PHRASES) {
      expect(MORSE[p.code]).toBeUndefined();
      expect(["..--", ".-.-"]).not.toContain(p.code);
    }
  });
  it("matches open-ended patterns", () => {
    expect(matchQuickPhrase("........")?.id).toBe("water");
    expect(matchQuickPhrase("-------")?.id).toBe("pain");
    expect(matchQuickPhrase("----")?.id).toBe("toilet");
    expect(matchQuickPhrase("....")).toBeNull(); // that is the letter H
  });
});

describe("suggestions", () => {
  it("only matches sentences that start with the typed letters", () => {
    expect(startsWithLetters("IWA", "I want to sleep")).toBe(true);
    expect(startsWithLetters("I WA", "I want to sleep")).toBe(true);
    expect(startsWithLetters("I WA", "I am thirsty")).toBe(false);
  });
  it("drops remote suggestions that do not match and removes duplicates", () => {
    const out = mergeSuggestions("PL", ["Please call the nurse.", "Hello there", "please call the nurse."], 6);
    expect(out.every((s) => startsWithLetters("PL", s))).toBe(true);
    expect(out.filter((s) => s.toLowerCase() === "please call the nurse.")).toHaveLength(1);
  });
});
