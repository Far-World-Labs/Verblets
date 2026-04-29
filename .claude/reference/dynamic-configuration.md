# Configuration with AI

Imagine you're building a content moderation pipeline. You have a function that filters user-submitted text — it checks for policy violations, scores severity, and decides what to let through. You've tuned it to be moderately strict, and it works well for most of your users.

Then your company signs a healthcare client. Suddenly "moderately strict" isn't good enough for their traffic. Medical content needs tighter filtering. You could add an `if` statement, but next month there's a financial services client, and then an education platform with different needs again. The strictness level isn't really a constant — it depends on who's using the system and what they're doing with it.

This is the configuration problem. Every interesting piece of software has knobs that should turn differently depending on the situation. Most configuration systems handle the storage and delivery of those values well. What they handle less well is the surrounding work: figuring out what the right value should be for a given situation, expressing complex rules without drowning in `if/else` branches, reconciling disagreements when multiple people have opinions about the same knob, and understanding after the fact why the system chose what it chose.

This guide walks through a set of utilities that bring AI into those harder parts of configuration. They layer on top of whatever you already use to store and deliver config values.

---

## Starting simple: passing a value

The most basic thing you can do is pass a value and have the system respect it.

```javascript
import { getOption } from '@far-world-labs/verblets';

const config = { strictness: 'high' };

const strictness = await getOption('strictness', config, 'low');
// => 'high'
```

`getOption` looks for `'strictness'` on the config object and finds `'high'`. If it hadn't found anything, it would have returned `'low'` — the fallback you provide as the third argument. That's the whole thing. A lookup with a default.

The values themselves are simple words. Most options in this library use `'low'`, `'med'`, and `'high'`. What those words mean depends on what's reading them. A text filter interprets `'high'` strictness as a tighter acceptance threshold. An analysis function interprets `'high'` thoroughness as more passes over the data. The vocabulary is shared; the meaning is local.

This is enough when the right answer is the same every time. Set `strictness: 'high'` and every request gets high strictness. For a single healthcare client with a single use case, that might be all you need.

---

## Making it depend on context

It stops being enough when different requests need different answers. Your healthcare client needs high strictness, your education client is fine with medium, and internal test traffic should use low strictness so it runs faster.

You could branch on the client name in your application code, but that scatters configuration logic across the codebase. Instead, you can put a function on the config that decides at the moment the value is needed:

```javascript
import { getOption } from '@far-world-labs/verblets';

const config = {
  policy: {
    strictness: (operation) => {
      if (operation.startsWith('moderation/healthcare')) return 'high';
      if (operation.startsWith('moderation/education')) return 'med';
      return 'low';
    },
  },
  operation: 'moderation/healthcare',
};

const strictness = await getOption('strictness', config, 'low');
// => 'high'
```

There are two new things here, and they work together.

The `operation` string on config identifies what the system is currently doing. It's set by `nameStep` when a chain starts, and it composes hierarchically with `/` — so `'moderation/healthcare'` tells you you're in the healthcare branch of the moderation pipeline. It travels with the config through the pipeline so that every decision point can see where it is in the call graph.

The function on `config.policy.strictness` is a policy function. When `getOption` looks up `'strictness'`, it finds this function and calls it, passing the `operation` string. The function checks the operation prefix, sees `'moderation/healthcare'`, and returns `'high'`. That's the value the caller gets.

Here's the flow in full:

1. A chain sets `operation` via `nameStep('moderation/healthcare', config)`
2. `getOption('strictness', config, 'low')` finds `config.policy.strictness` and calls it with the operation string
3. The policy function returns `'high'`
4. The caller receives `'high'`

If the policy function returns `undefined` or throws an error, `getOption` falls through — first to a static value on the config object, then to the fallback default. Policy functions can be partial. They handle the cases they know about and let everything else fall through safely.

---

## Connecting to a flag service

The policy function above uses `if/else` to decide. That works, but it means a developer has to change code every time the rules change. A feature flag service lets you move those decisions out of the codebase so that different roles — product, legal, operations — can control their own pieces.

A policy function is a natural place to call a flag service. Targeting context — the domain, tenant, plan, and other attributes that a flag service needs — doesn't belong on the config object. Instead, curry it into the policy function at the definition site, where that information is naturally available:

```javascript
import { OpenFeature } from '@openfeature/server-sdk';
import { getOption } from '@far-world-labs/verblets';

const flags = OpenFeature.getClient();

// Targeting context is curried at the policy definition site
const targeting = { domain: 'healthcare', tenant: 'acme-health', plan: 'enterprise' };

const config = {
  policy: {
    strictness: (operation) =>
      flags.getStringValue('content-strictness', 'med', {
        targetingKey: targeting.tenant,
        domain: targeting.domain,
        plan: targeting.plan,
      }),
  },
};

const strictness = await getOption('strictness', config, 'low');
```

The policy function receives the `operation` string — which identifies what the system is doing — and uses the curried targeting context to query OpenFeature. The flag service evaluates its rules and returns a value. `getOption` receives that value the same way it would receive a hardcoded `'high'` or the result of an `if/else` branch.

This separation is deliberate. The operation string flows through the chain pipeline and tells policy functions where they are in the call graph. Targeting context (who the user is, what domain they're in) is fixed for a given request and belongs at the boundary where policy functions are defined — not threaded through every chain call.

This is where configuration starts to become a shared control surface. Different people in the organization can manage different flags:

```javascript
const targeting = { domain: 'healthcare', tenant: 'acme-health', plan: 'enterprise' };

const config = {
  policy: {
    // Legal sets a compliance floor — they own this flag
    strictness: (operation) =>
      flags.getStringValue('compliance-strictness', 'med', {
        targetingKey: targeting.tenant,
        domain: targeting.domain,
      }),

    // Product controls how much analysis effort to spend — they own this flag
    thoroughness: (operation) =>
      flags.getStringValue('analysis-thoroughness', 'med', {
        targetingKey: targeting.tenant,
        plan: targeting.plan,
      }),
  },
};
```

Legal manages the `compliance-strictness` flag. They can set it to `'high'` for all healthcare tenants, `'med'` for education, and leave everything else at the default. Product manages `analysis-thoroughness`. They can turn it up for enterprise plans and down for free-tier users. Neither team touches the other's flag. Neither team touches the code. The curried targeting context carries the facts, the flag service applies the targeting rules, and the policy functions bridge the two.

The config system doesn't know or care that OpenFeature is involved. As far as `getOption` is concerned, a policy function is a policy function. You can mix approaches freely — some options driven by flags, some by `if/else`, some by static values on the config:

```javascript
const config = {
  policy: {
    strictness: (operation) => flags.getStringValue('compliance-strictness', 'med', targeting),
  },
  thoroughness: 'high',  // static, no function needed
};
```

---

## When the rules outgrow what people can manage

Flag services are good at delivering values based on targeting rules that people write and maintain. As the number of options, contexts, and client segments grows, though, the work of writing and updating those rules grows with it. A healthcare client on an enterprise plan in the EU might need different strictness than a healthcare client on a free plan in the US. Financial content from a regulated institution needs different handling than financial content from a fintech startup. Each new dimension multiplies the number of rules someone has to think through.

AI can help in two ways here. It can take over the per-request classification work that would otherwise require dense targeting rules. And it can watch what the system is doing and suggest new rules for the flag service — closing the loop between observed behavior and policy.

A policy function that calls an LLM is just a function that classifies the current context. The `enums` verblet (aliased as `classify` below) picks one value from a set based on a natural-language prompt — exactly what a policy function needs to do:

```javascript
import { enums as classify, getOption } from '@far-world-labs/verblets';

const instruction =
  'Healthcare and financial content requires high strictness. ' +
  'Education and entertainment content should use medium. ' +
  'Internal test traffic and free-tier sandbox usage should use low.';

const config = {
  policy: {
    strictness: (operation) =>
      classify(
        `${instruction}\n\nOperation: ${operation}, targeting: ${JSON.stringify(targeting)}`,
        { low: 'low', med: 'med', high: 'high' }
      ),
  },
};

const strictness = await getOption('strictness', config, 'low');
// The LLM reads the instruction, sees domain: 'healthcare', returns 'high'
```

Each time `getOption` runs, the policy function makes an LLM call. The same instruction adapts to whatever targeting context and operation it receives — because the LLM interprets the rules against the current situation.

This is a plain function. You can share the instruction across options, use different value sets per option, or add any other logic you need. There's no special API to learn — if you can write a function that returns a string, you can write an AI-powered policy function.

---

## Knowing why a value was chosen

Once configuration becomes contextual — different values for different situations — debugging gets harder. A user reports that their content was filtered too aggressively. Was it the policy function? A static override? The default? You need to know where the value came from.

`getOptionDetail` works exactly like `getOption`, but it also returns a record of how the decision was made:

```javascript
import { getOptionDetail } from '@far-world-labs/verblets';

const config = {
  policy: {
    strictness: (operation) => operation.startsWith('moderation/healthcare') ? 'high' : undefined,
  },
  operation: 'moderation/healthcare',
};

const { value, detail } = await getOptionDetail('strictness', config, 'low');
// value => 'high'
// detail.source => 'policy'
// detail.policyReturned => 'high'
// detail.operation => 'moderation/healthcare'
```

The `source` tells you which of the three lookup steps provided the value:

- `'policy'` — a policy function ran and returned something
- `'config'` — a static value was found on the config object
- `'fallback'` — neither policy nor config had an answer, so the default was used

When a policy function throws an error, the detail captures the error message and the system falls back gracefully:

```javascript
// If the policy function throws: Error('provider down')
// detail.source => 'fallback'
// detail.error => 'provider down'
// value => the fallback default
```

This record is useful on its own for debugging. It becomes more useful when you start collecting these records, which is what the option history analyzer does (covered later in this guide).

---

## Resolving disagreements between stakeholders

In the flag service example above, legal owns one flag and product owns another. That works when the flags govern separate options. It gets harder when multiple roles have opinions about the *same* option.

Suppose you run an AI document-processing service. Enterprise customers can submit contracts, medical records, financial statements. Your verification friction — how much the system double-checks its extractions before returning results — is a real trade-off. More verification catches more errors but costs more time, more compute, and more money per document.

Three teams manage their own flag for this:

- **Compliance** requires that HIPAA-regulated documents always get at least `'thorough'` verification. This isn't a preference — it's a regulatory floor. They manage a flag that returns the minimum acceptable level per compliance regime.
- **Product** wants fast turnaround for trial users running their first batch. They manage a flag that reflects the current product strategy: lighter verification for onboarding, heavier for retained customers processing high-value documents.
- **SRE** watches provider health. When the primary extraction model is degraded, they bump verification up to catch the increased error rate. They manage a flag tied to their monitoring stack.

Each team manages their flag independently. But all three feed into one decision: how much verification does *this* document get?

```javascript
import { valueArbitrate } from '@far-world-labs/verblets';
import { OpenFeature } from '@openfeature/server-sdk';

const flags = OpenFeature.getClient();

const verification = await valueArbitrate(
  [
    {
      name: 'compliance-floor',
      value: (ctx) => flags.getStringValue('compliance-verification-floor', 'standard', ctx),
      strictness: 'must',
    },
    {
      name: 'product-strategy',
      value: (ctx) => flags.getStringValue('product-verification-pref', 'light', ctx),
      strictness: 'may',
      weight: 0.4,
      prompt: 'trial users processing their first batch — minimize friction to show value quickly',
    },
    {
      name: 'provider-health',
      value: (ctx) => flags.getStringValue('sre-verification-level', 'standard', ctx),
      strictness: 'may',
      weight: 0.7,
      prompt: 'primary extraction model is returning elevated error rates — compensate with more verification',
    },
  ],
  { targetingKey: tenantId, compliance: 'hipaa', plan: 'trial', providerStatus: 'degraded' },
  ['light', 'standard', 'thorough', 'maximum']
);
```

The values array is ordered from least to most restrictive. Each signal's `value` function calls its own flag — the caller owns how the value is sourced. Context is shared across all signals so each flag service can target on the same attributes.

There are two kinds of signals:

A **must** signal is a hard constraint. Compliance's floor of `'thorough'` for HIPAA documents eliminates `'light'` and `'standard'` from consideration, regardless of what anyone else recommends. If multiple must-signals exist, the most restrictive one wins. This is purely deterministic — no AI involved.

A **may** signal is a preference. Product wants `'light'` (but that's below the compliance floor, so it's out). SRE wants `'thorough'`. If multiple may-signals disagree about which remaining option to pick, an LLM reads their names, weights, and explanations to mediate.

Most situations resolve without an AI call: the compliance floor leaves only one option, the may-signals agree, or no may-signals have opinions in the remaining range. AI mediation happens only when there's a genuine judgment call — competing preferences that each have legitimate standing within the constrained space.

Compliance doesn't need to know about SRE's provider health monitoring. Product doesn't need to know about compliance regimes. SRE doesn't need to know about the onboarding strategy. Each team controls their piece. The arbitration combines them at evaluation time.

---

## Defining context attributes

Good configuration depends on clean inputs. If your policy functions are reading raw request headers or user profile fields, small changes to those inputs can break your rules. It helps to define an explicit translation step where messy inputs become stable, well-defined categories.

An attribute descriptor captures one of those categories as a plain object:

```javascript
const healthSignal = {
  attribute: 'healthSignal',
  values: ['healthy', 'frustrated', 'at-risk'],
  instruction: 'Classify based on support ticket volume, response sentiment, and escalation patterns',
};
```

This describes an attribute called `healthSignal` that can take one of three values. The instruction explains how to decide which value applies. It's data, not code — you can store it in version control, review it in a pull request, and share it across services.

When you have several attributes, `descriptorToSchema` turns them into a structured output schema that an LLM can fill in:

```javascript
import { descriptorToSchema } from '@far-world-labs/verblets';

const riskClass = {
  attribute: 'riskClass',
  values: ['low', 'medium', 'high'],
  instruction: 'Classify based on usage trends, payment history, and contract renewal proximity',
};

const schema = descriptorToSchema({ healthSignal, riskClass });
```

The result is a JSON schema where each attribute becomes a constrained enum property. You can pass it to an LLM as a `responseFormat`, and one call populates all the attributes at once — each value guaranteed to be from its defined set.

### When multiple classifiers assess the same attribute

You might run the same customer data through multiple classifiers — one tuned for support signals, another for behavioral analytics. Both produce a `healthSignal` value from the same vocabulary, but they can disagree. The support classifier sees a spike in tickets and says `'at-risk'`. The behavioral classifier sees steady engagement and says `'healthy'`.

`valueArbitrate` resolves this the same way it resolves competing stakeholder opinions — each classifier is a signal with its own weight and reasoning:

```javascript
import { enums as classify, valueArbitrate } from '@far-world-labs/verblets';

const healthValues = ['healthy', 'frustrated', 'at-risk'];

const healthSignal = await valueArbitrate(
  [
    {
      name: 'support-classifier',
      value: () =>
        classify(
          `Classify customer health from support data: ${JSON.stringify(supportData)}`,
          Object.fromEntries(healthValues.map((v) => [v, v]))
        ),
      strictness: 'may',
      weight: 0.7,
      prompt: 'Based on support ticket volume, response sentiment, and escalation patterns',
    },
    {
      name: 'behavior-classifier',
      value: () =>
        classify(
          `Classify customer health from usage data: ${JSON.stringify(usageData)}`,
          Object.fromEntries(healthValues.map((v) => [v, v]))
        ),
      strictness: 'may',
      weight: 0.3,
      prompt: 'Based on login frequency, feature adoption, and session duration trends',
    },
  ],
  {},
  healthValues
);
```

When both classifiers agree, the answer is returned without an AI call. When they disagree, the arbitrator reads each signal's weight and description to mediate. The `healthValues` array is ordered from least to most concerning — if you added a compliance requirement as a `'must'` signal with a floor of `'frustrated'`, no classifier could pull the result below that floor.

---

## Suggesting targeting rules from decision traces

With flag services, AI-powered policy functions, and `valueArbitrate` all contributing to configuration decisions, the system's behavior becomes harder to predict by reading code or flag rules alone. An option's effective value for a given request depends on which policy function ran, what the flag service returned, what operation was active, and whether anything fell back to a default. Understanding what's actually happening across your user base requires looking at the decisions themselves.

Three pieces compose to close this loop: a trace collector, a targeting rule AST, and a verblet that suggests rules from traces.

### Collecting traces

`createTraceCollector` is a pure data structure backed by a ring buffer. Wire its `observe` method into `onProgress`, and it captures every `option:resolve` and `llm:model` event as a trace:

```javascript
import { createTraceCollector } from '@far-world-labs/verblets';

const collector = createTraceCollector({ bufferSize: 1000 });

const config = {
  policy,
  onProgress: collector.observe,
};
```

Compose with other consumers if needed:

```javascript
const config = {
  onProgress: (event) => {
    collector.observe(event);
    myMetricsConsumer(event);
  },
};
```

Each trace records which option was resolved, where the value came from (policy, config, or fallback), and the active operation. Write traces manually for decisions outside the option system:

```javascript
collector.write({
  option: 'provider',
  operation: 'route',
  source: 'policy',
  value: 'fallback-provider',
});
```

### Suggesting rules

When you want suggestions, pull traces from the collector and pass them to `suggestTargetingRules`:

```javascript
import { suggestTargetingRules } from '@far-world-labs/verblets';

const traces = collector.lookback(200);
const rules = await suggestTargetingRules(
  traces,
  'Which options are falling back to defaults most often?'
);
```

The traces can come from anywhere — a collector, a database query, a log file. The verblet makes a single LLM call and returns targeting rule AST nodes:

```javascript
[
  {
    clauses: [
      { attribute: 'domain', op: 'in', values: ['healthcare'] },
    ],
    option: 'thoroughness',
    value: 'high',
    reasoning: 'Healthcare-domain requests consistently fell back to the default',
  },
]
```

### Targeting rule AST

The rule shape is system-agnostic. Each rule is a conjunction of clauses — all must match for the rule to apply. Operators: `in`, `startsWith`, `endsWith`, `contains`, `lessThan`, `greaterThan`.

The same AST projects into whatever targeting system you use. Evaluate rules directly against a context object:

```javascript
import { evaluateTargetingRule, applyFirstTargetingRule } from '@far-world-labs/verblets';

const context = { domain: 'healthcare', plan: 'enterprise' };

// Single rule
evaluateTargetingRule(rules[0], context); // true

// First matching rule across a set
applyFirstTargetingRule(rules, context);
// → { option: 'thoroughness', value: 'high' }
```

Or project the rules into an external system — a flag service targeting rule, a policy function, a SQL WHERE clause. The AST carries the structure; you choose the projection.

Constructors and validation are available for building rules programmatically:

```javascript
import { targetingClause, targetingRule, validateTargetingRules } from '@far-world-labs/verblets';

const r = targetingRule(
  [targetingClause('domain', 'in', ['healthcare'])],
  'thoroughness',
  'high',
  'Regulated domain needs deeper analysis'
);

const errors = validateTargetingRules([r]); // undefined if valid
```

---

## Summary

These utilities form a progression. Each layer is independent — you can stop at whichever level of sophistication your situation calls for.

**Static values** are the starting point. Put a value on the config, and the system uses it. No functions, no services.

**Policy functions** make values depend on context. They receive the operation string — which identifies what the system is doing — and return a value. Targeting context (domain, tenant, plan) is curried at the policy definition site. Policy functions can contain `if/else` logic, call a flag service like OpenFeature, query a database, or do anything else that returns a string.

**Flag services** let different roles manage different options. Legal owns their flag, product owns theirs, operations owns theirs. Policy functions bridge the flag service into the option system, using curried targeting context as flag attributes and the operation string for call-graph awareness.

**AI policy functions** use `classify` (the `enums` verblet) to evaluate natural-language rules against the current operation and targeting context at runtime. When the rules are too nuanced for targeting rules or too fast-changing for code, describe the intent in a prompt and let an LLM classify each situation.

**`valueArbitrate`** resolves disagreements when multiple roles have opinions about the same option. Hard constraints are enforced deterministically. Competing preferences are mediated by AI.

**Attribute descriptors** define context categories as reviewable data — the name, the allowed values, and the classification instruction. `descriptorToSchema` turns them into structured output schemas. When multiple sources propose overlapping definitions, `valueArbitrate` picks the winner.

**`getOptionDetail`** returns the value plus a record of how it was decided — which source provided it, what the policy returned, whether anything went wrong.

**`createTraceCollector`** + **`suggestTargetingRules`** close the feedback loop. The collector captures decision traces over time; the verblet analyzes them and suggests targeting rules as AST nodes — missing coverage, surprising defaults, opportunities to add rules. The AST projects into whatever system you use: flag services, policy functions, or static config.
