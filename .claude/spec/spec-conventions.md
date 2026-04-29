# Spec Conventions

How to write and maintain specs. Applies to all `spec/*.md` files.

---

## Why Specs Exist

Complexity has three symptoms: change amplification (one change touches many places), cognitive load (you must know too much to act), and unknown unknowns (you can't tell what you need to change). Specs reduce all three by making the system's design decisions visible, concentrated, and navigable. A spec that doesn't reduce one of these is dead weight.

Specs describe properties of the system — what is always true, what is never true, what must hold for the system to be correct. They are not tutorials, not API documentation, not implementation checklists. The reader of a spec should be able to verify an implementation against it without seeing any other realization.

---

## Two-Layer Split

**Timeless** (`spec/<name>.md`): conceptual model. What and why. Leaves room for the implementer to exercise judgment. These age slowly. When the timeless layer changes, something fundamental shifted.

**Impl** (`spec/<name>.impl.md`): integration orientation. Key constraints, shapes, integration points. The implementer reads the code — this is orientation, not a checklist. These age at the pace of the codebase.

**Length:** prefer under 500 lines. Up to 1000 when the topic demands it. When a spec grows, break it into subtopic files grouped under the same family prefix rather than letting one file sprawl.

**Naming**: subprefix off existing spec families (`spec/embedding.rag.md`, not `spec/rag-query-rewriting.md`). A reader scanning the file list should understand the territory from names alone.

---

## Per-Spec Pragma

Each spec may include a `## Pragma` section near the top:

- **include:** topics this spec details
- **exclude:** topics this spec explicitly leaves unspecified
- **gray:** topics detailed only under stated conditions

Keep all three tight. A timeless spec and its impl companion may split topics differently.

---

## How Specs Communicate

### Constraints

Invariants that must hold. What is always true, never true, or conditionally true. The strongest specification technique — if you can state it as a constraint, do.

### Decision criteria

When the system offers alternatives, state the conditions that select between them. The implementer should be able to choose correctly from the criteria alone.

### Shape declarations

Tables or structured descriptions that ARE the contract — row shapes, field inventories, message types, token definitions. These are the specification, not illustrations of it. Label them as such.

### Corrective notes

Where this system differs from the expected pattern. State the default assumption, the divergence, and why. An implementer unfamiliar with the codebase will reach for standard patterns; the spec intercepts that before it happens. These are among the highest-value lines in any spec.

### Precedence and ordering

When multiple concerns interact, state resolution order explicitly. Never leave it to be inferred from the sequence in which topics appear.

### Why not examples

Examples bias implementation toward the single realization shown. The implementer copies the pattern rather than understanding the requirement. When structure needs conveying, use a shape declaration (defines the contract) rather than a sample (shows one instance). When behavior needs conveying, use constraints and decision criteria rather than a walkthrough.

The exception: syntax definitions. Showing the syntax itself is a shape declaration — it defines what is valid, not what is typical.

---

## Global Rules

Apply to every spec. Don't repeat in per-spec pragmas.

**Always:** why a decision was made (inline, not separate doc); what is deferred and why; where the system diverges from the conventional approach

**Never:** exhaustive enumerations where convention + a few shape declarations suffice; implementation code; examples as the primary carrier of a rule

**Gray:** error semantics — only when they are part of the contract, not incidental handling

---

## Spec Kinds

Generic kinds.

### Public Surface

What callers depend on. Contracts, composition rules, failure modes visible across the boundary.

**Timeless:** what the caller can rely on, what the caller must provide, how pieces compose, what breaks the contract. Decision criteria for choosing between alternatives the library offers.
**Impl:** concrete type signatures, wire formats, version compatibility.
**Corrective notes are critical here** — where the public surface differs from similar libraries in the same space, an implementer *will* reach for the wrong pattern.

### Internal Structure

Module boundaries, layering, dependency direction. What each layer owns and what it must not touch.

**Timeless:** separation principles, dependency direction constraints, isolation boundaries.
**Impl:** directory conventions, module resolution, build boundaries.
**Key technique:** layering rules as constraints (A never imports B). Decision criteria for where new code belongs.

### Composition and Extension

How the system is extended, plugged into, or composed with external concerns.

**Timeless:** extension points, composition model (what composes with what), integration boundaries, what the system takes responsibility for vs. what it delegates.
**Impl:** registration mechanisms, lifecycle hooks, concrete interface shapes.
**Key constraint:** a general-purpose interface with focused responsibility enables many-to-many composition. Framework-like interfaces (one-to-many) limit expressiveness.

### Configuration

How behavior is customized — resolution hierarchies, defaults, environment adaptation.

**Timeless:** what wins when multiple sources disagree (precedence as constraint), what is configurable vs. fixed, default philosophy.
**Impl:** option shapes, environment detection, config object structure.

### Error Model

How failure works — when to crash, when to degrade, what the caller sees.

**Timeless:** failure philosophy (crash vs. degrade vs. recover), what the caller must handle, what the system absorbs. Decision criteria for error strategy selection.
**Impl:** error types, recovery mechanisms, retry boundaries.
**Corrective note:** if the system's error philosophy differs from the defensive-programming default (and it usually does), state this prominently.

### Testing Strategy

What kinds of tests exist, what each proves, where the boundaries are.

**Timeless:** test taxonomy as a decision tree (given what you want to verify, which kind). What each kind is responsible for proving. What is explicitly not tested and why.
**Impl:** framework conventions, mock boundaries, naming.

---

## Anti-Patterns

- Examples as the primary carrier of a rule
- Specs that read like implementation checklists
- Enumerating where a naming convention suffices
- Duplicating API docs or READMEs
- Leaving rules implicit inside tables — state the constraint, then show the shape
- Specifying UI widgets instead of interaction goals
- Tactical specs — describing what was built rather than what should be true
