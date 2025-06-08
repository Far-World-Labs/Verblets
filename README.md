# Verblets

Verblets is a library of AI-powered utilities that transform natural language and structured data into reliable, structured outputs. Each function uses language model intelligence while constraining outputs to limit hallucination and ensure software reliability.

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

### Lists
List operations transform, filter, and organize collections using natural language criteria. They handle both small lists with individual verblets and large datasets with batch processing chains.

- [bulk-map](./src/chains/bulk-map) - process long lists in retryable batches
- [bulk-reduce](./src/chains/bulk-reduce) - reduce long lists in manageable chunks
- [bulk-find](./src/chains/bulk-find) - locate the best match in large datasets
- [bulk-group](./src/chains/bulk-group) - group large datasets efficiently
- [bulk-filter](./src/chains/bulk-filter) - filter huge lists in batches
- [list-map](./src/verblets/list-map) - transform each item in a list
- [list-reduce](./src/verblets/list-reduce) - combine list items using custom logic
- [list-find](./src/verblets/list-find) - pick the single best item from a list
- [list-filter](./src/verblets/list-filter) - filter lists with natural language criteria
- [list-group](./src/verblets/list-group) - categorize list items into groups
- [list-expand](./src/verblets/list-expand) - generate additional similar items
- [intersection](./src/verblets/intersection) - describe common traits between items
- [sort](./src/chains/sort) - order lists by any describable criteria

### Content
Content utilities generate, transform, and analyze text while maintaining structure and meaning. They excel at creative tasks, system analysis, and privacy-aware text processing.

- [anonymize](./src/chains/anonymize) - scrub personal details from text
- [dismantle](./src/chains/dismantle) - break complex systems into components
- [list](./src/chains/list) - generate contextual lists from prompts
- [questions](./src/chains/questions) - produce clarifying questions for topics
- [schema-org](./src/verblets/schema-org) - create schema.org-compliant data structures
- [name](./src/verblets/name) - name something from a definition or description
- [to-object](./src/verblets/to-object) - convert descriptions to structured objects
- [veiled-variants](./src/chains/veiled-variants) - rephrase sensitive queries safely

### Utility Operations
Utility operations provide meta-functionality like automatic tool selection, intent parsing, and context compression. They're essential for building intelligent systems that can adapt and scale.

- [auto](./src/verblets/auto) - automatically select the best verblet for a task
- [expect](./src/chains/llm-expect/) - assert things about data with LLM reasoning
- [intent](./src/verblets/intent) - extract user intent and structured parameters
- [sentiment](./src/verblets/sentiment) - detect emotional tone of text
- [summary-map](./src/chains/summary-map) - store self-resizing hash table values. Useful for fixed-sized contexts.

### Codebase
Codebase utilities analyze, test, and improve code quality using AI reasoning. They provide insights that traditional static analysis tools miss by understanding context and intent.

- [scan-js](./src/chains/scan-js) - analyze JavaScript code quality
- [test](./src/chains/test) - run AI-driven software tests
- [test-advice](./src/chains/test-advice) - get feedback on test coverage

## Library Helpers

- [chatgpt](./src/lib/chatgpt) - OpenAI ChatGPT wrapper
- [prompt-cache](./src/lib/prompt-cache) - cache prompts and responses
- [retry](./src/lib/retry) - retry asynchronous calls
- [search-best-first](./src/lib/search-best-first) - best-first search algorithm
- [search-js-files](./src/lib/search-js-files) - scan JavaScript sources
- [combinations](./src/lib/combinations) - generate array combinations
- [shorten-text](./src/lib/shorten-text) - shorten text using a model
- [strip-numeric](./src/lib/strip-numeric) - remove non-digit characters
- [strip-response](./src/lib/strip-response) - clean up model responses
- [to-bool](./src/lib/to-bool) - parse text to boolean
- [to-enum](./src/lib/to-enum) - parse text to enum values
- [to-number](./src/lib/to-number) - parse text to numbers
- [to-number-with-units](./src/lib/to-number-with-units) - parse numbers with units
- [transcribe](./src/lib/transcribe) - microphone transcription via Whisper

## Example: Intelligent Customer Support System

This example shows how verblets enable building systems that understand context, make nuanced decisions, and adapt to complex real-world scenarios - capabilities that would be nearly impossible with traditional programming approaches.

```javascript
import { 
  intent, sentiment, bool, enum, toObject, anonymize, 
  questions, sort, listFilter, summaryMap 
} from 'verblets';

// Intelligent customer support system that handles complex, contextual requests
async function handleCustomerRequest(customerMessage, customerHistory, productCatalog) {
  // 1. Understand what the customer actually wants
  const customerIntent = await intent({
    text: customerMessage,
    operations: [
      { name: "refund-request", parameters: { reason: "string", orderNumber: "string?" }},
      { name: "product-inquiry", parameters: { productType: "string", feature: "string?" }},
      { name: "technical-support", parameters: { issue: "string", urgency: "string" }},
      { name: "complaint", parameters: { category: "string", severity: "string" }}
    ]
  });

  // 2. Assess emotional state and urgency
  const emotionalState = await sentiment(customerMessage);
  const isUrgent = await bool(`Is this customer request urgent? ${customerMessage}`);
  
  // 3. Determine appropriate response strategy
  const responseStrategy = await enum(customerMessage, {
    "immediate_escalation": "Customer is very upset, escalate to human agent",
    "detailed_help": "Customer needs comprehensive assistance", 
    "quick_resolution": "Simple issue that can be resolved quickly",
    "educational": "Customer needs to understand how something works"
  });

  // 4. Generate contextual follow-up questions
  const clarifyingQuestions = await questions(
    `Customer says: "${customerMessage}". What should we ask to help them better?`
  );

  // 5. Find relevant products/solutions from catalog
  const relevantProducts = await listFilter(
    productCatalog,
    `Products that might solve: ${customerIntent.parameters.issue || customerIntent.parameters.productType}`
  );

  // 6. Prioritize solutions by customer context
  const prioritizedSolutions = await sort(relevantProducts, 
    `by relevance to ${emotionalState} customer with ${customerIntent.intent.operation} request`
  );

  // 7. Create anonymized case summary for training
  const caseSummary = await anonymize(
    `Customer ${customerIntent.intent.operation}: ${customerMessage}. 
     History: ${customerHistory}. Resolution: ${prioritizedSolutions[0]}`
  );

  // 8. Structure the complete response
  const response = await toObject(`
    Customer needs ${customerIntent.intent.operation} help.
    They are ${emotionalState} and ${isUrgent ? 'urgent' : 'not urgent'}.
    Best approach: ${responseStrategy}.
    Top solution: ${prioritizedSolutions[0]?.name}
  `, {
    type: "object",
    properties: {
      intent: { type: "string" },
      urgency: { type: "string" },
      emotion: { type: "string" },
      strategy: { type: "string" },
      recommendedSolution: { type: "string" },
      followUpQuestions: { type: "array" }
    }
  });

  return {
    ...response,
    followUpQuestions: clarifyingQuestions.slice(0, 3),
    anonymizedCase: caseSummary
  };
}

// Usage: Handle a complex customer scenario
const result = await handleCustomerRequest(
  "I'm really frustrated! I ordered your premium headphones 2 weeks ago for my daughter's birthday tomorrow and they still haven't arrived. The tracking says 'processing' but I paid for 2-day shipping. This is completely unacceptable and I want my money back immediately!",
  "Previous orders: 3 successful deliveries, 1 late delivery complaint resolved",
  [
    { name: "Premium Wireless Headphones", category: "audio", features: ["noise-canceling", "wireless"] },
    { name: "Express Shipping Upgrade", category: "service", features: ["priority", "tracking"] },
    { name: "Gift Card", category: "compensation", features: ["flexible", "immediate"] }
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
}
*/
```

This system demonstrates capabilities that would require thousands of lines of traditional code and extensive machine learning expertise:
- **Contextual understanding** of customer emotions and intent
- **Dynamic decision making** based on multiple factors
- **Adaptive questioning** that changes based on the situation  
- **Intelligent prioritization** of solutions
- **Privacy-aware data handling** for compliance
- **Structured output** that integrates with existing systems

With verblets, complex AI-powered workflows become as simple as calling functions.

## Contributing

Help us explore what's possible when we rebuild software primitives with intelligence at their core.

## License

All Rights Reserved - Far World Labs
