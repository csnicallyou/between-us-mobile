import { describe, expect, it } from "vitest";
import { isHourInQuietWindow } from "../src/lib/push.js";

describe("isHourInQuietWindow", () => {
  it("handles a same-day window", () => {
    expect(isHourInQuietWindow(10, 9, 17)).toBe(true);
    expect(isHourInQuietWindow(8, 9, 17)).toBe(false);
    expect(isHourInQuietWindow(17, 9, 17)).toBe(false);
  });

  it("handles a window that wraps past midnight", () => {
    expect(isHourInQuietWindow(23, 23, 7)).toBe(true);
    expect(isHourInQuietWindow(2, 23, 7)).toBe(true);
    expect(isHourInQuietWindow(7, 23, 7)).toBe(false);
    expect(isHourInQuietWindow(12, 23, 7)).toBe(false);
  });

  it("treats an equal start and end as no quiet window rather than 24h", () => {
    expect(isHourInQuietWindow(0, 5, 5)).toBe(false);
    expect(isHourInQuietWindow(5, 5, 5)).toBe(false);
    expect(isHourInQuietWindow(23, 5, 5)).toBe(false);
  });
});
