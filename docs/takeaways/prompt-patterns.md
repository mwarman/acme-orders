# Prompt patterns

## The four parts
```text
Goal:        what you want and why; point to the source of truth
Context:     where to look (files, docs), tests that show the style
Constraints: what must not change; patterns to follow; what is out of scope
Acceptance:  how we will know: a failing test first, commands to run, output to show
Process:     explore first; ask me about anything ambiguous; give me a plan; wait for approval
```

## Rules of thumb
- **Make it checkable.** If you cannot say how you would verify it, the agent cannot either.
- **Ask for evidence, not assurance:** "Run the tests and show me the output."
- **Ambiguity does not disappear. Someone fills it.** Tell the agent to ask, and watch whether it does.
- **Plan when you are unsure.** Skip the plan when you could describe the diff in one sentence.
- **Two failed corrections means start over.** `/clear`, then write a better first prompt that includes what you learned.
- **Vague is fine for exploring.** The skill is knowing which mode you are in.

## Prompt autopsy (use it on a weak session)
| Question | Notes |
|---|---|
| What did it **assume**? | |
| What did it **read**, and what did it skip? | |
| What would have made it **ask**? | |
| What did the plan include **beyond the ask**? | |
| **How would we know** it is right? | |
| **Rewrite:** goal, context, constraints, acceptance, process | |
