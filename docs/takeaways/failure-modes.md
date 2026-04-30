# Failure modes

| Mode | Looks like | Why | Control |
|---|---|---|---|
| **Runaway scope** | Asked for one fix; three files changed | An open-ended instruction with no boundary | Say what **not** to change. Review the diff |
| **Invented API** | A call to something that does not exist | A plausible guess that was never checked | Typecheck and tests. Read the diff |
| **Test-gaming** | A test passes because the test changed, or a hard-coded special case | "Make the tests pass" can be met several ways | Say which side is wrong. Read test diffs alone. Add an independent check |
| **Silent assumption** | An ambiguity filled with an unstated guess | No question was asked | Tell it to ask first. Use plan mode |
| **Stale knowledge** | Last year's idiom for a newer library | Training data lags releases | Record current conventions in `CLAUDE.md` |
| **Context rot** | An early instruction forgotten in a long session | The window is full of old output | Start fresh, compact, or restate it |
| **Untrusted input obeyed** | Something happened that you did not ask for after it read a file, issue or page | Text from outside was treated as an instruction | Read every prompt. Isolation and a clean environment limit the damage |
| **Fail-open guard** | A hook or rule that silently protects nothing | A typo, a wrong exit code, a timeout, a matcher gap | Test it alone. **Confirm it fires** |
