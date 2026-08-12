import { describe, expect, it } from "vitest";
import { yearsLabel } from "../src/lib/reminders.js";

describe("yearsLabel", () => {
  it("uses год for 1, 21, 31 but not 11", () => {
    expect(yearsLabel(1)).toBe("год");
    expect(yearsLabel(21)).toBe("год");
    expect(yearsLabel(31)).toBe("год");
    expect(yearsLabel(11)).toBe("лет");
  });

  it("uses года for 2-4, 22-24 but not 12-14", () => {
    expect(yearsLabel(2)).toBe("года");
    expect(yearsLabel(3)).toBe("года");
    expect(yearsLabel(4)).toBe("года");
    expect(yearsLabel(22)).toBe("года");
    expect(yearsLabel(12)).toBe("лет");
    expect(yearsLabel(13)).toBe("лет");
    expect(yearsLabel(14)).toBe("лет");
  });

  it("uses лет for 5-20, 25-30, and 0", () => {
    expect(yearsLabel(5)).toBe("лет");
    expect(yearsLabel(10)).toBe("лет");
    expect(yearsLabel(20)).toBe("лет");
    expect(yearsLabel(25)).toBe("лет");
    expect(yearsLabel(0)).toBe("лет");
  });
});
