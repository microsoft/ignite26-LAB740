# Attendee instructions

Complete the exercises in order:

1. [Exercise 00: Welcome to your lab environment](Exercise00.md) — sign in to the virtual machine and choose your workshop account.
2. [Exercise 01: Build your strategic partner agent](#exercise-01-build-your-strategic-partner-agent) — create your Human Persona and configure your agent.

## Exercise 01: Build your strategic partner agent

Each page is its own editable source, shared by Skillable and the website. On the website, use the left-hand **Exercise 01** menu to select a page, **Next** to advance, or **Back** to return. On smaller screens, open the **Menu** to access the same navigation. When reading directly on GitHub, use this index:

1. [Workshop overview](Exercise01-00.md)
2. [Step 1: Create your Human Persona](Exercise01-01.md)
3. [Step 2: Open Agent Builder](Exercise01-02.md)
4. [Step 3: Name and describe your agent](Exercise01-03.md)
5. [Step 4: Add the agent instructions](Exercise01-04.md)
6. [Step 5: Add knowledge sources](Exercise01-05.md)
7. [Step 6: Add suggested prompts](Exercise01-06.md)
8. [Step 7: Create and pin your agent](Exercise01-07.md)
9. [Step 8: Start a coaching session](Exercise01-08.md)
10. [Step 9: Edit your agent](Exercise01-09.md)
11. [Troubleshooting](Exercise01-10.md)

Edit the individual files above to change the instructions. Use the exact `Exercise01-NN.md` naming convention, without descriptive filename suffixes. Keep the two-digit page numbers sequential from `00` and the files in this folder so existing screenshot paths work in both platforms. The website discovers these numbered files automatically and generates its left menu and Next/Back navigation from filename order and page headings.

[Exercise01.md](Exercise01.md) is only an optional copy/paste include list for Skillable. VitePress does not use it, so removing it does not affect the website. If you keep it, update its includes when adding, removing, or renaming numbered pages.

## Use in Skillable

1. Use the Exercise00 setup include at the top of Skillable's instructions editor, if using the workshop environment:

   ```text
   !INSTRUCTIONS[](https://raw.githubusercontent.com/microsoft/ignite26-LAB740/refs/heads/main/instructions/Exercise00.md)

   ===
   ```

2. Immediately below that block, add one external include per numbered workshop page, in filename order. You can paste the optional [Exercise01.md](Exercise01.md) include list if it is up to date. Replace any previous workshop include or page list rather than nesting it inside another include.
3. The editor will contain one external include per workshop page, with `===` separators directly in the editor. Each included file contains only that page's content.
4. After the source files are published to Microsoft's `main` branch, confirm the page boundaries, screenshots, and Next navigation in Skillable's preview.

For use with your own account, omit the Exercise00 setup include and start with the workshop overview. Exercise00 and its environment credential tokens are never published on the VitePress website.
