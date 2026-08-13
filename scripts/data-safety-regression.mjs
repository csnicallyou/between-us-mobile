import assert from "node:assert/strict";
import { dateTimestamp, formatDateSafe, normalizeAcceptedBy, safeDate } from "../src/domain/dataSafety.ts";

assert.equal(safeDate("2026-08-13")?.getDate(), 13);
assert.equal(safeDate("2026-08-13T10:30:00.000Z")?.toISOString(), "2026-08-13T10:30:00.000Z");
assert.equal(safeDate("2026-02-30"), null);
assert.equal(safeDate("not-a-date"), null);
assert.equal(formatDateSafe("not-a-date", { day: "numeric", month: "long" }), "Дата не указана");
assert.equal(dateTimestamp(undefined), Number.NEGATIVE_INFINITY);
assert.deepEqual(normalizeAcceptedBy(undefined, ["anton", "lisa"]), { anton: false, lisa: false });
assert.deepEqual(normalizeAcceptedBy({ anton: true, lisa: "yes" }, ["anton", "lisa"]), { anton: true, lisa: false });
assert.deepEqual(normalizeAcceptedBy({ anton: true }, ["demo-self"], (id) => id === "anton" ? "demo-self" : id), { "demo-self": true });

console.log("data safety regression checks passed");
