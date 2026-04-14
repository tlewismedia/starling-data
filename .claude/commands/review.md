---
description: Dispatch the Reviewer subagent to verify an implementation branch
argument-hint: <issue-number>
---

Dispatch the Reviewer subagent for issue #$ARGUMENTS in `tlewismedia/new-compliance-copilot`.

Before dispatching:

1. Identify the implementation branch: `issue-$ARGUMENTS/<short-desc>`.
2. Fetch the issue body via the GitHub MCP — the body is the spec.
3. Pull the diff (`git diff main...issue-$ARGUMENTS/<short-desc>`) so you can pre-load it into the subagent's prompt.
4. Confirm the test suite passes locally — a Reviewer `APPROVED` on a red suite is worthless (`agentic-strategy.md`).

Invoke the Reviewer via the `Agent` tool using the dispatch template in `agents.md` (`Dispatching Reviewer`). The prompt must include:

- The branch name.
- The full issue body (which is the spec).
- The acceptance criteria as a numbered checklist.
- The diff (or instructions to read it from the branch).
- The test-run output.

Expected output: `[REVIEWER AGENT] APPROVED` or `[REVIEWER AGENT] REQUESTED CHANGES` with a numbered list of `file:line` issues.

After the subagent returns:

1. Read the verdict. If `REQUESTED CHANGES`, synthesise the findings and decide whether to re-dispatch the Implementer or ask the human first.
2. **Always ask the human to confirm before posting the review as a GitHub comment** (per `agents.md` — Requires Human Confirmation).
3. If approved, ask the human before opening the PR.
