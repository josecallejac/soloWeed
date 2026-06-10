# BRIEFING — 2026-06-09T15:36:00-04:00

## Mission
Standardize and identify misspelled or inconsistent brand names across the database via a dry-run script.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: E:\soloWeed\.agents\orchestrator_clean_brands
- Original parent: main agent
- Original parent conversation ID: f99ca409-3289-4d53-8852-dffc7b8b50ce

## 🔒 My Workflow
- Pattern: Project Pattern
- Scope document: E:\soloWeed\.agents\orchestrator_clean_brands\PROJECT.md
1. **Decompose**: Decompose the task into milestones (exploration, script creation, verification, audit/reporting).
2. **Dispatch & Execute** (pick ONE):
   - **Direct (iteration loop)**: Spawn Explorer, Worker, Reviewer, Challenger, Auditor to execute.
   - **Delegate (sub-orchestrator)**: Spawn sub-orchestrator (not needed since the task fits one cycle).
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Succession at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Explore database brands [pending]
  2. Implement scripts/clean-brands.ts [pending]
  3. Review and Verify script correctness and dry-run output [pending]
  4. Perform Forensic Audit to ensure database was not modified [pending]
- **Current phase**: 1
- **Current focus**: Explore database brands

## 🔒 Key Constraints
- Never write, modify, or create source code files directly.
- Never run build/test commands yourself — require workers to do so.
- You may use file-editing tools only for metadata/state files (.md) in your .agents/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: f99ca409-3289-4d53-8852-dffc7b8b50ce
- Updated: not yet

## Key Decisions Made
- Use Project Pattern directly on the task since it is simple/medium scope.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_explore_1 | teamwork_preview_explorer | Explore database brands and identify duplicates | completed | dbed3a98-f67b-4788-8d74-26704c7d0acf |
| worker_implement_1 | teamwork_preview_worker | Implement scripts/clean-brands.ts dry-run script | completed | 003e5a98-2fd8-4085-9c97-f98cbd8f6507 |
| reviewer_verify_1 | teamwork_preview_reviewer | Review scripts/clean-brands.ts code quality and lint | completed | c40affd8-16ab-4917-a1cc-75e8e3192b02 |
| challenger_verify_1 | teamwork_preview_challenger | Execute scripts/clean-brands.ts and verify DB is unmodified | completed | c2a171f8-247c-484a-bfd2-b75ecac48e6c |
| auditor_check_1 | teamwork_preview_auditor | Perform Forensic Audit to ensure database integrity is clean | completed | 8841c81c-2e4a-44f4-8408-39df5a4c9764 |

## Succession Status
- Succession required: no
- Spawn count: 5 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: none
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- E:\soloWeed\.agents\orchestrator_clean_brands\BRIEFING.md — My persistent working memory
- E:\soloWeed\.agents\orchestrator_clean_brands\progress.md — Liveness signal and task progress tracking
- E:\soloWeed\.agents\orchestrator_clean_brands\PROJECT.md — Global index for project milestones and architecture
