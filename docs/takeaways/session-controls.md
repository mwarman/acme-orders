# Session controls

| Situation | Reach for |
|---|---|
| It is heading the wrong way **right now** | **Esc** to interrupt (work so far is kept), then redirect |
| The task changed | `/clear`: a new conversation. File edits stay on disk. The old session can be resumed |
| Same task, long history | `/context` to see what is filling the window, then `/compact` |
| Coming back to earlier work | `/resume` (or `claude -c` from the shell for the latest session) |
| A change went wrong | **Esc Esc** or `/rewind` |
| You did not read the prompt | Read the prompt |

## Modes
Cycle permission modes with **Shift+Tab** and confirm the mode in the status bar. **Manual** asks before edits and commands. **Plan** reads and plans but changes nothing. **Auto** lets a classifier review actions. **Bypass** skips prompts and belongs only in isolated environments.

**The starting mode depends on your version, plan and settings. Check it; do not assume.**

## What persists between sessions
| Where | Who writes it | Survives `/clear`? |
|---|---|---|
| Conversation | Both | **No** (and may be lossy after `/compact`) |
| `CLAUDE.md` | **You** | Yes |
| Auto memory | **Claude** | Yes (on by default; check `/memory`) |
