---
description: Dispatch the Spec Writer subagent to draft a spec for a GitHub issue
argument-hint: <issue-number>
---

Dispatch the Spec Writer subagent for issue #$ARGUMENTS in `tlewismedia/new-compliance-copilot`.

Before dispatching:

1. Fetch the issue body and any prior comments via the GitHub MCP.
2. Read `plan.md`, `project-goals.md`, and `agents.md` for context.
3. Identify the files likely to change so you can pre-load the subagent's context.

Then invoke the Spec Writer using the dispatch template in `agents.md` (`Dispatching Spec Writer`). The prompt must be self-contained: state the goal, quote the issue body, list the required output sections, and name the relevant files.

Rules:

- The subagent drafts the spec only. It must not modify code or change issue state.
- The output starts with `[SPEC AGENT]` and is ready to post as a GitHub comment.
- After the subagent returns, read the draft yourself, sanity-check it against `plan.md`, and ask the human before posting it to the issue. Posting a spec comment and flipping the label from `spec-needed` to `spec-ready` is the orchestrator's job, not the subagent's.
