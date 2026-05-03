import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [, , buildOffId] = process.argv;

if (!buildOffId) {
  console.error("Usage: node scripts/publish-build-off.mjs <build-off-id>");
  process.exit(1);
}

const root = process.cwd();
const resultsDir = resolve(root, "results", buildOffId);
const publicDir = resolve(root, "public", "build-off");
const runFiles = (await readdir(resultsDir))
  .filter((name) => name.endsWith(".json"))
  .sort();
const latestFile = runFiles.at(-1);

if (!latestFile) {
  console.error(`No result JSON files found in ${resultsDir}`);
  process.exit(1);
}

const latestPath = join(resultsDir, latestFile);
const result = JSON.parse(await readFile(latestPath, "utf8"));
const published = {
  ...result,
  publishedAt: new Date().toISOString(),
  sourceResultPath: `results/${buildOffId}/${latestFile}`
};

await mkdir(publicDir, { recursive: true });
await writeFile(
  join(publicDir, `${buildOffId}.json`),
  `${JSON.stringify(published, null, 2)}\n`,
  "utf8"
);

const manifest = await buildCumulativeManifest(publicDir);
await writeFile(
  join(publicDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify({
    buildOffId,
    latest: `public/build-off/${buildOffId}.json`,
    runId: result.runId,
    sourceResultPath: published.sourceResultPath
  })
);

async function buildCumulativeManifest(buildOffDir) {
  const files = (await readdir(buildOffDir))
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .sort();
  const buildOffs = [];

  for (const file of files) {
    const id = file.replace(/\.json$/, "");
    const json = JSON.parse(await readFile(join(buildOffDir, file), "utf8"));

    buildOffs.push({
      id,
      latest: `build-off/${file}`,
      runId: json.runId ?? json.run_id,
      sourceResultPath: json.sourceResultPath ?? json.source_result_path
    });
  }

  return { buildOffs };
}
