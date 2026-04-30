# Choosing the mechanism

Ask in this order:

| Ask | If yes |
|---|---|
| Must it happen, or be prevented, **every time**? | Enforce it: a permission rule, a hook, isolation, or your repository's own tooling |
| Do **humans** need the same rule? | **Repository tooling first** (CI, linters, git hooks) |
| Is it **knowledge** the agent needs most sessions? | Instructions (`CLAUDE.md` or a path rule). Keep it short |
| Is it a **procedure** used sometimes? | A skill. Make it user-invoked if it has side effects |
| Is it **noisy**, or does it need **independence** or fewer tools? | A subagent, with an explicit `tools` list |
| Does it need **data or actions outside the repo**? | A tool server, with least privilege, that you can read |
| Otherwise | Just ask |

## Strength of each
| Mechanism | Enforcement |
|---|---|
| Instructions, skills | **Advice** |
| Hooks | Deterministic, but can **fail open** and can be sidestepped |
| Permission rules | Enforced by the tool; shell rules match **text** |
| Isolation, managed policy | Enforced by the OS or an administrator |

Name the runner-up, and what you lose by taking it.
