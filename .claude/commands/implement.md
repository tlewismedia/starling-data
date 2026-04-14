---
description: Dispatch the Implementer subagent on an isolated worktree for a GitHub issue
argument-hint: <issue-number>
---

Dispatch the Implementer subagent for issue #$ARGUMENTS in `tlewismedia/new-compliance-copilot`.

Before dispatching:

1. Fetch the issue and its `[SPEC AGENT]` comment via the GitHub MCP.
2. Confirm the issue is labelled `spec-ready` (feature) or `bug` (issue body is the spec). If it is not, stop and tell the human.
3. Read `plan.md` and any referenced code so you understand the shape of the change.
4. Pick a short-description slug for the branch name: `issue-$ARGUMENTS/<short-desc>`.

Invoke the Implementer via the `Agent` tool using the dispatch template in `agents.md` (`Dispatching Implementer`). The subagent runs with `isolation: "worktree"` so it works on an isolated copy.

The prompt must:

- Paste the full spec (do not make the subagent re-fetch it).
- List the acceptance criteria as a numbered list.
- Name the relevant files.
- State the branch name you chose.
- Reiterate constraints: commits prefixed `AGENT:`, TypeScript only, no PR, no issue-state changes, no work outside spec scope.

After the subagent returns:

1. Inspect the actual diff — do not trust the summary alone.
2. Verify the branch name, commit prefixes, and scope.
3. Flip the issue label from `in-progress` to `in-review` (orchestrator-only action).
4. Ask the human before opening the PR or dispatching the Reviewer.
