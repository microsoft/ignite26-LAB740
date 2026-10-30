import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const sourceDirectory = fileURLToPath(
  new URL("../../instructions/", import.meta.url),
);
export const mediaDirectory = fileURLToPath(
  new URL("../../instructions/media/", import.meta.url),
);
export const generatedDirectory = fileURLToPath(
  new URL("../.vitepress/generated/", import.meta.url),
);
export const homeFile = fileURLToPath(new URL("../index.md", import.meta.url));
export const heroFile = fileURLToPath(new URL("../public/copilot.png", import.meta.url));

export async function readWorkshop(directory = sourceDirectory) {
  const filenames = (await readdir(directory))
    .filter((filename) => /^Exercise01-\d{2}\.md$/.test(filename)).sort();
  if (filenames.length < 3) {
    throw new Error("Exercise01 must include an introduction, at least one step, and troubleshooting.");
  }
  for (const [index, filename] of filenames.entries()) {
    const expected = `Exercise01-${String(index).padStart(2, "0")}.md`;
    if (filename !== expected) {
      throw new Error(`Expected ${expected} in the Exercise01 sequence, but found ${filename}.`);
    }
  }
  return Promise.all(filenames.map(async (filename, index) => {
    const source = await readFile(path.join(directory, filename), "utf8");
    const heading = source.match(/^# ([^\r\n]+)\r?\n/);
    if (!heading) {
      throw new Error(`${filename} must start with a level-one page heading.`);
    }
    const lastPage = index === filenames.length - 1;
    if (
      (lastPage && heading[1] !== "Troubleshooting") ||
      (index > 0 && !lastPage && !heading[1].startsWith(`Step ${index}: `))
    ) {
      throw new Error(`${filename} must match its numbered step or final Troubleshooting page.`);
    }
    const route = index === 0 ? "/workshop"
      : lastPage ? "/workshop/troubleshooting" : `/workshop/step-${index}`;
    return {
      filename,
      source,
      title: index === 0 ? "Workshop overview" : heading[1],
      route,
      outputFile: `${route.slice(1)}.md`,
    };
  }));
}

export function isWorkshopSource(file) {
  const relative = path.relative(sourceDirectory, path.resolve(file));
  return /^Exercise01-\d{2}\.md$/.test(relative);
}

export function headingAnchor(heading) {
  return heading.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

export function getSiteBase(basePath = "/ignite26-LAB740") {
  if (basePath !== "" && !/^\/(?!\/)/.test(basePath)) {
    throw new Error("PAGES_BASE_PATH must be empty or a path starting with a single slash.");
  }
  return `${basePath.replace(/\/+$/, "")}/`;
}

function publishPromptTable(table, newline) {
  const [header, separator, ...rows] = table.split(/\r?\n/);
  if (
    !/^\|[ \t]*Title[ \t]*\|[ \t]*Prompt[ \t]*\|[ \t]*$/i.test(header) ||
    !separator ||
    !/^\|[ \t]*:?-{3,}:?[ \t]*\|[ \t]*:?-{3,}:?[ \t]*\|[ \t]*$/.test(separator) ||
    !rows.some((row) => /^\|[ \t]*\+\+\+/.test(row))
  ) {
    return table;
  }
  return rows.map((row, index) => {
    const cells = row.match(
      /^\|[ \t]*\+\+\+((?:\\\||[^|])+?)\+\+\+[ \t]*\|[ \t]*\+\+((?:\\\||[^|])+?)\+\+[ \t]*\|[ \t]*$/,
    );
    if (!cells || !cells[1].trim() || !cells[2].trim()) {
      throw new Error(
        `Suggested prompt table row ${index + 1} must have a +++title+++ and ++prompt++.`,
      );
    }
    const title = cells[1].replace(/\\\|/g, "|");
    const prompt = cells[2].replace(/\\\|/g, "|");
    const codeFence = "`".repeat(
      Math.max(3, ...[...prompt.matchAll(/`+/g)].map(([run]) => run.length + 1)),
    );
    return [`## ${title}`, "", `${codeFence}text`, prompt, codeFence].join(newline);
  }).join(newline + newline);
}

export function publishMarkdown(source, imageDirectory = "./media") {
  const images = new Set();
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  let fence;
  let markdown = source.replace(/^\|[^\r\n]*\|[ \t]*(?:\r?\n\|[^\r\n]*\|[ \t]*)+|^.*$/gm, (block) => {
    const marker = block.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
    if (marker) {
      const [, delimiter, suffix] = marker;
      if (!fence) {
        fence = delimiter;
      } else if (
        delimiter[0] === fence[0] &&
        delimiter.length >= fence.length &&
        suffix.trim() === ""
      ) {
        fence = undefined;
      }
      return block;
    }
    if (!fence && block.startsWith("|")) {
      return publishPromptTable(block, newline);
    }
    return fence ? block : block
      .replace(/^===[ \t]*$/, "")
      .replace(/^([ \t]*\d+\.[ \t]+)\[ \][ \t]+/, "$1")
      .replace(
        /^([ \t]*>[ \t]*)\[!Hint\](?:[ \t]+(.*))?$/i,
        (_, quote, text) => `${quote}[!TIP]${text ? `${newline}${quote}${text}` : ""}`,
      )
      .replace(
        /^([ \t]*>[ \t]*)\[!note\][ \t]+(.+)$/,
        (_, quote, text) => `${quote}[!NOTE]${newline}${quote}${text}`,
      );
  });
  markdown = markdown.replace(
    /\+\+\+(https?:\/\/[^\s+]+)\+\+\+/g,
    (_, url) => `[${url}](${url})`,
  );
  markdown = markdown.replace(
    /the account you selected from the \[workshop account table in (?:Exercise|Lab) 00\]\((?:Exercise|Lab)00\.md(?:#[^)]+)?\)/g,
    "the account you are using",
  );
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => {
    const prefix = "../instructions/media/";
    if (!target.startsWith(prefix)) {
      throw new Error(`Screenshot must come from instructions/media: ${target}`);
    }
    const relative = target.slice(prefix.length);
    if (
      !relative ||
      relative.includes("\\") ||
      relative.split("/").some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new Error(`Invalid screenshot path: ${target}`);
    }
    images.add(relative);
    return `![${alt}](${imageDirectory}/${relative})`;
  });

  if (/(?:Exercise|Lab)00\.md|@lab\.|\+\+\+|!instructions\[/i.test(markdown)) {
    throw new Error(
      "Exercise01 contains a lab-only reference that needs a publishing transform. No site was generated.",
    );
  }
  return { markdown, images: [...images] };
}

export function publishWorkshopPage(pages, index) {
  const page = pages[index];
  const imageDirectory = page.outputFile.includes("/") ? "../media" : "./media";
  const { markdown, images } = publishMarkdown(page.source, imageDirectory);
  const link = (target) => target ? { text: target.title, link: target.route } : false;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    `prev: ${JSON.stringify(link(pages[index - 1]))}`,
    `next: ${JSON.stringify(link(pages[index + 1]))}`,
  ];
  if (index === 0) {
    const legacyLinks = Object.fromEntries(pages.slice(1).flatMap((target) =>
      [...publishMarkdown(target.source).markdown.matchAll(/^#{1,3} (.+)$/gm)]
        .map(([, heading]) => {
          const anchor = headingAnchor(heading);
          return [`#${anchor}`, `${target.route}#${anchor}`];
        }),
    ));
    frontmatter.push(`legacyLinks: ${JSON.stringify(legacyLinks)}`);
  }
  return {
    markdown: [...frontmatter, "---", "", markdown].join("\n"),
    images,
  };
}

async function writeAsset(destination, content) {
  await mkdir(path.dirname(destination), { recursive: true });
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (!existsSync(destination) || !(await readFile(destination)).equals(buffer)) {
    await writeFile(destination, buffer);
  }
}

export async function prepareSite({ clean = false } = {}) {
  const [pages, home, hero] = await Promise.all([
    readWorkshop(),
    readFile(homeFile, "utf8"),
    readFile(heroFile),
  ]);
  const published = pages.map((page, index) => publishWorkshopPage(pages, index));
  const images = [...new Set(published.flatMap((page) => page.images))];
  const screenshots = await Promise.all(
    images.map((image) => readFile(path.join(mediaDirectory, ...image.split("/")))),
  );

  if (clean) {
    await rm(generatedDirectory, { recursive: true, force: true });
  }
  await mkdir(generatedDirectory, { recursive: true });
  for (const [index, image] of images.entries()) {
    const destination = path.join(generatedDirectory, "media", ...image.split("/"));
    await writeAsset(destination, screenshots[index]);
  }
  await writeAsset(path.join(generatedDirectory, "public", "copilot.png"), hero);
  await writeAsset(path.join(generatedDirectory, "index.md"), home);
  for (const [index, page] of pages.entries()) {
    await writeAsset(
      path.join(generatedDirectory, ...page.outputFile.split("/")),
      published[index].markdown,
    );
  }
  const expected = new Set(["index.md", ...pages.map((page) => page.outputFile)]);
  for (const file of await readdir(generatedDirectory, { recursive: true })) {
    if (file.endsWith(".md") && !expected.has(file.split(path.sep).join("/"))) {
      await rm(path.join(generatedDirectory, file));
    }
  }
  await writeAsset(
    path.join(generatedDirectory, "navigation.json"),
    JSON.stringify([{
      text: "Exercise 01",
      items: pages.map((page) => ({ text: page.title, link: page.route })),
    }], null, 2) + "\n",
  );
  return images;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const images = await prepareSite({ clean: true });
  console.log(`Prepared the landing page, Copilot hero, workshop pages, and ${images.length} referenced screenshots.`);
}
