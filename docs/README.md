# Workshop website

The VitePress site has a landing page followed by a workshop overview, one page per step, and troubleshooting. A left-hand **Exercise 01** menu lists all workshop pages and highlights the current page, using the same native VitePress sidebar layout as SKL233. On smaller screens, open **Menu** to access it. Each workshop page also has native **Next** and **Back** navigation where applicable. Direct links and search remain available; navigation is not locked behind completion checks. The workshop account setup in Exercise00 is not published.

Edit [index.md](index.md) for the landing page's title, description, and button. Its hero image is [public/copilot.png](public/copilot.png). Edit the individual `Exercise01-NN.md` files listed in the [instruction index](../instructions/README.md) for workshop content, never the generated pages. Use two-digit page numbers with no descriptive filename suffix. There is no combined editable copy of the workshop.

The website discovers `Exercise01-NN.md` files directly from the instructions folder and sorts them by their two-digit page numbers. Keep the sequence continuous from `00`, start each file with a level-one heading, retain `Step N:` in numbered page headings, and leave troubleshooting last. The overview keeps the existing `/workshop` URL, numbered steps use `/workshop/step-N`, and troubleshooting uses `/workshop/troubleshooting`. Old single-page step and subsection bookmarks redirect to the corresponding page.

[Exercise01.md](../instructions/Exercise01.md) is an optional Skillable include list. VitePress does not read or watch it, and it can be removed without affecting the website. Builds read the numbered pages locally and never fetch instructions from GitHub.

This folder contains the site's package files, configuration, theme, and publishing scripts. No root-level Node project is required.

## Preview locally

Use Node.js 22.12 or later. From the repository root:

```powershell
npm --prefix docs ci
npm --prefix docs run docs:dev
```

Open the local URL printed by VitePress, which defaults to the `/ignite26-LAB740/` base path. Changes to the landing page, hero image, individual workshop pages, or screenshots refresh the preview. Adding, removing, or renaming numbered pages also updates the preview; keep the resulting sequence valid.

## Test and build

```powershell
npm --prefix docs test
npm --prefix docs run docs:build
npm --prefix docs run docs:preview
```

The build copies the landing page and Copilot hero image, publishes every workshop page with explicit previous/next links, generates the sidebar from filename order and page titles, converts lab-only URL formatting, removes setup account-table dependencies, and copies only referenced screenshots. The generated navigation is a VitePress configuration dependency, so title and ordering changes also refresh the sidebar during development. Nested website pages use the correct relative image paths. Skillable's `[ ]` markers are removed from numbered steps on the website, leaving the numbered instructions intact. Skillable `[!hint]` blocks become VitePress tips and `[!note]` blocks become notes. The source files and all fenced prompt text are preserved. Missing images, gaps in page numbering, incorrect page headings, or unhandled lab-only references fail the build. Tests also check screenshot filename capitalization so Windows cannot mask a Linux build failure.

Write Skillable callouts as `> [!note] Note text` or `> [!hint] Hint text`, using lowercase markers and keeping the body on the same line. Use notes for context and checks, and hints for tips and help. Inside the lab's numbered tasks, indent these lines four spaces. Continue additional paragraphs in the same callout with a quoted blank line and the same indentation. Keep section-wide guidance unindented so it does not become part of the preceding task. Website publishing converts these to VitePress note and tip blocks.

Suggested prompts use a two-column **Title** / **Prompt** table with `+++title+++` (type into the VM) and `++prompt++` (copy to clipboard) in Skillable. Website publishing turns each row into a heading and a full-width text code block with a Copy button. Escape literal pipes inside table cells as `\|`.

Generated content, cache, and output stay under `.vitepress/` and are ignored by Git.

## Use the same pages in Skillable

Follow the [Skillable setup instructions](../instructions/README.md#use-in-skillable). Add one external include per numbered page, in filename order, to Skillable's top-level instructions editor after any Exercise00 setup include and separator. The optional [Exercise01.md](../instructions/Exercise01.md) file provides a copy/paste include list; keep it synchronized with the numbered pages if you retain it. Update older Skillable URLs to the renamed exercise files. Keep `===` separators directly in the editor rather than externally including the list itself.

The raw URLs target Microsoft's `main` branch, so newly added source files must be published there before Skillable can load them. Confirm page boundaries in Skillable's own preview; the website build cannot verify Skillable's renderer.

## Deployment paths

The deployment workflow supplies `PAGES_BASE_PATH` from the site's configuration, so root-hosted sites and repository-path sites use the correct asset and navigation URLs automatically. An empty value or `/` builds at the domain root; `/ignite26-LAB740` builds under that project path. If the variable is unset, local development keeps the existing `/ignite26-LAB740/` default.

To check a root-hosted build locally:

```powershell
$env:PAGES_BASE_PATH = "/"
npm --prefix docs run docs:build
npm --prefix docs run docs:preview
```

Remove `PAGES_BASE_PATH` from the shell environment and rebuild to return to the default path.
