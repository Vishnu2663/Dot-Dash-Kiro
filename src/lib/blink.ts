export interface Timing {
  /** Blendshape score above which the eyes count as closed. */
  threshold: number;
  /** Closures shorter than this (s) are natural blinks and ignored. */
  naturalMax: number;
  /** Closures shorter than this (s) are dots; longer are dashes. */
  dotMax: number;
  /** Closing the eyes longer than this (s) fires SOS. */
  dashMax: number;
  /** Eyes open this long (s) after a symbol ends the letter. */
  letterGap: number;
  /** Extra open time (s) after a letter ends a word. */
  wordGap: number;
  /** Consecutive frames needed to accept a state change. */
  debounceFrames: number;
}

export const DEFAULT_TIMING: Timing = {
  threshold: 0.5,
  naturalMax: 0.4,
  dotMax: 1,
  dashMax: 3,
  letterGap: 1.5,
  wordGap: 3,
  debounceFrames: 3,
};

export type BlinkEvent =
  | { type: "symbol"; symbol: "." | "-" }
  | { type: "letter-end" }
  | { type: "word-end" }
  | { type: "sos" };

/** Turns a stream of eye-closure scores into dots, dashes and gaps. */
export class BlinkDetector {
  timing: Timing;
  private closed = false;
  private closedSince = 0;
  private openSince = 0;
  private pending: boolean | null = null;
  private pendingCount = 0;
  private sosFired = false;
  private hasSymbol = false;
  private letterDone = false;

  constructor(timing: Timing = DEFAULT_TIMING) {
    this.timing = timing;
  }

  /** @param score 0 (open) to 1 (closed). @param t time in seconds. */
  update(score: number, t: number): BlinkEvent[] {
    const events: BlinkEvent[] = [];
    const tm = this.timing;
    const isClosed = score > tm.threshold;

    if (isClosed !== this.closed) {
      if (this.pending === isClosed) this.pendingCount++;
      else {
        this.pending = isClosed;
        this.pendingCount = 1;
      }
      if (this.pendingCount >= tm.debounceFrames) {
        this.pending = null;
        this.pendingCount = 0;
        if (isClosed) {
          this.closed = true;
          this.closedSince = t;
          this.sosFired = false;
        } else {
          this.closed = false;
          this.openSince = t;
          const held = t - this.closedSince;
          if (!this.sosFired && held >= tm.naturalMax) {
            events.push({ type: "symbol", symbol: held < tm.dotMax ? "." : "-" });
            this.hasSymbol = true;
            this.letterDone = false;
          }
        }
      }
    } else {
      this.pending = null;
      this.pendingCount = 0;
    }

    if (this.closed) {
      if (!this.sosFired && t - this.closedSince > tm.dashMax) {
        this.sosFired = true;
        events.push({ type: "sos" });
      }
    } else {
      const open = t - this.openSince;
      if (this.hasSymbol && open >= tm.letterGap) {
        this.hasSymbol = false;
        this.letterDone = true;
        events.push({ type: "letter-end" });
      } else if (this.letterDone && open >= tm.wordGap + tm.letterGap) {
        this.letterDone = false;
        events.push({ type: "word-end" });
      }
    }
    return events;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Derives personal timing from calibration samples. */
export function fitTiming(
  base: Timing,
  openMean: number,
  closedMean: number,
  shorts: number[],
  longs: number[],
): Timing {
  const threshold = clamp((openMean + closedMean) / 2, 0.15, 0.85);
  if (shorts.length < 1 || longs.length < 1) return { ...base, threshold };
  const s = mean(shorts);
  const l = mean(longs);
  if (l <= s + 0.2) return { ...base, threshold };
  const boundary = (s + l) / 2;
  return {
    ...base,
    threshold,
    naturalMax: clamp(s * 0.5, 0.2, 0.4),
    dotMax: boundary,
    dashMax: Math.min(3, Math.max(l * 1.5, boundary + 0.5)),
  };
}
