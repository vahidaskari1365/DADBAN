// ============================================================
// کتابخانه مهارت‌های عامل — استخراج‌شده از مخزن mattpocock/skills
// منبع: github.com/mattpocock/skills — مهارت‌های آماده برای عامل‌های کدنویس
// ============================================================

export interface AgentSkill {
  slug: string;
  name: string;
  description: string;
  category: string;
}

export const AGENT_SKILLS: AgentSkill[] = [
  {
    "slug": "ask-matt",
    "name": "ask-matt",
    "description": "Ask which skill or flow fits your situation. A router over the skills in this repo.",
    "category": "مهندسی"
  },
  {
    "slug": "code-review",
    "name": "code-review",
    "description": "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \\\"review since X\\\".",
    "category": "مهندسی"
  },
  {
    "slug": "codebase-design",
    "name": "codebase-design",
    "description": "Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.",
    "category": "مهندسی"
  },
  {
    "slug": "diagnosing-bugs",
    "name": "diagnosing-bugs",
    "description": "Diagnosis loop for hard bugs and performance regressions. Use when the user says \"diagnose\"/\"debug this\", or reports something broken/throwing/failing/slow.",
    "category": "مهندسی"
  },
  {
    "slug": "domain-modeling",
    "name": "domain-modeling",
    "description": "Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR.",
    "category": "مهندسی"
  },
  {
    "slug": "grill-with-docs",
    "name": "grill-with-docs",
    "description": "A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.",
    "category": "مهندسی"
  },
  {
    "slug": "implement",
    "name": "implement",
    "description": "Implement a piece of work based on a spec or set of tickets.",
    "category": "مهندسی"
  },
  {
    "slug": "implement-spec",
    "name": "implement-spec",
    "description": "Implement the result of /to-spec and /to-tickets in code.",
    "category": "مهندسی"
  },
  {
    "slug": "improve-codebase-architecture",
    "name": "improve-codebase-architecture",
    "description": "Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.",
    "category": "مهندسی"
  },
  {
    "slug": "pr",
    "name": "pr",
    "description": "Use when writing a PR body.",
    "category": "مهندسی"
  },
  {
    "slug": "prototype",
    "name": "prototype",
    "description": "Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.",
    "category": "مهندسی"
  },
  {
    "slug": "research",
    "name": "research",
    "description": "Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.",
    "category": "مهندسی"
  },
  {
    "slug": "retro",
    "name": "retro",
    "description": "Conduct a retrospective on a coding session.",
    "category": "مهندسی"
  },
  {
    "slug": "setup-matt-pocock-skills",
    "name": "setup-matt-pocock-skills",
    "description": "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.",
    "category": "مهندسی"
  },
  {
    "slug": "tdd",
    "name": "tdd",
    "description": "Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions \"red-green-refactor\", or wants integration tests.",
    "category": "مهندسی"
  },
  {
    "slug": "to-spec",
    "name": "to-spec",
    "description": "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed.",
    "category": "مهندسی"
  },
  {
    "slug": "to-tickets",
    "name": "to-tickets",
    "description": "Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker).",
    "category": "مهندسی"
  },
  {
    "slug": "triage",
    "name": "triage",
    "description": "Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs.",
    "category": "مهندسی"
  },
  {
    "slug": "wayfinder",
    "name": "wayfinder",
    "description": "Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.",
    "category": "مهندسی"
  },
  {
    "slug": "wizard",
    "name": "wizard",
    "description": "Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.",
    "category": "مهندسی"
  },
  {
    "slug": "grill-me",
    "name": "grill-me",
    "description": "A relentless interview to sharpen a plan or design.",
    "category": "بهره‌وری"
  },
  {
    "slug": "grilling",
    "name": "grilling",
    "description": "Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.",
    "category": "بهره‌وری"
  },
  {
    "slug": "handoff",
    "name": "handoff",
    "description": "Compact the current conversation into a handoff document for another agent to pick up.",
    "category": "بهره‌وری"
  },
  {
    "slug": "teach",
    "name": "teach",
    "description": "Teach the user a new skill or concept, within this workspace.",
    "category": "بهره‌وری"
  },
  {
    "slug": "to-questionnaire",
    "name": "to-questionnaire",
    "description": "Turn a decision you can't fully answer into a questionnaire for someone else to fill in.",
    "category": "بهره‌وری"
  },
  {
    "slug": "wait-what",
    "name": "wait-what",
    "description": "Stop. That last message did not land: re-pitch it.",
    "category": "بهره‌وری"
  },
  {
    "slug": "writing-for-agents",
    "name": "writing-for-agents",
    "description": "Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.",
    "category": "بهره‌وری"
  },
  {
    "slug": "git-guardrails-claude-code",
    "name": "git-guardrails-claude-code",
    "description": "Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. Use when user wants to prevent destructive git operations, add git safety hooks, or block git push/reset in Claude Code.",
    "category": "متفرقه"
  },
  {
    "slug": "migrate-to-shoehorn",
    "name": "migrate-to-shoehorn",
    "description": "Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.",
    "category": "متفرقه"
  },
  {
    "slug": "scaffold-exercises",
    "name": "scaffold-exercises",
    "description": "Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises, create exercise stubs, or set up a new course section.",
    "category": "متفرقه"
  },
  {
    "slug": "setup-pre-commit",
    "name": "setup-pre-commit",
    "description": "Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.",
    "category": "متفرقه"
  }
];
