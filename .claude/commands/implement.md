---
description: Dispatch the Implementer subagent on an isolated worktree for a GitHub issue
argument-hint: <issue-number>
---

Dispatch the Implementer subagent for issue #$ARGUMENTS in `tlewismedia/new-compliance-copilot`.

Before dispatching:

1. Fetch the issue body via the GitHub MCP — the body is the spec.
2. Sanity-check that the body contains scope, acceptance criteria, and non-goals. If the body is thin or ambiguous, stop and ask the human to flesh it out before dispatching.
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
4. Dispatch the Reviewer next; ask the human before posting the Reviewer's verdict or opening the PR.
