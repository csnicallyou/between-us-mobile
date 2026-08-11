import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const required = [
  "package.json",
  "app.json",
  "eas.json",
  "tsconfig.json",
  "src/app/_layout.tsx",
  "src/app/(tabs)/_layout.tsx",
  "src/services/secureStorage.ts",
];

for (const path of required) await readFile(new URL(path, root));
for (const path of ["package.json", "app.json", "eas.json", "tsconfig.json"]) {
  JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}

const sourceRoot = new URL("../src", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const sourceFiles = (await files(sourceRoot)).filter((path) => /\.(ts|tsx)$/.test(path));
const secretPattern = /(sk-[a-z0-9]{20,}|BEGIN (RSA |EC )?PRIVATE KEY|ANTON_ACCESS_KEY\s*=|LISA_ACCESS_KEY\s*=)/i;
const emojiPattern = /[\p{Extended_Pictographic}]/u;

for (const path of sourceFiles) {
  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/).length;
  if (lines > 500) throw new Error(`${relative(sourceRoot, path)} exceeds 500 lines`);
  if (secretPattern.test(content)) throw new Error(`${relative(sourceRoot, path)} may contain a secret`);
  if (emojiPattern.test(content)) throw new Error(`${relative(sourceRoot, path)} contains an emoji`);
  if ((await stat(path)).size === 0) throw new Error(`${relative(sourceRoot, path)} is empty`);
}

const nativeGlassLayer = await readFile(new URL("../src/components/NativeGlassLayer.tsx", import.meta.url), "utf8");
if (!nativeGlassLayer.includes('from "expo-glass-effect"')) {
  throw new Error("NativeGlassLayer must use the UIKit-backed expo-glass-effect component");
}
if (!nativeGlassLayer.includes('variant = "clear"')) {
  throw new Error("NativeGlassLayer must default to clear Liquid Glass instead of an opaque material");
}
if (nativeGlassLayer.includes("@expo/ui/swift-ui")) {
  throw new Error("NativeGlassLayer must not wrap an empty SwiftUI shape");
}

console.log(`Source foundation verified: ${sourceFiles.length} TypeScript files`);
