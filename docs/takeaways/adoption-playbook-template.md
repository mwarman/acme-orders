# Adoption playbook (template)

Use this to take agentic coding back to your team in a controlled way. Fill it in, share it, and revisit it. **Keep it short.** A playbook nobody reads protects nobody.

## 1. Why, and what "better" means
- What problem are we trying to solve? (Speed? Quality? Onboarding? Toil?)
- How will we know? Choose **a few** signals you can observe (for example: review turnaround, defects found in review, time to first useful change for a new joiner). **Decide them before you start**, and be honest if you cannot measure one.

## 2. Pilot
| | |
|---|---|
| Who | (a small group, mixed experience) |
| What work | (low-risk, well-tested areas first) |
| For how long | |
| What we are **not** doing yet | |

## 3. Environment and access
- Which accounts and billing route are approved?
- Where does it run? (Local machine, container, VM.) What is mounted, what network does it have, which credentials are in its shell?
- How is the version chosen and updated? Who owns that?
- What are the usage and rate limits, and who watches spend?

## 4. Conventions
- A shared `CLAUDE.md` in each repository. Who owns it? How does it change?
- Prompt patterns the team agrees to use.
- Shared skills, subagents and tool servers: who reviews them, and where do they live?

## 5. Guardrails
Map to your organization's policy with [`ai-governance-template.md`](../ai-governance-template.md). Decide at least:
- Which actions need a human approval, and which are allowed.
- What the agent may **never** read (secrets, credentials).
- What runs **unattended**, and with what permissions and limits.
- Which files always need a **second reviewer**.

## 6. Review standard
Adopt or adapt [`review-checklist.md`](review-checklist.md). State who is accountable for AI-authored changes.

## 7. Risks and what we will do
| Risk | Likelihood | What we will do |
|---|---|---|
| Over-trust (changes merged without evidence) | | |
| Secrets or personal data exposed | | |
| A shared hook, skill or server is changed unsafely | | |
| Costs grow faster than value | | |
| Skills atrophy (people stop understanding the code) | | |

## 8. Review cadence
- First check: after two weeks. What did we learn? What do we change?
- Then monthly, until it is boring.

## 9. Owners
| Area | Owner |
|---|---|
| Environment and access | |
| Conventions and shared extensions | |
| Guardrails and policy | |
| Spend | |
| This playbook | |
