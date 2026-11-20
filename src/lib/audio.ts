let ctx: AudioContext | null = null;

function beep(freq: number, ms: number, delayMs = 0) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + ms / 1000 + 0.02);
  } catch {
    /* audio unavailable */
  }
}

export type Cue = "dot" | "dash" | "letter" | "select" | "alert";

export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled) return;
  switch (cue) {
    case "dot": return beep(700, 80);
    case "dash": return beep(450, 220);
    case "letter": return beep(950, 70);
    case "select": beep(600, 90); return beep(900, 140, 100);
    case "alert": beep(880, 180); beep(660, 180, 220); return beep(880, 180, 440);
  }
}
