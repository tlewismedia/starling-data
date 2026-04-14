# Agentic Coding Strategy

How to use AI agents to build this project reliably. This is the *workflow* — `agents.md` is the *rulebook*.

---

## The shape of the workflow

```
┌──────────────────────────────────────────────────────┐
│  Human                                               │
│   - Sets goals, approves plans                       │
│   - Confirms hard-to-reverse actions                 │
│   - Merges PRs                                       │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│  Orchestrator (Claude Code, main agent)              │
│   - Owns GitHub state                                │
│   - Dispatches subagents                             │
│   - Writes/reads memory                              │
│   - Synthesises findings, never delegates judgment   │
└──────┬───────────────┬──────────────┬────────────────┘
       │               │              │
       ▼               ▼              ▼
┌──────────┐    ┌──────────┐   ┌──────────┐
│ Spec     │    │ Implem-  │   │ Reviewer │
│ Writer   │    │ enter    │   │          │
└──────────┘    └──────────┘   └──────────┘
       │               │              │
       └───── durable artifacts ──────┘
        (GitHub issues, PRs, commits)
```

**Core loop:** human drafts a goal → orchestrator opens an issue → subagents produce artifacts → orchestrator advances state → human gates merges.

---

## Why this shape

### One orchestrator, many specialists

A single generalist agent managing everything loses focus — context bloats, decisions conflict, mistakes compound. A single specialist can't see the whole picture.

The fix: an **orchestrator** that keeps the plan in its head, delegates bounded tasks to specialists, and is the only authority on workflow state. Specialists return *findings*; the orchestrator *decides*.

### Durable artifacts, not chat

Conversations evaporate. Artifacts persist.

- **GitHub issues** are the unit of work — the spec lives in the issue/first comment, progress in labels, outcome in the close event.
- **PRs** are the unit of change — code diff + human-readable description + link to the driving issue.
- **Commits** are the unit of history — `AGENT:` prefix makes every agent-authored change searchable.
- **Memory files** are the unit of cross-session learning — "the user corrected me on X" persists forever.

If it's not in one of those four places, it doesn't exist after the session ends.

### Humans at the state transitions

An agent writing code is cheap to undo. An agent closing the wrong issue, force-pushing to main, or posting a nuanced review comment is expensive to undo.

The rule: **automate the easy stuff, gate the hard stuff.** Progress comments auto-post. Review verdicts require confirmation.

---

## The toolchain

### Claude Code as the orchestrator

- Runs locally, reads and writes files, runs shell commands, calls the GitHub CLI.
- Uses **subagents** (via the Agent tool) to run specialists in isolated contexts — the implementer's 30k-token context doesn't pollute the orchestrator's working memory.
- Uses **skills** to encapsulate repeatable procedures (e.g. `/commit`, `/review-pr`) that the user can invoke directly.
- Uses **memory** for cross-session continuity — the orchestrator doesn't forget the user's preferences between tasks.
- Uses **worktrees** (`isolation: "worktree"`) so the implementer works on an isolated copy of the repo without touching the main checkout.

### GitHub as the durable backbone

- Issues are the atomic unit of work.
- Labels encode workflow state (`spec-ready`, `in-progress`, `in-review`, `approved`).
- PRs link back to issues via `Closes #<N>`.
- `gh` CLI is the orchestrator's interface — no MCP server needed.

### Vitest + Playwright + eval harness as the truth

- Subagents write tests; the orchestrator runs them.
- A reviewer's "APPROVED" is worthless if the test suite is red — CI (or a pre-push hook) enforces this.
- The eval harness (post-MVP) catches regressions that type checks and unit tests can't see.

---

## How the orchestrator should think

These are principles for the orchestrator (i.e. the main Claude Code session), pulled from what works:

1. **Understand before delegating.** Never write "based on the agent's findings, do X" in a subagent prompt. Synthesise the findings yourself, then hand the specialist a precise instruction with file paths and line numbers.
2. **Self-contained prompts.** Subagents start with zero context. Every prompt must briefly re-state the goal, what's been tried, and what form the answer should take.
3. **Trust but verify.** A subagent's summary describes *what it intended*, not *what it did*. Before reporting work as done, check the actual diff.
4. **Parallelise the independent, serialise the dependent.** Independent research queries run in parallel; implementation tasks with shared files run in sequence.
5. **Reversibility first.** When in doubt about a risky action, ask the human. A 5-second confirmation is cheaper than an hour of recovery.
6. **Scope authorisations narrowly.** "Merge this PR" ≠ "merge any PR." "Allow `pnpm test`" ≠ "allow any pnpm command."
7. **Diagnose, don't bypass.** When a pre-commit hook fails, fix the cause. Never `--no-verify` as a shortcut.
8. **Root-cause, not symptom.** When a test fails, understand why before adjusting the test. When the build breaks, don't flip `ignoreBuildErrors` — fix the type.

---

## What the subagents look like

Each subagent is invoked via the `Agent` tool with a single well-scoped prompt. The orchestrator provides:

- The goal.
- All necessary context (spec, relevant file paths, prior attempts).
- The expected output format.
- Any constraints (length, scope, forbidden actions).

Concrete examples of good delegation:

**Spec Writer invocation:**
> "Read issue #42 and `plan.md`. Produce a spec comment on the issue covering scope, acceptance criteria, files likely to change, and non-goals. Do not modify code or issue state. Output starts with `[SPEC AGENT]`."

**Implementer invocation:**
> "Read issue #42, the `[SPEC AGENT]` comment on it, and `plan.md`. Implement on a worktree branch named `issue-42/<short-desc>`. Commits prefixed `AGENT:`. Write tests only if the spec asks. Do not change issue state or open a PR. Report back with the branch name, commit SHAs, and a one-paragraph summary."

**Reviewer invocation:**
> "Read the diff on branch `issue-42/<short-desc>`, the spec on issue #42, and `plan.md`. Verify each acceptance criterion. Output `APPROVED` or a numbered list of issues with `file:line` references. Ask for human confirmation before posting as a GitHub comment."

Notice: the orchestrator does the understanding. The subagent does the bounded task.

---

## How to evolve this strategy

Treat the agent workflow as a product you iterate on. Things that should trigger a rethink:

- **Subagents hallucinating context** → prompts aren't self-contained. Add required reading.
- **Reviewer approves broken code** → the reviewer prompt isn't demanding the test suite pass before approving. Tighten.
- **Merge conflicts between parallel issues** → the DAG isn't being respected. Serialise overlapping work.
- **The orchestrator keeps rediscovering the same preference** → that's a memory miss. Save it.
- **Workflow state ambiguous ("is this in review or waiting on spec?")** → labels aren't being set promptly. Tighten the orchestrator's state-update discipline.

The workflow is wrong when it's *costing* you. Change it then, not before.

---

## Anti-patterns to avoid

- **"God agent."** One agent doing spec + code + review + merge. No one catches its mistakes. Separate the roles.
- **"Chat-driven development."** Decisions in the conversation, not in issues/PRs. Next session can't find them.
- **"Silent automation."** Agents posting review verdicts, closing issues, merging without a human gate. You'll clean this up for weeks.
- **"Mock-data demos."** The UI renders fake data that doesn't come from the real pipeline. Ship-looks-working ≠ ships-working.
- **"Prompt and pray."** Vague subagent prompts ("fix this bug") that push understanding onto the specialist. The specialist doesn't have the context to judge. You do.
- **"Chasing agent output."** Re-asking the same agent the same question with slight rewording when the first answer disappoints. If a subagent fails twice on the same task, the *orchestrator's* briefing is probably wrong — rewrite the prompt, don't retry it.

---

## Summary

- **Orchestrator + specialists + human gates.** Not a god-agent, not a swarm.
- **Durable artifacts.** GitHub issues, PRs, commits, memory.
- **Bounded, self-contained subagent prompts.** The orchestrator synthesises; the subagent executes.
- **Automate the cheap-to-undo, confirm the expensive-to-undo.**
- **Tests and evals are the source of truth.** An agent's confidence means nothing without them.
