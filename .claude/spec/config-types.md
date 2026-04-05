# Permanent Application Control Patterns

## Code Config, Deploy Config, and Runtime Config

### Code Config

*(Application constants, module-level constants, and function-level constants)*

#### Where it works

- Carefully engineered values, slow-to-discover values, and hard boundaries
- Safe defaults, including feature flag fallbacks
- Developer-owned values that require close engineering scrutiny
- Values that should pass through code review and CI validation
- Values with significant engineering consequences

#### Where it falls short

- Incident mitigation that requires immediate action
- Frequent tuning driven by internal decision-making or external conditions
- Values that depend on local context, such as personalization or architectural flexibility
- Settings that domain experts should be able to control directly
- Changes that should not require a ticket and a release
- Runtime variability, especially when in-code branching becomes difficult to manage

#### Trade-offs

- Changes consume engineering time and compete with other priorities
- Values can drift as the system evolves
- Non-engineers often have limited visibility into these values, so they can fade from attention

---

### Deploy-Time Config

*(Environment variables)*

#### Where it works

- Runtime variability for operationally critical values, such as credentials, provider settings, and sensitive defaults
- Stable environment identity across rollouts
- Controls owned by SRE or DevOps
- Emergency overrides and safe defaults, including cases where a dynamic config provider is unavailable
- Situations where deploy-time control is the intended operating model

#### Where it falls short

- Rapid iteration during incidents
- Response to market events
- Changes driven by internal strategic discussion
- Fine-grained targeting, including personalization and architectural tuning
- Large setting inventories with unclear ownership

#### Trade-offs

- Reliability is high during incidents, which makes ownership and monitoring especially important
- Many of the same concerns from code config and runtime config still apply

---

### Runtime Config

*(Permanent feature flags, database-backed values, KV stores)*

#### Where it works

- Fast reaction time, including mitigation without a deploy
- Controls owned by business or operational roles responding to market conditions and company strategy
- Scoped changes by tenant, region, host group, or request class
- Deep runtime personalization and architectural tuning
- Technical control, domain expert control, and, in some cases, broad democratization
- Iterative tuning of personalization and architectural posture
- Systems with strong visibility into downstream effects, ideally paired with circuit breakers

#### Where it falls short

- Rules that operators cannot easily understand
- Dynamic business logic that lacks clear structure for rule writers and runtime operators
- Systems where operators cannot clearly see context types, context properties, property values, and the intended effect of each variation
- Free-form editing with minimal validation
- High fan-out variations with weak visibility

#### Trade-offs

- Change can happen immediately, which improves coordination and shortens mitigation loops
- Mistakes can propagate just as quickly
- Coordination suffers when role boundaries are unclear, stakeholders are misaligned on policy changes, or governance degrades over time
- Audit trails and review processes become valuable when they are built into change management
- Strong role design, context design, and SDK integration practices capture many of the benefits while reducing downside

Governance matters here. Changes should move through approvals, controls should be classified carefully, and ownership of flag health should stay explicit.

---

## Discussion and Conclusions

The key shift is to treat configuration as part of an application's product surface. When configuration stays implicit and buried, decision-making ends up encoded in places that carry it poorly. Ownership becomes fuzzy. Changes become difficult to explain to the people affected. The fastest path to action often becomes the least visible one. Teams have historically followed that path because the primitives are convenient and close to the code, even when they do not match the kind of control the system needs.

LaunchDarkly approaches configuration as a first-class concern. The model includes clear scopes, explicit targeting, per-resource ownership, deep extensibility, and a comprehensive audit trail. That structure separates decision authority from software delivery. It also removes much of the bottleneck and opacity that come with code-level config and environment variables. Engineers can define the actions and modes available to the system. Other roles can set policies and shape the operational workflows they and their users need.

The result is greater speed and clarity across the company, a control surface that remains understandable as the system grows, and a stronger ability to tune product-market fit and stabilize behavior as conditions change.
