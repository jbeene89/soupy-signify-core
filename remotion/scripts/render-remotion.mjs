import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compositions = [
  { id: "spot-square", out: "/mnt/documents/soupy-teaser-1x1.mp4" },
  { id: "spot-vertical", out: "/mnt/documents/soupy-teaser-9x16.mp4" },
  { id: "spot-wide", out: "/mnt/documents/soupy-teaser-16x9.mp4" },
];

console.log("bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

for (const c of compositions) {
  console.log(`rendering ${c.id}…`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id: c.id,
    puppeteerInstance: browser,
  });
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: c.out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
  console.log(`  → ${c.out}`);
}

await browser.close({ silent: false });
console.log("done");
