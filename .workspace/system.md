# The System

What we're building and how it works. This is the reference for our agreements and plans.

## What this is

An AI-human collaboration system where Claude and Steven work together on verblets
and on projects that use verblets. Claude is a collaborator with agency — it does
discovery, organizes its own work, asks questions, takes notes, and proposes automation.

**Verblets is an intelligence platform.** LLMs are functions. Functions compose.
`sort(items, "by strategic importance")` is a semantic comparator.
`filter(items, "keep what's genuinely surprising")` is a semantic predicate.
Intelligence emerges from composition, not from any single LLM call.

## How Claude integrates with verblets

**Not MCP.** Wrapping verblets as individual tools destroys functional composability.

**Claude writes verblets compositions.** Claude understands the library well enough to
write pipelines that combine chains — `map` → `sort` → `filter` → `reduce` — to
process data at scale. Claude decides at runtime which chains to use and how to wire them.

**Compositions are programs, not templates.** The right composition depends on the problem.
A publishability analysis might use `entities` to extract claims, `group` to find patterns,
`score` to rank discrepancies — or something else entirely. The chains are primitives;
the intelligence is in choosing how to wire them for each situation.

## The workspace (.workspace/)

A shared directory where both AI and human can store and organize files.

**Conventions:**
- Read, edit, or delete anything — nothing is precious
- `_` prefix = working files, safe to ignore
- Every file should be self-explanatory
- Derived files note their source (provenance) so deletion cascades logically
- The human can share content and later delete it; the AI adapts

**Key files:**
- `system.md` — this file. What we're building.
- `context.md` — what Claude knows about Steven and the project
- `priorities.md` — tracked items, ordered by what unblocks the most
- `conversations/` — archived conversation summaries
- `scripts/` — scripts Claude maintains (discovery, utilities)
- `discoveries/` — output from discovery runs

## The generative loop

```
content → analysis → rules → deterministic automation
                              ↓
                         (re-run cheaply at scale)
```

1. **Content**: Data comes in — files, git history, writing, conversation
2. **Analysis**: Verblets compositions process it into structured findings
3. **Rules**: Findings crystallize into deterministic checks, templates, validators
4. **Automation**: Rules run cheaply without LLM calls. Verblets reserved for genuinely
   semantic problems that can't be made deterministic.
5. Loop: automation output surfaces new content worth analyzing

## Principles

**Privacy as structure.** Deleting a source file should make it clear what derived
artifacts to also delete. This is mechanical, not policy.

**Conversation is the primary interface.** Don't dump 500-line reports. Surface key
findings here. Keep detailed artifacts in files for reference.

**Do more with less.** Process the minimum data needed. If 50 items reveal the pattern,
don't process 500. Respect the person's data and time.

**Supportive tone.** "I notice..." not "You should...". Observations, not judgments.
Tensions framed as something worth reflecting on, not as calling someone out.

**Quality embedded in architecture.** The ideas person should stay in idea mode.
Quality enforcement (testing, docs, API consistency) should be automatic.

**AI produces deterministic automation.** Many processes don't scale. AI changes that,
but expensively. The right approach: use AI to analyze and discover rules, then codify
those rules as deterministic checks that run cheaply at scale. AI that produces a linter
rule scales as well as AI that manually checks every file. Reserve semantic processing
for genuinely non-deterministic problems. This is how process automation becomes economical.

## The path forward

**Phase 1 (now):** Local workspace in the verblets repo. Claude writes compositions,
runs discovery, builds automation. File-based state persists across conversations.

**Phase 2 (future):** Evented system consuming webhooks. Ring buffer infrastructure
(already in verblets) handles event ingestion. Verblets processes incoming data.

**Phase 3 (future):** Multi-session messaging. Telegram/Slack adapters feed into the
system. Claude orchestrates verblets to process conversations, extract action items,
manage ongoing workflows. OpenClaw-style channel adapters.

## The real goal

Publish a coherent, ever-updated, always sharply tuned to good ideas version of verblets.
This is a library meant to make intelligence composable. It should embody its own philosophy:
quality through composition, not through manual discipline.
