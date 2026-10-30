# Step 1: Create your Human Persona

The Human Persona helps your agent understand your values, goals, boundaries, communication style, and definition of success.

Instead of answering the questions from scratch, ask Microsoft 365 Copilot to use the default **NestorW** workshop account's sample work context to answer them and create a Human Persona Word document for **Nestor W**.

1. [ ] If you havent navigated to **Microsoft 365 Copilot Chat**, open a new tab in your browser and navigate to:  +++https://m365.cloud.microsoft/chat+++
1. [ ] In Microsoft 365 Copilot Chat, start a new chat while signed in with the default **NestorW** workshop account.
1. [ ] Copy and run the entire prompt below:

    > [!note] Running this prompt uses **Nestor W's Work context** from the **NestorW** workshop account, **not your own work context**. In the prompt, "I," "me," and "my" refer to Nestor W.

    > [!hint] For long prompts like this one, use the code box's **Copy** button instead of typing the prompt manually. Paste the full prompt into Microsoft 365 Copilot Chat before sending it.

      ```text
      Context
      I am creating a multi section document that contains questions about me, my background, leadership, and impact. Ground the answers in factual information about my experience, roles, and work from the sources available to Microsoft 365 Copilot for my signed-in account.

      Execution Instructions (Critical)

      1. First, use available source-research tools to find information relevant to ALL questions.
      2. Then, generate complete answers for ALL questions before creating the file.
      3. Only after ALL answers are completed, create the Word document in a single step.
      4. Do NOT generate partial outputs or drafts, or create the file until all content is complete. Source-research tools may be used beforehand.
      5. If document generation fails, retry using the completed content. If source research or document creation cannot be completed, report the limitation rather than inventing facts or claiming success.

      Source of Truth (Strict)
      Use only the section headers and question text exactly as provided below. Refer to my accessible emails, documents I have authored, Teams messages, and any other available work sources where you can find information related to me. Do not add, remove, rename, or reorder sections or questions. Do not invent roles, achievements, scope, or experiences. For reflective or personal questions (e.g., preferences, emotional patterns, work style), you may infer based on existing documents and communication patterns, but must stay consistent with known information. Distinguish inferences from confirmed facts. If the available sources do not establish an answer, state that limitation under the question instead of inventing details.

      Response Scope Rules
      Treat each question as a standalone prompt. Each answer must fully stand on its own and should not depend on context from other questions. Answer only the question directly above your response. Do not reference, summarize, compare, or connect answers across other questions or sections. Avoid repeating identical phrasing. It is acceptable to reuse core themes or facts, but each answer must provide a distinct perspective focused on the question.

      Writing Instructions
      For each question:

      - Target 5-10 sentences per question (4-8 if needed for clarity and to avoid redundancy). The total character limit takes priority over these sentence targets. Where evidence is insufficient, use a brief statement of the gap rather than padding the answer.
      - Write in first person ("I").
      - Focus only on content relevant to that specific question.
      - Highlight my experience, strengths, leadership style, and impact only as they relate to that question.
      - Maintain a consistent, professional, and authentic voice.

      Structure & Formatting Rules
      Preserve all original section titles and question text exactly as written. Do not add introductions, summaries, conclusions, or section-level overviews. Place the answer immediately below each question, separated by a single blank line. Format cleanly for Microsoft Word (headings, spacing, and paragraph breaks only).

      Document Creation
      Final output must be a single Word (.docx) document. Insert the fully written responses under each question. You MUST answer ALL questions in the document, including an explicit statement of any evidence gaps. Partial completion is not acceptable.

      Output Rules
      On success, provide only the completed Word document. Do not explain your approach or summarize your work in chat. Keep total generated answer text under 6000 characters.

      THE QUESTIONS

      1. Who I am and understand my situation in the organization: my role, name, team, who I serve
      2. What impact am I trying to create?
      3. What defines success for me?
      4. What are my non-negotiable values?
      5. When priorities conflict, what should win?
      6. What skill would make the biggest difference in my performance?
      7. What makes me go out of bed, motives me?
      8. What are my unique strengths?
      9. What drains my energy or creates regret?
      10. What is my preferred tone and workstyle for all work outputs?
      ```

1. [ ] Copilot automatically creates the Word document. Open it and review all ten answers. Check that the name and role describe **Nestor W**, the person represented by the **NestorW** workshop account, rather than you. You are not expected to verify Nestor W's team, work history, or source files.
1. [ ] Keep the automatically generated filename or, if you prefer, open the document in Word and rename it to something more identifiable, such as `NestorW-Human-Persona.docx`. Make a note of the filename so you can find the document when you add it as knowledge in Step 5.

    > [!note] **Check:** Your Human Persona document contains all ten questions with an answer or an explicit evidence gap under each one, and you have noted its filename for Step 5.

    > [!hint] **If you get stuck:** If Copilot cannot access work sources or create the Word document, confirm that you are signed in with the **NestorW** workshop account and ask a proctor for help.

    > [!hint] When you repeat this workshop with your own work account, use the same prompt to create your own Human Persona. Review and refine it before adding it as agent knowledge, especially any inferred values, motivations, or work preferences.

Select **Next** to continue to the Workshop instructions.
