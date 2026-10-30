import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteBase, headingAnchor, heroFile, readWorkshop } from "./publish-lab.mjs";

const output = fileURLToPath(new URL("../.vitepress/dist/", import.meta.url));
const base = getSiteBase(process.env.PAGES_BASE_PATH);
const pages = await readWorkshop();
const [home, notFound, ...workshops] = await Promise.all(
  ["index.html", "404.html", ...pages.map((page) => page.outputFile.replace(/\.md$/, ".html"))]
    .map((file) => readFile(path.join(output, ...file.split("/")), "utf8")),
);
const files = await readdir(output, { recursive: true });
assert.deepEqual(
  files.filter((file) => file.endsWith(".html")).map((file) => file.split(path.sep).join("/")).sort(),
  ["404.html", "index.html", ...pages.map((page) => page.outputFile.replace(/\.md$/, ".html"))].sort(),
  "Only the landing page, canonical workshop pages, and standard 404 page may be published.",
);
for (const html of [home, ...workshops, notFound]) {
  assert.doesNotMatch(html, /(?:Exercise|Lab)00\.md|@lab\.|\+\+\+|Win11-Pro-Base|WWLM365E7|!instructions\[/i);
  assert.match(html.match(/<script\b[^>]*>/)?.[0] ?? "", /id="workshop-theme"/);
}
assert.match(home, /Start the workshop/);
assert.ok(home.includes(`href="${base}workshop"`), "The workshop link must use the deployment base path.");
assert.ok(home.includes(`src="${base}copilot.png"`), "The hero image must use the deployment base path.");
assert.doesNotMatch(home, /id="step-1-/);
assert.deepEqual(await readFile(path.join(output, "copilot.png")), await readFile(heroFile));

for (const [index, page] of pages.entries()) {
  const html = workshops[index];
  const heading = page.source.match(/^# (.+)$/m)[1].trim();
  assert.ok(html.includes(`id="${headingAnchor(heading)}"`), `Missing page heading: ${page.filename}`);
  const sidebar = html.match(/<nav\b[^>]*id="VPSidebarNav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(sidebar, `Missing left navigation on ${page.route}`);
  const sidebarLinks = [...sidebar.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(([, href]) => href);
  assert.deepEqual(
    sidebarLinks, pages.map((target) => `${base}${target.route.slice(1)}`),
    `Incorrect left navigation order or deployment path on ${page.route}`,
  );
  for (const [direction, target] of [["prev", pages[index - 1]], ["next", pages[index + 1]]]) {
    const link = html.match(new RegExp(`<a\\b[^>]*class="[^"]*\\bpager-link ${direction}\\b[^"]*"[^>]*>`))?.[0];
    if (target) {
      assert.ok(link?.includes(`href="${base}${target.route.slice(1)}"`), `Incorrect ${direction} link on ${page.route}`);
    } else {
      assert.equal(link, undefined, `Unexpected ${direction} link on ${page.route}`);
    }
  }
}

const screenshots = workshops.flatMap((html) => [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)]);
assert.ok(screenshots.length > 0, "The guide must include its screenshots.");
const images = [...home.matchAll(/<img\b[^>]*src="([^"]+)"/g), ...screenshots];
const assets = [home, ...workshops, notFound].flatMap((html) =>
  [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)],
);
for (const [, source] of [...images, ...assets]) {
  assert.ok(source.startsWith(base), `Asset URL must use the deployment base path: ${source}`);
  await access(path.join(output, ...decodeURIComponent(source.slice(base.length)).split("/")));
}
console.log(`Verified the landing page, ${pages.length} workshop pages, left sidebar and Next/Back navigation, theme bootstrap, ${images.length} image references, and asset paths.`);
