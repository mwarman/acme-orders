# Mapping agentic coding to your organization's policy

A worksheet for M8. It is **vendor-neutral**: the categories below are common to most security and engineering policies. For each one, find what *your* organization's policy says, then decide which setting, practice or process in your own environment carries it out. Where nothing does, that is a gap, and the person who owns it is the useful finding.

This is a thinking tool, not a compliance checklist. It does not replace your organization's actual policy.

## Control map

Fill in at least four rows in the lab. Start with the ones you know your policy covers.

| # | Category | The question to answer | Examples of controls (generic) | What your policy says | How you would carry it out | Gap / owner |
|---|---|---|---|---|---|---|
| 1 | **Data handling** | Which data classes may be sent to a model or a third party? Under which account and terms? | Data classification, approved account types, retention and training terms, redaction | | | |
| 2 | **Identity and access** | Who may use the tool, with which accounts, and with which credentials in the environment? | Single sign-on, per-user accounts, least-privilege tokens, no shared keys | | | |
| 3 | **Secrets** | How do secrets stay out of prompts, logs, files and the agent's shell? | Secret stores, short-lived tokens, scanning, keeping real credentials out of dev environments | | | |
| 4 | **Execution control** | What may the agent run, read, write and reach (files, commands, network)? | Approval rules, deny lists, OS or container isolation, network egress limits | | | |
| 5 | **Change control and review** | How is AI-authored code reviewed and gated before it ships? | Code review standards, required tests, CI gates, protected branches, second reviewers for risky files | | | |
| 6 | **Third parties and supply chain** | Which extensions, plugins, servers and dependencies may it use or add? | Allow lists, dependency review, lockfiles, disabled install scripts, vetted tool servers | | | |
| 7 | **Logging and audit** | What is recorded, where, for how long, and who can read it? | Usage and tool-call logs, change auditing, retention | | | |
| 8 | **Intellectual property and licensing** | Who owns generated code? How are licensing and provenance handled? | Contract terms, license scanning, attribution and provenance records | | | |
| 9 | **Incidents and exceptions** | What do you do when the agent does something unexpected? Who can approve an exception? | Reporting path, break-glass process, policy exceptions with an owner and an expiry | | | |

## Layers and their limits

A control can live in more than one place. Each place has a different strength and a different blind spot. Pick the layer that matches the requirement, and do not expect an advisory layer to do an enforcing layer's job.

| Layer | Who enforces it | Strength | Blind spot to remember |
|---|---|---|---|
| **Instructions to the agent** (project notes, prompts) | The model | Shapes what it tries | **Advice, not enforcement.** Nothing makes it comply |
| **Rules enforced by the tool** (allow, ask, deny) | The tool | Hard limits on tool use | Rules about shell commands match the command **text**. The same program can be invoked in a form the rule does not match |
| **Scripts the tool runs** (hooks) | Your script | Deterministic checks and feedback | A check that fails to run can let the action through. They run with **your** access, and a string match can be sidestepped |
| **Isolation at the operating-system level** (sandbox) | The OS | Holds regardless of what the model chose | May be off by default, platform-dependent, and does not cover every tool |
| **Container or virtual machine** | The container runtime or hypervisor | A real boundary around the whole process | Only as strong as what you mount in, what network it has, and which credentials are in its environment |
| **Organization-managed settings** | An administrator | Individuals cannot override | Only covers what is deployed to the device |
| **Review and CI** | People and pipelines | Catches what slips through | Review fatigue. Small diffs get read; large ones get skimmed |

## A review standard for AI-authored code

A starting point. Adapt it to your policy.

Hold AI-authored code to **the same bar as any code**, plus:

1. **Evidence, not assertion.** The author shows test, lint and typecheck output, and says what was *not* tested.
2. **Read the test diff on its own.** Tests that were deleted, skipped or weakened are a finding.
3. **Scope matches the request.** Anything outside it needs a reason.
4. **Extra scrutiny for risky edges:** authorization, input validation, error paths, data access, secrets, logging, and anything that crosses a trust boundary.
5. **A second reviewer for sensitive files:** dependency manifests and lockfiles, CI and build configuration, the agent's own settings, hooks and tool-server configuration, and anything that runs on other people's machines.
6. **No secrets or personal data** in diffs, logs, prompts or generated documentation.
7. **Provenance and licensing** are recorded and checked the way your policy requires.
8. **A human is accountable.** Whoever approves the change owns it.

## Discussion prompts

- Which row of the control map is closest to being *only* an instruction to the agent? What would turn it into an enforced control?
- Which control depends on someone reading a prompt carefully every time? How long does that last?
- Which of your credentials can the agent's shell read right now?
- If the agent did something unexpected tomorrow, who would you tell, and what would you check first?
