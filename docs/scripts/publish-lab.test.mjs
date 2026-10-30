import assert from "node:assert/strict";
import { watch } from "node:fs";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout } from "node:timers/promises";
import {
  generatedDirectory, getSiteBase, heroFile, homeFile, isWorkshopSource,
  mediaDirectory, prepareSite, publishMarkdown,
  publishWorkshopPage, readWorkshop, sourceDirectory,
} from "./publish-lab.mjs";

async function readWorkshopSource() {
  return (await readWorkshop()).map((page) => page.source).join("\n\n");
}

const fixturePages = {
  "Exercise01-02.md": "# Troubleshooting\n",
  "Exercise01-00.md": "# Workshop overview\n",
  "Exercise01-01.md": "# Step 1: Example\n",
};

async function workshopFixture(t, files) {
  const directory = await mkdtemp(path.join(tmpdir(), "workshop-sources-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([filename, source]) =>
    writeFile(path.join(directory, filename), source),
  ));
  return directory;
}

test("discovers numbered pages in order without a Skillable manifest", async (t) => {
  const directory = await workshopFixture(t, {
    ...fixturePages,
    "Exercise00.md": "# Environment setup\n@lab.Variable(TAP)\n",
    "Exercise02-00.md": "# Another exercise\n",
    "Exercise01-notes.md": "Working notes.\n",
    "Exercise01-1.md": "# Not a two-digit page filename\n",
  });
  await assert.rejects(readFile(path.join(directory, "Exercise01.md")), { code: "ENOENT" });
  const pages = await readWorkshop(directory);
  assert.deepEqual(pages.map((page) => page.filename), [
    "Exercise01-00.md", "Exercise01-01.md", "Exercise01-02.md",
  ]);
  assert.deepEqual(pages.map((page) => page.route), [
    "/workshop", "/workshop/step-1", "/workshop/troubleshooting",
  ]);
});

test("does not read or follow an optional Skillable manifest", async (t) => {
  const directory = await workshopFixture(t, fixturePages);
  const expected = await readWorkshop(directory);
  for (const source of [
    "",
    "This file is not a valid include manifest.",
    "!INSTRUCTIONS[](https://example.com/Exercise00.md)",
  ]) {
    await writeFile(path.join(directory, "Exercise01.md"), source);
    assert.deepEqual(await readWorkshop(directory), expected);
  }
});

test("rejects missing introduction, numbering gaps, and too few workshop pages", async (t) => {
  for (const filenames of [
    [],
    ["Exercise01-00.md", "Exercise01-01.md"],
    ["Exercise01-01.md", "Exercise01-02.md", "Exercise01-03.md"],
    ["Exercise01-00.md", "Exercise01-02.md", "Exercise01-03.md"],
  ]) {
    const directory = await workshopFixture(t, Object.fromEntries(
      filenames.map((filename) => [filename, "# Example\n"]),
    ));
    await assert.rejects(readWorkshop(directory), /Exercise01/);
  }
});

test("requires page headings to match the discovered steps and final troubleshooting page", async (t) => {
  for (const [filename, source] of [
    ["Exercise01-00.md", "Missing a page heading.\n"],
    ["Exercise01-01.md", "# Step 2: Wrong number\n"],
    ["Exercise01-02.md", "# Step 2: Not troubleshooting\n"],
  ]) {
    const directory = await workshopFixture(t, { ...fixturePages, [filename]: source });
    await assert.rejects(readWorkshop(directory), /must start with|must match/);
  }
});

test("loads every canonical page in order without fetching external instructions", async () => {
  const pages = await readWorkshop();
  const filenames = (await readdir(sourceDirectory))
    .filter((filename) => /^Exercise01-\d{2}\.md$/.test(filename)).sort();
  assert.deepEqual(pages.map((page) => page.filename), filenames);
  assert.equal(pages[0].route, "/workshop");
  assert.equal(pages.at(-1).route, "/workshop/troubleshooting");
  for (const [index, page] of pages.slice(1, -1).entries()) {
    assert.match(page.source, new RegExp(`^# Step ${index + 1}: `));
    assert.equal(page.route, `/workshop/step-${index + 1}`);
  }
});

test("watches numbered pages, but not the optional manifest, setup, or generated content", async () => {
  for (const page of await readWorkshop()) {
    assert.ok(isWorkshopSource(path.join(sourceDirectory, page.filename)));
  }
  for (const filename of ["Exercise00.md", "Exercise01.md", "Exercise01-1.md", "Exercise01-01-Step.md", "Lab01.md"]) {
    assert.equal(isWorkshopSource(path.join(sourceDirectory, filename)), false);
  }
  assert.equal(isWorkshopSource(path.join(generatedDirectory, "workshop.md")), false);
});

test("gives every page explicit previous and next links with correct endpoints", async () => {
  const pages = await readWorkshop();
  for (const [index, page] of pages.entries()) {
    const { markdown } = publishWorkshopPage(pages, index);
    for (const [field, target] of [
      ["prev", pages[index - 1]], ["next", pages[index + 1]],
    ]) {
      const actual = JSON.parse(markdown.match(new RegExp(`^${field}: (.+)$`, "m"))[1]);
      assert.deepEqual(actual, target ? { text: target.title, link: target.route } : false);
    }
    const body = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, "");
    assert.equal(body, publishMarkdown(page.source, index === 0 ? "./media" : "../media").markdown);
    assert.equal([...body.matchAll(/^# /gm)].length, 1);
    assert.doesNotMatch(markdown, /(?:Exercise|Lab)00\.md|@lab\.|\+\+\+|!instructions\[/i);
  }
});

test("preserves old step, subsection, and suggested-prompt bookmarks", async () => {
  const pages = await readWorkshop();
  const { markdown } = publishWorkshopPage(pages, 0);
  const links = JSON.parse(markdown.match(/^legacyLinks: (.+)$/m)[1]);
  assert.equal(links["#step-6-add-suggested-prompts"], "/workshop/step-6#step-6-add-suggested-prompts");
  assert.equal(links["#choose-what-your-agent-can-read"], "/workshop/step-5#choose-what-your-agent-can-read");
  assert.equal(links["#the-morning-briefing"], "/workshop/step-6#the-morning-briefing");
  assert.equal(links["#troubleshooting"], "/workshop/troubleshooting#troubleshooting");
});

test("supports project paths and root hosting, including an empty deployment base path", () => {
  for (const [input, expected] of [
    [undefined, "/ignite26-LAB740/"],
    ["", "/"],
    ["/", "/"],
    ["/ignite26-LAB740", "/ignite26-LAB740/"],
    ["/ignite26-LAB740/", "/ignite26-LAB740/"],
    ["/workshop", "/workshop/"],
  ]) {
    assert.equal(getSiteBase(input), expected);
  }
});

test("rejects a domain or relative path as the deployment base path", () => {
  for (const input of ["https://example.com", "//example.com", "ignite26-LAB740"]) {
    assert.throws(() => getSiteBase(input), /PAGES_BASE_PATH/);
  }
});

test("converts the lab's Copilot link into a normal Markdown link", () => {
  const { markdown } = publishMarkdown("Open +++https://m365.cloud.microsoft/chat+++");
  assert.equal(markdown, "Open [https://m365.cloud.microsoft/chat](https://m365.cloud.microsoft/chat)");
});

test("removes current and legacy setup account-table dependencies", () => {
  for (const prefix of ["Exercise", "Lab"]) {
    const { markdown } = publishMarkdown(
      `Check the account you selected from the [workshop account table in ${prefix} 00](${prefix}00.md#choose-and-sign-in-with-a-workshop-account).`,
    );
    assert.equal(markdown, "Check the account you are using.");
  }
});

test("removes Skillable step checkboxes while preserving numbering, indentation, and line endings", () => {
  const source = [
    "1. [ ] First step.",
    "2. [ ] Second step.",
    "",
    "   Additional details.",
    "   1. [ ] Nested step.",
    "10. [ ] Last step, with [ ] in its text.",
    "Keep [ ] in ordinary text.",
  ].join("\r\n");
  const { markdown } = publishMarkdown(source);
  assert.equal(markdown, [
    "1. First step.",
    "2. Second step.",
    "",
    "   Additional details.",
    "   1. Nested step.",
    "10. Last step, with [ ] in its text.",
    "Keep [ ] in ordinary text.",
  ].join("\r\n"));
});

test("converts Skillable hints into website tips while preserving text, indentation, and line endings", () => {
  const text = "Use the code box's **Copy** button.";
  for (const newline of ["\n", "\r\n"]) {
    const expected = [
      "1. Copy the prompt.",
      "",
      "   > [!TIP]",
      `   > ${text}`,
    ].join(newline);
    for (const hint of [
      [`   > [!Hint] ${text}`],
      ["   > [!Hint]", `   > ${text}`],
    ]) {
      const source = ["1. [ ] Copy the prompt.", "", ...hint].join(newline);
      assert.equal(publishMarkdown(source).markdown, expected);
    }
  }
});

test("converts lowercase Skillable notes without changing GitHub alert titles", () => {
  for (const newline of ["\n", "\r\n"]) {
    const source = [
      "1. [ ] Copy the prompt.",
      "",
      "    > [!note] Keep the **original** context.",
      "",
      "> [!NOTE] Remember",
      "> Keep this alert title.",
    ].join(newline);
    const expected = [
      "1. Copy the prompt.",
      "",
      "    > [!NOTE]",
      "    > Keep the **original** context.",
      "",
      "> [!NOTE] Remember",
      "> Keep this alert title.",
    ].join(newline);
    assert.equal(publishMarkdown(source).markdown, expected);
  }
});

test("preserves continuation paragraphs within task-scoped Skillable callouts", () => {
  for (const newline of ["\n", "\r\n"]) {
    for (const [sourceType, publishedType] of [["note", "NOTE"], ["hint", "TIP"]]) {
      const source = [
        "1. [ ] Add knowledge.",
        "",
        `    > [!${sourceType}] First paragraph.`,
        "    >",
        "    >**If you get stuck:** Keep this advice in the same callout.",
      ].join(newline);
      const expected = [
        "1. Add knowledge.",
        "",
        `    > [!${publishedType}]`,
        "    > First paragraph.",
        "    >",
        "    >**If you get stuck:** Keep this advice in the same callout.",
      ].join(newline);
      assert.equal(publishMarkdown(source).markdown, expected);
    }
  }
});

test("uses verified Skillable syntax for both opening task callouts", async () => {
  const source = await readWorkshopSource();
  assert.match(source, /^ {4}> \[!note\] Running this prompt uses[^\r\n]+$/m);
  assert.match(source, /^ {4}> \[!hint\] For long prompts like this one,[^\r\n]+$/m);
  const { markdown } = publishMarkdown(source);
  assert.match(markdown, /^ {4}> \[!NOTE\]\r?\n {4}> Running this prompt uses[^\r\n]+$/m);
  assert.match(markdown, /^ {4}> \[!TIP\]\r?\n {4}> For long prompts like this one,[^\r\n]+$/m);
});

test("uses consistent inline callouts and correct task or section indentation throughout the lab", async () => {
  const source = await readWorkshopSource();
  const directives = [...source.matchAll(/^[ \t]*>[ \t]*\[![^\]]+\][^\r\n]*$/gm)];
  const callouts = [...source.matchAll(/^([ \t]*)> \[!(note|hint)\] ([^\r\n]+)$/gm)];
  assert.ok(callouts.length > 0);
  assert.equal(callouts.length, directives.length);
  const taskCallouts = [
    "Running this prompt uses",
    "For long prompts like this one,",
    "**Check:** Your Human Persona document contains",
    "**If you get stuck:** If Copilot cannot access",
    "When you repeat this workshop",
    "If you saved the Word document locally,",
    "**Check:** Your Human Persona document appears",
    "The **NestorW** workshop account has pre-populated",
    "**Check:** **Cloud Files**, **Outlook**, and **Teams** are on.",
  ];
  for (const [, indentation, , text] of callouts) {
    const inTask = taskCallouts.some((prefix) => text.startsWith(prefix));
    assert.equal(indentation, inTask ? "    " : "", `Incorrect callout indentation: ${text}`);
  }
  const { markdown } = publishMarkdown(source);
  const published = [...markdown.matchAll(/^([ \t]*)> \[!(NOTE|TIP)\]\r?\n\1> ([^\r\n]+)$/gm)];
  assert.deepEqual(
    published.map(([, indentation, type, text]) => [indentation, type, text]),
    callouts.map(([, indentation, type, text]) => [
      indentation, type === "note" ? "NOTE" : "TIP", text,
    ]),
  );
});

test("removes standalone Skillable page breaks while preserving other equals signs and line endings", () => {
  for (const newline of ["\n", "\r\n"]) {
    const source = [
      "Introduction.",
      "",
      "===",
      "",
      "## Step 1: First",
      "",
      "=== \t",
      "",
      "## Step 2: Second",
      "",
      "Keep === in text.",
      "`===`",
      "====",
      "    ===",
    ].join(newline);
    const { markdown } = publishMarkdown(source);
    assert.equal(markdown, [
      "Introduction.",
      "",
      "",
      "",
      "## Step 1: First",
      "",
      "",
      "",
      "## Step 2: Second",
      "",
      "Keep === in text.",
      "`===`",
      "====",
      "    ===",
    ].join(newline));
  }
});

test("publishes Skillable suggested prompt rows as headings and full-width code blocks", () => {
  const entries = [
    { title: "The morning briefing", prompt: "Hey Atlas, review my calendar and emails." },
    { title: "Meeting prep", prompt: "Help with [topic], **literal** formatting, and C++." },
    {
      title: "Weekly | reflection",
      prompt: "Compare stop | start | continue. Keep ``` intact.",
      codeFence: "````",
    },
  ];
  for (const newline of ["\n", "\r\n"]) {
    const table = [
      "| Title | Prompt |",
      "| --- | --- |",
      ...entries.map(({ title, prompt }) =>
        `| +++${title.replace(/\|/g, "\\|")}+++ | ++${prompt.replace(/\|/g, "\\|")}++ |`,
      ),
    ].join(newline);
    const expected = entries.map(({ title, prompt, codeFence = "```" }) =>
      [`## ${title}`, "", `${codeFence}text`, prompt, codeFence].join(newline),
    ).join(newline + newline);
    assert.equal(publishMarkdown(table).markdown, expected);
  }
});

test("leaves ordinary Markdown tables unchanged", () => {
  for (const table of [
    "| Title | Prompt |\n| --- | --- |\n| Example | Plain prompt text. |",
    "| Issue | Fix |\n| --- | --- |\n| Missing data | Ask for help. |",
  ]) {
    assert.equal(publishMarkdown(table).markdown, table);
  }
});

test("does not interpret suggested prompt table examples inside code fences", () => {
  for (const delimiter of ["```", "~~~"]) {
    const source = [
      `${delimiter}markdown`,
      "| Title | Prompt |",
      "| --- | --- |",
      "| +++Example+++ | ++Copy this prompt.++ |",
      delimiter,
    ].join("\n");
    assert.throws(() => publishMarkdown(source), /lab-only reference/);
  }
});

test("rejects malformed or empty cells in Skillable suggested prompt tables", () => {
  for (const row of [
    "| +++Example+++ | Missing copy markers. |",
    "| +++Example+++ | ++Unescaped | pipe.++ |",
    "| +++ +++ | ++Copy this prompt.++ |",
    "| +++Example+++ | ++ ++ |",
  ]) {
    const source = ["| Title | Prompt |", "| --- | --- |", row].join("\n");
    assert.throws(() => publishMarkdown(source), /Suggested prompt table row 1/);
  }
});

test("preserves checkbox, hint, and page-break examples inside fenced prompt and code blocks", () => {
  for (const delimiter of ["```", "~~~"]) {
    const prompt = [
      `   ${delimiter}text`,
      "1. [ ] Keep this prompt step.",
      delimiter[0].repeat(2),
      "2. [ ] This shorter marker does not close the block.",
      delimiter === "```" ? "~~~" : "```",
      "3. [ ] A different marker does not close it either.",
      "> [!note] Keep this literal note example.",
      "> [!Hint] Keep this literal hint example.",
      "===",
      `   ${delimiter}${delimiter[0]}`,
    ].join("\n");
    const { markdown } = publishMarkdown(`1. [ ] Before.\n\n${prompt}\n\n1. [ ] After.`);
    assert.equal(markdown, `1. Before.\n\n${prompt}\n\n1. After.`);
  }
});

test("publishes only referenced screenshots and deduplicates repeated images", () => {
  const { markdown, images } = publishMarkdown(
    "![First](../instructions/media/agent.jpg)\n![Again](../instructions/media/agent.jpg)",
  );
  assert.deepEqual(images, ["agent.jpg"]);
  assert.equal(markdown, "![First](./media/agent.jpg)\n![Again](./media/agent.jpg)");
});

test("resolves screenshots from nested workshop pages", () => {
  const { markdown, images } = publishMarkdown(
    "![Screenshot](../instructions/media/Update-agent.png)", "../media",
  );
  assert.equal(markdown, "![Screenshot](../media/Update-agent.png)");
  assert.deepEqual(images, ["Update-agent.png"]);
});

test("matches screenshot filename capitalization on case-insensitive hosts too", async () => {
  const files = new Set((await readdir(mediaDirectory, { recursive: true }))
    .map((file) => file.split(path.sep).join("/")));
  const pages = await readWorkshop();
  for (const page of pages) {
    for (const image of publishMarkdown(page.source).images) {
      assert.ok(files.has(image), `Screenshot must match its exact committed filename: ${image}`);
    }
  }
});

test("rejects images outside the screenshot directory", () => {
  for (const image of [
    "../Exercise00.md",
    "../instructions/media/../private.jpg",
    "../instructions/media/..\\private.jpg",
    "../instructions/media//private.jpg",
  ]) {
    assert.throws(() => publishMarkdown(`![Image](${image})`), /Screenshot|Invalid screenshot/);
  }
});

test("rejects unhandled lab links and credential tokens", () => {
  for (const source of [
    "[Setup](Exercise00.md)",
    "[Setup](Lab00.md)",
    "+++@lab.Variable(TAP)+++",
    "@lab.CloudCredential(WWLM365E7).UserPassword",
    "!INSTRUCTIONS[](https://example.com/instructions.md)",
  ]) {
    assert.throws(() => publishMarkdown(source), /lab-only reference/);
  }
});

test("preserves every prompt and workshop step across the canonical pages", async () => {
  const source = await readWorkshopSource();
  const { markdown, images } = publishMarkdown(source);
  const prompts = (text) => text.match(/^[ \t]*```text\r?\n[\s\S]*?^[ \t]*```/gm);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const expectedPrompts = [...source.matchAll(/^[ \t]*```text\r?\n[\s\S]*?^[ \t]*```/gm)]
    .map((match) => ({ index: match.index, block: match[0] }));
  const promptRows = [...source.matchAll(/^\| \+\+\+(.+?)\+\+\+ \| \+\+(.+?)\+\+ \|[ \t]*$/gm)];
  assert.equal(promptRows.length, 3);
  for (const row of promptRows) {
    const title = row[1].replace(/\\\|/g, "|");
    const prompt = row[2].replace(/\\\|/g, "|");
    expectedPrompts.push({
      index: row.index,
      block: ["```text", prompt, "```"].join(newline),
    });
    assert.ok(markdown.includes(`## ${title}`));
  }
  expectedPrompts.sort((first, second) => first.index - second.index);
  assert.deepEqual(prompts(markdown), expectedPrompts.map(({ block }) => block));
  const steps = (text) => [...text.matchAll(/^# Step (\d+):/gm)].map((match) => Number(match[1]));
  const sourceSteps = steps(source);
  assert.ok(sourceSteps.length > 0);
  assert.deepEqual(sourceSteps, Array.from({ length: sourceSteps.length }, (_, index) => index + 1));
  assert.deepEqual(steps(markdown), sourceSteps);
  assert.ok(images.length > 0);
  assert.doesNotMatch(markdown, /(?:Exercise|Lab)00\.md|@lab\.|\+\+\+/);
  assert.doesNotMatch(markdown, /^\d+\.[ \t]+\[ \]/m);
  assert.doesNotMatch(markdown, /^===[ \t]*$/m);
});

test("generates home and separate workshop pages without modifying any Skillable source", async () => {
  const pages = await readWorkshop();
  await prepareSite({ clean: true });
  assert.equal(
    await readFile(path.join(generatedDirectory, "index.md"), "utf8"),
    await readFile(homeFile, "utf8"),
  );
  for (const [index, page] of pages.entries()) {
    assert.equal(
      await readFile(path.join(generatedDirectory, ...page.outputFile.split("/")), "utf8"),
      publishWorkshopPage(pages, index).markdown,
    );
    assert.equal(
      await readFile(path.join(sourceDirectory, page.filename), "utf8"),
      page.source,
    );
  }
  assert.deepEqual(
    await readFile(path.join(generatedDirectory, "public", "copilot.png")),
    await readFile(heroFile),
  );
});

test("refreshes pages without deleting them or rewriting unchanged images", async () => {
  const images = await prepareSite({ clean: true });
  const pages = new Set(["index.md", ...(await readWorkshop()).map((page) => page.outputFile)]);
  const screenshot = path.join(generatedDirectory, "media", ...images[0].split("/"));
  const before = await stat(screenshot);
  const hero = path.join(generatedDirectory, "public", "copilot.png");
  const heroBefore = await stat(hero);
  const navigation = path.join(generatedDirectory, "navigation.json");
  const navigationBefore = await stat(navigation);
  const events = [];
  const watcher = watch(generatedDirectory, { recursive: true }, (type, filename) => {
    events.push({ type, filename: filename?.toString().split(path.sep).join("/") });
  });
  try {
    await prepareSite();
    await setTimeout(100);
  } finally {
    watcher.close();
  }
  assert.ok(!events.some(({ type, filename }) => type === "rename" && pages.has(filename)));
  assert.equal((await stat(screenshot)).mtimeMs, before.mtimeMs);
  assert.equal((await stat(hero)).mtimeMs, heroBefore.mtimeMs);
  assert.equal((await stat(navigation)).mtimeMs, navigationBefore.mtimeMs);
});

test("generates left navigation in filename order without publishing environment setup", async () => {
  await prepareSite();
  const pages = await readWorkshop();
  const navigation = JSON.parse(await readFile(path.join(generatedDirectory, "navigation.json"), "utf8"));
  assert.deepEqual(navigation, [{
    text: "Exercise 01",
    items: pages.map((page) => ({ text: page.title, link: page.route })),
  }]);
  assert.doesNotMatch(JSON.stringify(navigation), /Exercise00|@lab\./i);
});

test("removes obsolete generated pages during preview refreshes", async () => {
  const stale = path.join(generatedDirectory, "workshop", "obsolete-fixture.md");
  await writeFile(stale, "Not part of the workshop.");
  await prepareSite();
  await assert.rejects(readFile(stale), { code: "ENOENT" });
});

test("a clean build removes stale generated pages", async () => {
  await writeFile(path.join(generatedDirectory, "stale-fixture.md"), "Not part of Exercise01.");
  await prepareSite({ clean: true });
  assert.deepEqual((await readdir(generatedDirectory)).sort(), ["index.md", "media", "navigation.json", "public", "workshop", "workshop.md"]);
});
