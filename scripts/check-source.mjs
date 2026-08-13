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

for (const path of ["V2Screen.tsx", "V2Glass.tsx", "V2Backdrop.tsx", "V2Button.tsx", "tokens.ts"]) {
  await readFile(new URL(`../src/ui-v2/${path}`, import.meta.url));
}
const retiredUiImports = /@\/components\/(Screen|Surface|GlassPanel|NativeGlassLayer|AmbientBackground|AppButton|MoodPanel|PageHeader|SubpageHeader)|@\/features\/(ai|entries|redesign)/;
for (const path of sourceFiles) {
  const content = await readFile(path, "utf8");
  if (retiredUiImports.test(content)) throw new Error(`${relative(sourceRoot, path)} imports the retired UI layer`);
}

const rootLayout = await readFile(new URL("src/app/_layout.tsx", root), "utf8");
const pairGuardStart = rootLayout.indexOf('<Stack.Protected guard={isAuthenticated && pairReady}>');
const pairGuardEnd = rootLayout.indexOf("</Stack.Protected>", pairGuardStart);
if (pairGuardStart === -1 || pairGuardEnd === -1) {
  throw new Error("The authenticated pair route guard is missing");
}
const pairGuard = rootLayout.slice(pairGuardStart, pairGuardEnd);
const pairProtectedScreens = [
  "about",
  "account",
  "agreements",
  "ai",
  "appearance",
  "chat",
  "conflicts",
  "data-export",
  "memories",
  "notifications",
  "quiet",
  "search",
  "settings",
];
for (const screen of pairProtectedScreens) {
  if (!pairGuard.includes(`<Stack.Screen name="${screen}" />`)) {
    throw new Error(`${screen} must remain inside the authenticated pair route guard`);
  }
}

console.log(`Source foundation verified: ${sourceFiles.length} TypeScript files`);
