import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultRoom, editRoom, undoRoom, redoRoom, themes } from "./room";
test("room edits remain a draft and undo/redo restores complete design", () => {
  const saved = { ...defaultRoom };
  const initial = { past: [], present: saved, future: [] };
  const edit = editRoom(initial, {
    ...saved,
    theme: 4,
    sofa: "#abc",
    material: "satin",
  });
  assert.equal(saved.theme, 0);
  assert.deepEqual(undoRoom(edit).present, saved);
  assert.deepEqual(redoRoom(undoRoom(edit)).present, edit.present);
});
test("new edit after undo discards redo without mutating saved design", () => {
  const initial = { past: [], present: { ...defaultRoom }, future: [] };
  const h = undoRoom(editRoom(initial, { ...defaultRoom, theme: 5 }));
  const next = editRoom(h, { ...h.present, decor: "heart" });
  assert.equal(next.future.length, 0);
  assert.equal(next.present.decor, "heart");
  assert.equal(themes.length, 6);
  assert.deepEqual(undoRoom(initial), initial);
});
