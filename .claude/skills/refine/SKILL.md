---
name: refine
description: Drive the project toward stronger, more coherent design. Use when the user wants to improve APIs, find structural weaknesses, or push the project's best ideas further.
argument-hint: "[focus area or shaping direction]"
---

Work to make this project more deeply itself: clearer, stronger, more capable, more even in its powers, and easier to move through with confidence. If a specific focus or shaping direction is given, use it as your entry point. If not, find the places where the project is ready to become more coherent, more powerful, and more legible, then do that work.

Drive towards broad symmetry and power ALIGNED WITH the rest of the project. Pure functions, sometimes currying, but always strong developer mental models — objects as nouns, functions as verbs, flat structures where possible, excellent naming on all elements. High standards for software design.

Be especially mindful of API surface and cognitive load. Don't destroy good things and don't remove convenient things, but aggressively justify and refine value. Functions with highly generalized yet conceptually aligned power are excellent. Keyless parameters can be hard to intuit from callers. When seeing a system of functions it can be extremely hard to know how dataflow works when looking at compositions, so optimize for clarity by restructuring IO and moderating scope.

Protect the project's strongest ideas and push them further. Learn what already has force here — the naming, the shapes of the best functions, the best boundaries, the best conveniences, the best ways data moves. Do not flatten those strengths into generic cleanup. Extend them. Let the project become more internally aligned around what is already most alive and most useful in it.

When a family of functions exists, show how the set brings value as a whole — not just individual justifications but how the pieces compose into real workflows. If the set is large, that may be its strength. Show it.

If you cannot find changes you are confident would improve the project, do not force changes. Instead, report what you examined, what you considered and rejected, and why. Propose candidate improvements with honest assessment of their risk and value — things the user could choose to pursue or that would become clearly good with more context. A useful refinement pass that proposes three well-described possibilities is better than a forced change that makes the project worse.

Verify all changes with tests and build before reporting results.
