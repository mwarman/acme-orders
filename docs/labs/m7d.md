# M7d: Hooks

**Continue on your `work/m8` branch.** Use **Manual** mode.

A **hook** is a script Claude Code runs at a fixed point in its loop. Unlike a line in `CLAUDE.md`, a hook is **deterministic**: it runs every time its event fires.

## The shape (from the official docs)

Hooks live in a settings file. The project file `.claude/settings.json` is shared with your team. Each hook has an **event**, a **matcher** that picks the tools, and a **handler**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "<tool names, e.g. Edit|Write>",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<your-script>.mjs"],
            "onFailure": "block"
          }
        ]
      }
    ]
  }
}
```

Your script receives the event as **JSON on stdin** (it includes `tool_name` and `tool_input`; for file edits, `tool_input.file_path`). It answers with its **exit code**:

| Exit code | Meaning |
|---|---|
| **0** | No objection. The action goes ahead through the normal permission flow |
| **2** | **Block.** What your script writes to stderr goes back to Claude |
| anything else, **including 1** | A non-blocking error. The action **goes ahead** |

Check what is loaded with `/hooks`.

> **Two traps.** An exit code of 1 does not block. And a hook that cannot start, for example because of a typo in the script path, **lets the action through** unless you set `"onFailure": "block"`. If your hook is meant to be a guard, confirm that it fires.

## Task 1: block edits to `.env` (about 7 minutes)

The repository's local settings file is `.env`. It is not in git, and it holds values you do not want an agent changing.

1. Write a **PreToolUse** hook that blocks the agent from editing `.env`. You can ask Claude Code to write the script. Put it in `.claude/hooks/`.
2. **Test the script on its own, without the agent**, by feeding it the JSON an event would carry:

   ```bash
   echo '{"tool_name":"Edit","tool_input":{"file_path":".env"}}' | node .claude/hooks/<your-script>.mjs; echo "exit=$?"
   echo '{"tool_name":"Edit","tool_input":{"file_path":"src/main.ts"}}' | node .claude/hooks/<your-script>.mjs; echo "exit=$?"
   ```

   You expect `exit=2` for the first and `exit=0` for the second.
3. Register it in `.claude/settings.json`, run `/hooks` to confirm it is loaded, then ask the agent: *"Add `GATEWAY_REGION=us-east-1` to `.env`."* Does your hook stop it? What does the agent do next?

(Editing `.claude/settings.json` is itself a sensitive action. Expect a permission prompt, and read it.)

## Task 2: break your own guard (about 5 minutes)

List **three ways the agent could still read or change `.env`** despite your hook. Try two of them. For each, write down:

- Did your hook catch it?
- Would a **permission rule** such as a `Read(./.env)` deny rule catch it?
- What would stop it that is **not** a hook or a rule?

## Stretch

- Add a **PostToolUse** hook that runs `npm run typecheck` after a TypeScript file is edited and reports failures back to Claude.
- Start the app (`npm run dev`) and read the startup log. Is anything there that should not be? Fix it, and add a check so it cannot return.

## Before you share a hook

- Hooks run **with your access**, outside any sandbox. Read a hook before you trust it.
- A `.claude/settings.json` that is committed runs on **everyone's** machine who trusts the folder. Review changes to it like code.

## Success looks like

- Your script passes the two test commands above.
- You confirmed with `/hooks` and a real attempt that it **fires**.
- You can explain one thing a hook cannot protect against, and what layer would.
