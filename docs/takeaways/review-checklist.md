# Reviewing agent-written changes

## Diff review, in order
1. **`git diff --stat`.** Is the size what you expected?
2. **Test files on their own.** Deleted, skipped, weakened, or edited to fit?
3. **Scope.** Anything you did not ask for?
4. **Risky edges.** Authorization, input validation, error paths, data access, secrets, logging.
5. **Context.** Open the file. What do the neighbouring files do that this does not? A diff hides what is missing.
6. **Evidence.** Did you see passing test, lint and typecheck output for the full suite?

## A review standard for AI-authored code
Same bar as any code, **plus**:
1. Evidence, not assertion, and what was **not** tested.
2. Test diffs read on their own.
3. Scope matches the request.
4. Extra scrutiny for risky edges.
5. A **second reviewer** for dependency manifests and lockfiles, CI and build configuration, the agent's own settings, hooks and tool-server configuration.
6. No secrets or personal data in diffs, logs, prompts or generated docs.
7. Provenance and licensing recorded per your policy.
8. **A human is accountable.** Whoever approves the change owns it.

## What counts as evidence, by workflow
| Workflow | Show me |
|---|---|
| Bug triage | The failing test, why it failed, the root-cause line, the passing run |
| Feature | Acceptance tests green; diff stat in scope |
| Refactor | The same tests green **before and after**; a diff with no behavior change |
| Test generation | A test that fails when you break the code on purpose |
| Docs | A table: claim, file, true or false |
| Pull request | Each description line matched to the diff |
