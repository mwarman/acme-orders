# CLAUDE.md template

Copy this into a file named `CLAUDE.md` at the project root (or `.claude/CLAUDE.md`) and fill it in. Keep it short: record what the agent cannot work out by reading the code. The official guidance is to stay **under 200 lines**; most good files are far shorter.

```markdown
# {{PROJECT_NAME}}

## Stack
{{LANGUAGE_AND_VERSION}}, {{FRAMEWORK}}

## Commands
- Test:      {{TEST_CMD}}
- Lint:      {{LINT_CMD}}
- Typecheck: {{TYPECHECK_CMD}}
- Build:     {{BUILD_CMD}}
- Run (dev): {{DEV_CMD}}
Run test, lint and typecheck before saying a task is done, and show the output.

## Layout
{{MODULE_LAYOUT}}

## Conventions
{{CODE_CONVENTIONS}}

## Do not touch
{{DO_NOT_TOUCH}}
```

## What to include and what to leave out

| Include | Leave out |
|---|---|
| Commands the agent can't guess | Anything it can figure out by reading the code |
| Style rules that differ from the defaults | Standard language conventions it already knows |
| How to run tests and which runner to use | Long API documentation (link to it) |
| Gotchas and non-obvious behavior | File-by-file descriptions of the codebase |
| Repository etiquette (branches, PRs) | Information that changes often |

## Tips

- **Be concrete enough to check.** "Use 2-space indentation" beats "format code properly". "Run `npm test` before committing" beats "test your changes".
- **For each line, ask:** would removing it cause a mistake? If not, cut it. A bloated file makes the important lines easy to miss.
- **Add a line when** the agent makes the same mistake twice, a code review catches something it should have known, or you type the same correction again.
- **Confirm it loaded:** run `/context` and look under **Memory files**.
- **Imports (`@path/to/file`) organize a file but do not reduce its cost.** Imported files load with the file that imports them.
- **It is advice, not enforcement.** If something must happen every time, use a hook.
- **Commit it** so the team shares it. Put personal notes in `CLAUDE.local.md` and keep that out of git.
- If your repository already has an `AGENTS.md` for other tools, you can import it from `CLAUDE.md` with `@AGENTS.md`.
