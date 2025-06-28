# Verblets

Verblets is an LLM-aware standard library that provides AI-powered utilities for transforming natural language and structured data into reliable outputs. Each function leverages language model intelligence while constraining outputs to ensure software reliability.

## Repository Guide

### Quick Links

- [Chains](./src/chains/) - AI-powered workflows and operations
- [Verblets](./src/verblets/) - Core AI utility functions
- [Library Helpers](./src/lib/) - Utility functions and wrappers
- [Prompts](./src/prompts/) - Reusable prompt templates
- [JSON Schemas](./src/json-schemas/) - Data validation schemas

## Verblets

### Primitives

Primitive verblets extract basic data types from natural language with high reliability. They constrain LLM outputs to prevent hallucination while handling the complexity of human expression.

- [bool](./src/verblets/bool) - interpret text as true/false decisions
- [enum](./src/verblets/enum) - map text to predefined options
- [number](./src/verblets/number) - extract numeric values from text
- [number-with-units](./src/verblets/number-with-units) - parse numbers with units and conversions
- [date](./src/chains/date) - return Date objects from natural language prompts

### Lists

List operations transform, filter, and organize collections using natural language criteria. They handle both individual items and batch processing for datasets larger than a context window. Many list operations support bulk operation with built-in retry. Many have alternative single invocation versions in the verblets directory.

- [central-tendency](./src/chains/central-tendency) - evaluate categories with cognitive science methods
- [filter](./src/chains/filter) - filter lists via batch processing
- [find](./src/chains/find) - find the top match in a given dataset via batch processing
- [group](./src/chains/group) - group datasets via batch processing
- [map](./src/chains/map) - map over lists via batch processing
- [reduce](./src/chains/reduce) - reduce lists via batch processing
- [score](./src/chains/score) - score lists with calibrated examples via batch processing
- [intersections](./src/chains/intersections) - find intersections for all combinations
- [list](./src/chains/list) - generate contextual lists from prompts
- [list-expand](./src/verblets/list-expand) - generate additional similar items
- [sort](./src/chains/sort) - order lists by any describable criteria

### Content

Content utilities generate, transform, and analyze text while maintaining structure and meaning. They handle creative tasks, system analysis, and privacy-aware text processing.

- [anonymize](./src/chains/anonymize) - scrub personal details from text
- [category-samples](./src/chains/category-samples) - generate diverse examples for any category
- [collect-terms](./src/chains/collect-terms) - extract difficult vocabulary
- [commonalities](./src/verblets/commonalities) - find common threads and shared traits between items
- [conversation](./src/chains/conversation) - orchestrate multi-turn AI conversations with configurable policies
- [disambiguate](./src/chains/disambiguate) - resolve ambiguous word meanings using context
- [dismantle](./src/chains/dismantle) - break systems into components
- [filter-ambiguous](./src/chains/filter-ambiguous) - find and rank unclear terms for disambiguation
- [join](./src/chains/join) - merge text fragments into coherent sequences
- [name](./src/verblets/name) - name something from a definition or description
- [name-similar-to](./src/verblets/name-similar-to) - suggest short names that match a style
- [people-list](./src/verblets/people-list) - generate diverse lists of people with specified characteristics
- [questions](./src/chains/questions) - produce clarifying questions
- [schema-org](./src/verblets/schema-org) - create schema.org objects
- [socratic](./src/chains/socratic) - explore assumptions using a Socratic dialogue
- [split](./src/chains/split) - mark split points in text
- [summary-map](./src/chains/summary-map) - summarize a collection
- [themes](./src/chains/themes) - identify themes in text
- [to-object](./src/verblets/to-object) - convert descriptions to structured objects
- [fill-missing](./src/verblets/fill-missing) - infer replacements for censored or corrupted text
- [veiled-variants](./src/chains/veiled-variants) - rephrase sensitive queries safely


### Utility Operations

Utility operations are uncategorized functionality like automatic tool selection, intent parsing, and context compression.

- [auto](./src/verblets/auto) - automatically select the best verblet for a task
- [expect](./src/verblets/expect) - simple LLM assertions
- [expect chain](./src/chains/expect) - assert things about data with LLM reasoning
- [intent](./src/verblets/intent) - extract user intent and structured parameters
- [llm-logger](./src/chains/llm-logger) - intelligent logging and monitoring for LLM interactions
- [sentiment](./src/verblets/sentiment) - detect emotional tone of text
- [set-interval](./src/chains/set-interval) - Conversational scheduler
- [summary-map](./src/chains/summary-map) - store self-resizing hash table values. Useful for fixed-sized contexts.

### Codebase

Codebase utilities analyze, test, and improve code quality using AI reasoning.

- [scan-js](./src/chains/scan-js) - analyze JavaScript code quality
- [test](./src/chains/test) - run AI-driven software tests
- [test-advice](./src/chains/test-advice) - get feedback on test coverage

## Library Helpers

Helpers support higher-level operations. They make no LLM calls and are often synchronous.

- [chatgpt](./src/lib/chatgpt) - OpenAI ChatGPT wrapper
- [combinations](./src/lib/combinations) - generate array combinations
- [prompt-cache](./src/lib/prompt-cache) - cache prompts and responses
- [retry](./src/lib/retry) - retry asynchronous calls
- [ring-buffer](./src/lib/ring-buffer) - circular buffer implementation for running LLMs on streams of of data
- [search-best-first](./src/lib/search-best-first) - best-first search algorithm
- [search-js-files](./src/lib/search-js-files) - scan JavaScript sources
- [shorten-text](./src/lib/shorten-text) - shorten text using a model
- [strip-numeric](./src/lib/strip-numeric) - remove non-digit characters
- [strip-response](./src/lib/strip-response) - clean up model responses
- [to-bool](./src/lib/to-bool) - parse text to boolean
- [to-date](./src/lib/to-date) - parse text to JavaScript Date objects
- [to-enum](./src/lib/to-enum) - parse text to enum values
- [to-number](./src/lib/to-number) - parse text to numbers
- [to-number-with-units](./src/lib/to-number-with-units) - parse numbers with units
- [transcribe](./src/lib/transcribe) - microphone transcription via Whisper

## Example: Intelligent Customer Support System

This example shows how verblets enable building systems that understand context, make nuanced decisions, and adapt to complex real-world scenarios - capabilities that would be nearly impossible with traditional programming approaches.

```javascript
import map from './src/chains/map/index.js';
import list from './src/chains/list/index.js';
import {
  anonymize,
  bool,
  enum,
  intent,
  listFilterLines,
  questions,
  sort,
  toObject,
  sentiment,
  score,
} from 'verblets';

// Intelligent customer support system that handles complex, contextual requests
async function handleCustomerRequest(message, history, catalog) {
  const customerIntent = await intent({
    text: message,
    operations: [
      { name: 'refund-request', parameters: { reason: 'string', orderNumber: 'string?' } },
      { name: 'product-inquiry', parameters: { productType: 'string', feature: 'string?' } },
      { name: 'technical-support', parameters: { issue: 'string', urgency: 'string' } },
      { name: 'complaint', parameters: { category: 'string', severity: 'string' } },
    ],
  });

  const emotion = await sentiment(message);
  const urgent = await bool(`Is this urgent? ${message}`);

  const strategy = await enum(message, {
    immediate_escalation: 'Customer is very upset, escalate to human agent',
    detailed_help: 'Customer needs comprehensive assistance',
    quick_resolution: 'Simple issue that can be resolved quickly',
    educational: 'Customer needs to understand how something works',
  });

  const followUpQuestions = await questions(
    `Customer says: "${message}". What should we ask to help them better?`
  );

  const candidates = await listFilterLines(
    catalog,
    `Products that might solve: ${
      customerIntent.parameters.issue || customerIntent.parameters.productType
    }`
  );

  const { scores } = await score(candidates, 'resolution likelihood');
  const prioritized = await sort(candidates, `by likelihood score ${scores.join(', ')}`);

  const bulletPoints = await map(
    prioritized.map((p) => p.name),
    'Write a friendly one-line apology referencing <list>.'
  );

  const sampleReplies = await list('3 reassuring follow-up messages for this customer');

  const caseSummary = await anonymize(
    `Customer ${customerIntent.intent.operation}: ${message}.
     History: ${history}. Resolution: ${prioritized[0]}`
  );

  const response = await toObject(
    `
    Customer needs ${customerIntent.intent.operation} help.
    They are ${emotion} and ${urgent ? 'urgent' : 'not urgent'}.
    Best approach: ${strategy}.
    Top solution: ${prioritized[0]?.name}
  `,
    {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        urgency: { type: 'string' },
        emotion: { type: 'string' },
        strategy: { type: 'string' },
        recommendedSolution: { type: 'string' },
        followUpQuestions: { type: 'array' },
      },
    }
  );

  return {
    ...response,
    followUpQuestions: followUpQuestions.slice(0, 3),
    anonymizedCase: caseSummary,
    bulletPoints,
    sampleReplies,
  };
}

// Usage: Handle a complex customer scenario
const result = await handleCustomerRequest(
  "I'm really frustrated! I ordered your premium headphones 2 weeks ago for my daughter's birthday tomorrow and they still haven't arrived. The tracking says 'processing' but I paid for 2-day shipping. This is completely unacceptable and I want my money back immediately!",
  'Previous orders: 3 successful deliveries, 1 late delivery complaint resolved',
  [
    {
      name: 'Premium Wireless Headphones',
      category: 'audio',
      features: ['noise-canceling', 'wireless'],
    },
    { name: 'Express Shipping Upgrade', category: 'service', features: ['priority', 'tracking'] },
    { name: 'Gift Card', category: 'compensation', features: ['flexible', 'immediate'] },
  ]
);

/* Returns something like:
{
  intent: "refund-request",
  urgency: "high",
  emotion: "frustrated",
  strategy: "immediate_escalation",
  recommendedSolution: "Express Shipping Upgrade",
  followUpQuestions: [
    "What's your order number so I can track this immediately?",
    "Would you like us to expedite a replacement for tomorrow delivery?",
    "How can we make this right for your daughter's birthday?"
  ],
  anonymizedCase: "Customer refund-request: Customer frustrated about delayed premium headphones order for child's birthday..."
  bulletPoints: ["Apologies for the delay on Premium Wireless Headphones", ...],
  sampleReplies: ["We're monitoring shipping updates...", ...]
}
*/
```

This system demonstrates capabilities that extend traditional programming approaches:

- **Contextual understanding** of customer emotions and intent
- **Dynamic decision making** based on multiple factors
- **Adaptive questioning** that changes based on the situation
- **Intelligent prioritization** of solutions
- **Privacy-aware data handling** for compliance
- **Structured output** that integrates with existing systems


## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
