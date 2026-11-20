import { describe, expect, it } from "vitest";
import { parseSuggestions } from "./predict";

describe("parseSuggestions", () => {
  it("reads a plain JSON array", () => {
    expect(parseSuggestions('["I want water.","I am cold."]', 6)).toEqual(["I want water.", "I am cold."]);
  });
  it("handles code fences and surrounding prose", () => {
    expect(parseSuggestions('Sure!\n```json\n["Yes."]\n```', 6)).toEqual(["Yes."]);
  });
  it("limits count and drops non-strings", () => {
    expect(parseSuggestions('["a",1,"b","c"]', 2)).toEqual(["a", "b"]);
  });
  it("returns [] for garbage", () => {
    expect(parseSuggestions("no json here", 6)).toEqual([]);
    expect(parseSuggestions("[oops", 6)).toEqual([]);
  });
});
