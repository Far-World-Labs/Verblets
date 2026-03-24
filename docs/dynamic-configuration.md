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

The `operation` string on config identifies what the system is currently doing. It's set by `initChain` or `nameStep` when a chain starts, and it composes hierarchically with `/` — so `'moderation/healthcare'` tells you you're in the healthcare branch of the moderation pipeline. It travels with the config through the pipeline so that every decision point can see where it is in the call graph.

The function on `config.policy.strictness` is a policy function. When `getOption` looks up `'strictness'`, it finds this function and calls it, passing the `operation` string. The function checks the operation prefix, sees `'moderation/healthcare'`, and returns `'high'`. That's the value the caller gets.

Here's the flow in full:

1. A chain sets `operation` via `initChain('moderation/healthcare', config)`
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

Consider content moderation strictness. Legal requires a minimum floor — nothing below `'standard'` for regulated clients. Product prefers a lighter experience for engaged users. Trust and safety wants elevated scrutiny for flagged accounts. Each role manages their own flag, but all three flags feed into one decision.

`valueArbitrate` takes these competing signals and produces a single answer:

```javascript
import { valueArbitrate } from '@far-world-labs/verblets';
import { OpenFeature } from '@openfeature/server-sdk';

const flags = OpenFeature.getClient();

const level = await valueArbitrate(
  [
    {
      name: 'legal-floor',
      value: (ctx) => flags.getStringValue('legal-strictness-floor', 'standard', ctx),
      strictness: 'must',
    },
    {
      name: 'product-preference',
      value: (ctx) => flags.getStringValue('product-strictness-pref', 'minimal', ctx),
      strictness: 'may',
      weight: 0.3,
      prompt: 'lighter touch for engaged users who rarely trigger violations',
    },
    {
      name: 'trust-safety',
      value: (ctx) => flags.getStringValue('trust-safety-level', 'standard', ctx),
      strictness: 'may',
      weight: 0.6,
      prompt: 'this account segment has elevated risk indicators',
    },
  ],
  { targetingKey: tenantId, plan: 'enterprise', riskScore: 0.7 },
  ['minimal', 'standard', 'strict', 'maximum']
);
```

Each signal has a `value` function that calls its own flag. The second argument is context shared across all signals. The third argument is the set of possible values, ordered from least restrictive to most restrictive.

There are two kinds of signals:

A **must** signal is a hard constraint. Legal's floor of `'standard'` means nothing below `'standard'` is acceptable, regardless of what anyone else recommends. If multiple must-signals exist, the most restrictive one wins. This resolution is purely deterministic — no AI involved.

A **may** signal is a preference. Product wants `'minimal'`, trust-and-safety wants `'strict'`. They carry different weights and explanations. When the must-floor has been enforced and multiple may-signals still disagree about which remaining option to pick, an LLM reads the signal names, weights, and explanations to mediate.

Many situations resolve without an AI call at all: when the must-floor leaves only one option, when all may-signals agree, or when no may-signals fall within the allowed range. AI mediation happens only when there's a genuine judgment call — competing preferences that all have legitimate standing.

Each role still manages their own flag in the flag service. The arbitration happens at evaluation time, combining those independently managed values into a coherent decision. Legal doesn't need to know what product's preference is. Product doesn't need to know about trust-and-safety's risk indicators. They each control their piece, and the arbitration combines them.

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

The result is a JSON schema where each attribute becomes a constrained enum property. You can pass it to an LLM as a `response_format`, and one call populates all the attributes at once — each value guaranteed to be from its defined set.

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

The option history analyzer collects decision traces and generates targeting rules from the patterns it finds:

```javascript
import { createOptionHistoryAnalyzer } from '@far-world-labs/verblets';

const analyzer = createOptionHistoryAnalyzer({
  bufferSize: 1000,
  lookback: 200,
});
```

Wire its `observe` method into `onProgress`, and it automatically captures decision traces from the telemetry event stream — every `option:resolve` and `llm:model` event becomes a trace in the ring buffer:

```javascript
const config = {
  policy,
  onProgress: analyzer.observe,
};

const { value } = await getOptionDetail('strictness', config, 'low');
// The option:resolve telemetry event was observed and traced
```

If you have other `onProgress` consumers, compose them:

```javascript
const config = {
  onProgress: (event) => {
    analyzer.observe(event);
    myMetricsConsumer(event);
  },
};
```

Each trace captures which option was resolved, where the value came from (policy, config, or fallback), and the operation that was active at the time. Traces accumulate across requests. When you want suggestions, ask:

```javascript
const rules = await analyzer.analyze(
  'Which options are falling back to defaults most often?'
);
```

The analyzer sends accumulated traces to an LLM and gets back targeting rules in clause format — the same structure flag services use:

```javascript
[
  {
    clauses: [
      { attribute: 'domain', op: 'in', values: ['healthcare'] },
    ],
    option: 'thoroughness',
    value: 'high',
    reasoning: 'Healthcare-domain requests consistently fell back to the default — no policy covers thoroughness for this domain',
  },
]
```

Each rule says: when these conditions match, set this option to this value. The `clauses` array uses operators like `in`, `startsWith`, `contains`, `lessThan`, and `greaterThan`. All clauses in a rule must match for the rule to apply. This is the same shape you'd configure in a flag service — the suggestion is directly actionable.

A rule like the one above could become a new targeting rule in OpenFeature: when `domain` is `healthcare`, serve `'high'` for `analysis-thoroughness`. Or it could become a new policy function, or a static config value. The analyzer surfaces the pattern; a person (or an automation) decides what to do with it.

Traces are stored in a fixed-size circular buffer — new traces overwrite the oldest ones, so memory stays bounded. Analysis only happens when you call it. You control the cadence: on a schedule, after a batch of requests, or during an investigation.

You can also write traces manually for decisions that happen outside the option system:

```javascript
analyzer.write({
  option: 'provider',
  operation: 'route',
  source: 'policy',
  value: 'fallback-provider',
});
```

A callback receives rules as they're generated:

```javascript
const analyzer = createOptionHistoryAnalyzer({
  onRules: (rules) => {
    for (const r of rules) {
      console.log(`[${r.option}] ${r.clauses.length} clauses → ${r.value}`);
    }
  },
});
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

**`createOptionHistoryAnalyzer`** collects decision traces over time and generates targeting rules from the patterns — missing coverage, surprising defaults, opportunities to add rules in your flag service or policy functions. Rules come back in clause format, directly actionable in a flag service.
