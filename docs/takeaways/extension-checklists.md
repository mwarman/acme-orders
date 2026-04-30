# Extension checklists

## A skill
| Check | |
|---|---|
| Name matches the folder; lowercase and hyphenated | |
| Description says **what** it does and **when** to use it | |
| Tools it pre-approves are the **minimum**, and read-only if it reviews | |
| Long detail is in a supporting file | |
| Side effects? Then user-invoked only | |
| Who reviews changes to this file? | |

## A subagent
| Check | |
|---|---|
| `tools` is **explicit** (omitting it inherits **all** tools) | |
| Description says **what** and **when** | |
| The body says what to report, with **evidence**, and to say "none found" | |
| It knows only what you told it. Did you tell it enough? | |
| You checked its findings against the code | |

## A hook
| Check | |
|---|---|
| You tested the script **alone** with piped JSON | |
| It uses **exit 2** (not 1) to block, and writes the reason to **stderr** | |
| You confirmed **with a real attempt** that it fires | |
| It **fails closed** if it cannot read its input | |
| You know what it does **not** cover, and which layer does | |
| Someone reviews changes to it | |

## Connecting a tool server
| Ask | |
|---|---|
| What can it **see**? | |
| What could it **change**? | |
| What **stops** it? (the line of code or the setting, not the description) | |
| Who else is **affected** (is the scope shared)? | |
| What is the **least** data it needs? | |
