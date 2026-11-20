import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TIMING } from "../src/lib/blink";
import { zoneFor } from "../src/components/panels";

const css = readFileSync("src/index.css", "utf8");
const theme = css.slice(css.indexOf("@theme"), css.indexOf("\n}\n", css.indexOf("@theme")));

/** Colour tokens from the @theme block, e.g. { bg: "#050507", ... }. */
const colors: Record<string, string> = Object.fromEntries(
  [...theme.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

// ---------- WCAG 2.x contrast ----------
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ["bg", "surface", "surface-2", "surface-3"];

/**
 * Every text colour / background pair the components use. AA for text is 4.5:1; large display text
 * is held to the same bar here, so nothing relies on the large-text exemption.
 */
const TEXT_PAIRS: [fg: string, bg: string, where: string][] = [
  ...SURFACES.map((b) => ["text", b, "body text"] as [string, string, string]),
  ...SURFACES.map((b) => ["muted", b, "secondary text, non-matching chart letters and tiles"] as [string, string, string]),
  ...SURFACES.map((b) => ["accent", b, "dot/dash feedback text, control codes"] as [string, string, string]),
  ...SURFACES.map((b) => ["danger", b, "errors, SOS, alert row"] as [string, string, string]),
  ...["bg", "surface", "surface-2"].map((b) => ["ok", b, "success text"] as [string, string, string]),
  ...["bg", "surface", "surface-2"].map((b) => ["warn", b, "warning text"] as [string, string, string]),
  ["text", "accent-tint", "text on accent tint"],
  ["text", "ok-tint", "text on ok tint"],
  ["text", "warn-tint", "Coach warning, calibration notes"],
  ["text", "danger-tint", "text on danger tint"],
  ["text", "accent-zone-dash", "selected text"],
  ["accent", "accent-tint", "accent text on accent tint"],
  ["ok", "ok-tint", "ok Badge, OPEN, YES button"],
  ["warn", "warn-tint", "warn Badge"],
  ["danger", "danger-tint", "danger Badge, NO button, alert box"],
  ["on-inverse", "inverse", "primary button, selected tile, active scan tile"],
  ["on-inverse-muted", "inverse", "hint text inside a selected chart cell"],
  ["on-status", "ok", "on solid ok"],
  ["on-status", "warn", "Coach warning icon"],
  ["on-status", "danger", "danger button, CLOSED badge"],
  ["on-status", "inverse", "Coach info icon"],
];

/** Non-text contrast (WCAG 1.4.11): 3:1 for component boundaries, focus and indicator marks. */
const UI_PAIRS: [fg: string, bg: string, where: string][] = [
  ...SURFACES.map((b) => ["line-strong", b, "interactive borders"] as [string, string, string]),
  ...SURFACES.map((b) => ["focus", b, "focus outline (the offset shows the page behind it)"] as [string, string, string]),
  ...SURFACES.map((b) => ["inverse", b, "Easy mode highlight ring, selected tile edge"] as [string, string, string]),
  ["inverse", "accent-zone-dot", "gauge tick on the dot zone"],
  ["inverse", "accent-zone-dash", "gauge tick on the dash zone"],
  ["inverse", "danger-tint", "gauge tick on the SOS zone"],
  ["on-inverse", "accent", "dark ring around ticks and edge marker, over the blue fill"],
  ["on-inverse", "danger", "dark ring over the SOS fill"],
  ["on-inverse", "ok", "dark ring around the eye-meter threshold, over the open-eyes fill"],
  ["accent", "accent-zone-dot", "gauge fill against the dot zone"],
  ["accent", "accent-zone-dash", "gauge fill against the dash zone"],
  ["accent", "surface-2", "gauge fill against the ignore zone"],
  ["danger", "danger-tint", "SOS fill against the SOS zone"],
  ["ok", "surface-2", "eye-meter fill"],
  ["danger", "surface-2", "eye-meter fill while closed"],
  ["inverse", "surface-2", "calibration progress bar"],
  ["on-inverse", "inverse", "Easy mode scan bar on the active tile"],
];

describe("design tokens", () => {
  it("defines every colour token as a six-digit hex value", () => {
    expect(Object.keys(colors).length).toBeGreaterThan(15);
    for (const [name, value] of Object.entries(colors)) expect(value, `--color-${name}`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("has no legacy aliases left", () => {
    for (const legacy of ["brand", "dot", "dash", "glow-1", "glow-2"]) expect(colors[legacy], legacy).toBeUndefined();
    expect(css).not.toMatch(/LEGACY|\.scan-bar|@utility glass|ease-spring/);
  });

  it("pins the type scale so nothing shrinks", () => {
    const sizes = { xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25, "2xl": 1.5, "3xl": 1.875, "4xl": 2.25, "5xl": 3, "6xl": 3.75 };
    for (const [k, rem] of Object.entries(sizes)) expect(theme, `--text-${k}`).toContain(`--text-${k}: ${rem}rem;`);
  });
});

describe("contrast (WCAG AA)", () => {
  it.each(TEXT_PAIRS)("text %s on %s ≥ 4.5:1 (%s)", (fg, bg) => {
    expect(colors[fg], fg).toBeDefined();
    expect(colors[bg], bg).toBeDefined();
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("UI %s on %s ≥ 3:1 (%s)", (fg, bg) => {
    expect(colors[fg], fg).toBeDefined();
    expect(colors[bg], bg).toBeDefined();
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
  });

  it("computes contrast correctly (white on black is 21:1)", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });
});

// ---------- source rules ----------
function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(p) ? [p] : [];
  });
}
const tsx = files("src", /\.tsx$/).map((p) => ({ p, src: readFileSync(p, "utf8") }));
const PALETTE = "white|black|neutral|gray|zinc|slate|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL = "bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|accent|divide|placeholder|decoration|caret";

describe("components use tokens only", () => {
  it.each(tsx)("$p: no hex, rgb() or Tailwind palette colours", ({ src }) => {
    expect(src.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
    expect(src.match(/\b(rgba?|hsla?|oklch)\(/g) ?? []).toEqual([]);
    expect(src.match(new RegExp(`\\b(${UTIL})-(${PALETTE})(-\\d+)?\\b`, "g")) ?? []).toEqual([]);
  });

  it.each(tsx)("$p: radii come from tokens", ({ src }) => {
    expect(src.match(/\brounded(-[tblr]{1,2})?-(none|sm|md|lg|xl|2xl|3xl|full)\b/g) ?? []).toEqual([]);
  });

  it.each(tsx)("$p: no partial opacity (text must use the muted token instead)", ({ src }) => {
    const bad = (src.match(/(?<![\w:-])opacity-\d+\b/g) ?? []).filter((c) => c !== "opacity-0" && c !== "opacity-100");
    expect(bad).toEqual([]);
  });
});

describe("motion rules", () => {
  it("keeps every motion duration token under 400 ms", () => {
    const tokens = [...css.matchAll(/--duration-([a-z]+):\s*(\d+)ms/g)];
    expect(tokens.length).toBeGreaterThanOrEqual(4);
    for (const [, name, ms] of tokens) expect(Number(ms), `--duration-${name}`).toBeLessThan(400);
    const step = Number(css.match(/--stagger-step:\s*(\d+)ms/)![1]);
    const base = Number(css.match(/--duration-base:\s*(\d+)ms/)![1]);
    // The longest tile sequence (6 tiles) must also finish under 400 ms.
    expect(5 * step + base).toBeLessThan(400);
  });

  it("animates only transform and opacity in keyframes", () => {
    const blocks = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
    expect(blocks.length).toBeGreaterThan(3);
    for (const [, name, body] of blocks) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const prop of props) expect(["opacity", "transform"], `@keyframes ${name}`).toContain(prop);
    }
  });

  it("has no looping animation and no backdrop blur", () => {
    expect(css).not.toMatch(/infinite|backdrop-filter/);
    for (const { p, src } of tsx) expect(src, p).not.toMatch(/\binfinite\b|\bbackdrop-(blur|filter)/);
  });

  it.each(tsx)("$p: no Tailwind animate-* utilities, no layout-property transitions", ({ src }) => {
    expect(src.match(/\banimate-(pulse|spin|ping|bounce)\b/g) ?? []).toEqual([]);
    // Transitions name their properties explicitly: transform and/or opacity only.
    // (A style-object key, `transition: "transform …"`, is not a class and is checked below.)
    expect(src.match(/(?<![\w-])transition(-(all|colors|shadow|\[width\]))?(?![\w\[-]|\s*:)/g) ?? []).toEqual([]);
    expect(src.match(/transition-\[([^\]]+)\]/g)?.filter((t) => !/^transition-\[(transform|opacity|transform,opacity)\]$/.test(t)) ?? []).toEqual([]);
    for (const m of src.matchAll(/transition:\s*"([^"]+)"/g)) expect(m[1]).toMatch(/^transform\b/);
    for (const m of src.matchAll(/\bduration-(\d+)\b/g)) expect(Number(m[1])).toBeLessThan(400);
  });

  it.each(tsx)("$p: anything driven by scaleX or translateX is marked as a progress indicator", ({ src }) => {
    // Inline transform styles are only used for progress indicators, which must carry motion-progress.
    const inline = [...src.matchAll(/className=\{?[`"]([^`"]*)[`"]\}?\s*\n?\s*style=\{\{[^}]*transform:\s*`(scaleX|translateX)/g)];
    for (const m of inline) expect(m[1]).toContain("motion-progress");
  });

  it("stops decorative motion under reduced motion, in both places, but exempts progress indicators", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*:not\(\.motion-progress\)/);
    expect(css).toMatch(/:root\[data-reduce-motion\] \*:not\(\.motion-progress\)/);
  });
});

describe("layout and keyboard rules", () => {
  it.each(tsx)("$p: no CSS order (tab order must match visual order)", ({ src }) => {
    expect(src.match(/(?<![\w-])order-(\d+|first|last|none)\b/g) ?? []).toEqual([]);
  });

  it("uses one focus style from the focus token, with an offset", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--color-focus\)[^}]*outline-offset:\s*3px/);
    for (const { p, src } of tsx) expect(src, p).not.toMatch(/focus:outline-none|focus-visible:outline-none/);
  });

  it("never uses a hash link inside the app (the hash is the page route)", () => {
    for (const { p, src } of tsx) {
      const hashLinks = [...src.matchAll(/href="#([^"]*)"/g)].map((m) => m[1]).filter((h) => h !== "main");
      expect(hashLinks, p).toEqual([]);
    }
  });
});

describe("blink gauge zones", () => {
  it("matches the blink timing boundaries", () => {
    const t = DEFAULT_TIMING;
    expect(zoneFor(0, t)).toBeNull();
    expect(zoneFor(t.naturalMax - 0.01, t)).toBe("ignored");
    expect(zoneFor(t.naturalMax, t)).toBe("dot");
    expect(zoneFor(t.dotMax - 0.01, t)).toBe("dot");
    expect(zoneFor(t.dotMax, t)).toBe("dash");
    expect(zoneFor(t.dashMax, t)).toBe("sos");
  });
});
