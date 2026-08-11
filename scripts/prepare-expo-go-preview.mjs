import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [exportDirectoryArg, baseUrlArg] = process.argv.slice(2);

if (!exportDirectoryArg || !baseUrlArg) {
  throw new Error("Usage: node scripts/prepare-expo-go-preview.mjs <export-directory> <base-url>");
}

const exportDirectory = path.resolve(exportDirectoryArg);
const baseUrl = baseUrlArg.replace(/\/$/, "");
const metadata = JSON.parse(await readFile(path.join(exportDirectory, "metadata.json"), "utf8"));
const appConfig = JSON.parse(await readFile(path.resolve("app.json"), "utf8")).expo;
const packageJson = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
const expoVersionMatch = packageJson.dependencies?.expo?.match(/\d+/);

if (!expoVersionMatch) {
  throw new Error("Unable to determine the Expo SDK version from package.json");
}

const sdkVersion = `${expoVersionMatch[0]}.0.0`;
const iosMetadata = metadata.fileMetadata?.ios;

if (!iosMetadata?.bundle || !Array.isArray(iosMetadata.assets)) {
  throw new Error("The export does not contain an iOS bundle and asset metadata");
}

const contentTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  ttf: "font/ttf",
};

function digest(file) {
  return createHash("sha256").update(file).digest("base64url");
}

const previewAssetsDirectory = path.join(exportDirectory, "preview-assets");
await mkdir(previewAssetsDirectory, { recursive: true });

const uniqueAssets = new Map();
for (const asset of iosMetadata.assets) {
  const sourcePath = path.join(exportDirectory, asset.path);
  const key = path.basename(asset.path);
  const extension = asset.ext.toLowerCase();
  const outputName = `${key}.${extension}`;

  if (!uniqueAssets.has(outputName)) {
    const file = await readFile(sourcePath);
    await copyFile(sourcePath, path.join(previewAssetsDirectory, outputName));
    uniqueAssets.set(outputName, {
      contentType: contentTypes[extension] ?? "application/octet-stream",
      fileExtension: `.${extension}`,
      hash: digest(file),
      key,
      url: `${baseUrl}/preview-assets/${outputName}`,
    });
  }
}

const bundlePath = path.join(exportDirectory, iosMetadata.bundle);
const bundle = await readFile(bundlePath);
const manifest = {
  id: randomUUID(),
  createdAt: new Date().toISOString(),
  runtimeVersion: `exposdk:${sdkVersion}`,
  launchAsset: {
    contentType: "application/javascript",
    hash: digest(bundle),
    key: path.basename(iosMetadata.bundle),
    url: `${baseUrl}/${iosMetadata.bundle.replaceAll("\\", "/")}`,
  },
  assets: [...uniqueAssets.values()],
  metadata: {},
  extra: {
    expoClient: {
      ...appConfig,
      sdkVersion,
      platforms: ["ios", "android", "web"],
    },
    scopeKey: "@anonymous/between-us-mobile-static-preview",
  },
};

const headers = `
/manifest.json
  Content-Type: application/expo+json
  Expo-Protocol-Version: 0
  Expo-SFV-Version: 0
  Cache-Control: private, max-age=0

/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
`;

await writeFile(path.join(exportDirectory, "manifest.json"), JSON.stringify(manifest), "utf8");
await writeFile(path.join(exportDirectory, "_headers"), headers.trimStart(), "utf8");

console.log(`Prepared Expo Go preview with ${manifest.assets.length} assets at ${baseUrl}`);
