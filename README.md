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
- [date](./src/chains/date) - return Date objects from natural language prompts

### Lists

List operations transform, filter, and organize collections using natural language criteria. They handle both small lists with individual verblets and large datasets with batch processing chains.

- [bulk-map](./src/chains/bulk-map) - process long lists in retryable batches
- [bulk-reduce](./src/chains/bulk-reduce) - reduce long lists in manageable chunks
- [bulk-find](./src/chains/bulk-find) - locate the best match in large datasets
- [bulk-group](./src/chains/bulk-group) - group large datasets efficiently
- [bulk-filter](./src/chains/bulk-filter) - filter huge lists in batches
- [intersections](./src/chains/intersections) - find comprehensive intersections for all combinations
- [list](./src/chains/list) - generate contextual lists from prompts
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
- [dismantle](./src/chains/dismantle) - break systems into components
- [disambiguate](./src/chains/disambiguate) - resolve ambiguous word meanings using context
- [questions](./src/chains/questions) - produce clarifying questions
- [summary-map](./src/chains/summary-map) - summarize a collection
- [test](./src/chains/test) - run LLM-driven tests
- [test-advice](./src/chains/test-advice) - get feedback on test coverage
- [veiled-variants](./src/chains/veiled-variants) - conceal sensitive queries with safer framing
- [collect-terms](./src/chains/collect-terms) - extract difficult vocabulary
- [name](./src/verblets/name) - name something from a definition or description
- [name-similar-to](./src/verblets/name-similar-to) - suggest short names that match a style
- [schema-org](./src/verblets/schema-org) - create schema.org objects
- [socratic](./src/chains/socratic) - explore assumptions using a Socratic dialogue
- [themes](./src/chains/themes) - identify themes in text
- [to-object](./src/verblets/to-object) - convert descriptions to objects

### Utility Operations

Utility operations provide meta-functionality like automatic tool selection, intent parsing, and context compression. They're essential for building intelligent systems that can adapt and scale.

- [auto](./src/verblets/auto) - automatically select the best verblet for a task
- [expect](./src/verblets/expect) - simple LLM assertions
- [expect chain](./src/chains/expect) - assert things about data with LLM reasoning
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
- [to-date](./src/lib/to-date) - parse text to JavaScript Date objects
- [transcribe](./src/lib/transcribe) - microphone transcription via Whisper

## Example: Intelligent Customer Support System

This example shows how verblets enable building systems that understand context, make nuanced decisions, and adapt to complex real-world scenarios - capabilities that would be nearly impossible with traditional programming approaches.

```javascript
import {
  intent,
  sentiment,
  bool,
  enum,
  toObject,
  anonymize,
  questions,
  sort,
  listFilter,
  summaryMap,
} from 'verblets';

// Intelligent customer support system that handles complex, contextual requests
async function handleCustomerRequest(customerMessage, customerHistory, productCatalog) {
  // 1. Understand what the customer actually wants
  const customerIntent = await intent({
    text: customerMessage,
    operations: [
      { name: 'refund-request', parameters: { reason: 'string', orderNumber: 'string?' } },
      { name: 'product-inquiry', parameters: { productType: 'string', feature: 'string?' } },
      { name: 'technical-support', parameters: { issue: 'string', urgency: 'string' } },
      { name: 'complaint', parameters: { category: 'string', severity: 'string' } },
    ],
  });

  // 2. Assess emotional state and urgency
  const emotionalState = await sentiment(customerMessage);
  const isUrgent = await bool(`Is this customer request urgent? ${customerMessage}`);

  // 3. Determine appropriate response strategy
  const responseStrategy = await enum(customerMessage, {
    immediate_escalation: 'Customer is very upset, escalate to human agent',
    detailed_help: 'Customer needs comprehensive assistance',
    quick_resolution: 'Simple issue that can be resolved quickly',
    educational: 'Customer needs to understand how something works',
  });

  // 4. Generate contextual follow-up questions
  const clarifyingQuestions = await questions(
    `Customer says: "${customerMessage}". What should we ask to help them better?`
  );

  // 5. Find relevant products/solutions from catalog
  const relevantProducts = await listFilter(
    productCatalog,
    `Products that might solve: ${
      customerIntent.parameters.issue || customerIntent.parameters.productType
    }`
  );

  // 6. Prioritize solutions by customer context
  const prioritizedSolutions = await sort(
    relevantProducts,
    `by relevance to ${emotionalState} customer with ${customerIntent.intent.operation} request`
  );

  // 7. Create anonymized case summary for training
  const caseSummary = await anonymize(
    `Customer ${customerIntent.intent.operation}: ${customerMessage}. 
     History: ${customerHistory}. Resolution: ${prioritizedSolutions[0]}`
  );

  // 8. Structure the complete response
  const response = await toObject(
    `
    Customer needs ${customerIntent.intent.operation} help.
    They are ${emotionalState} and ${isUrgent ? 'urgent' : 'not urgent'}.
    Best approach: ${responseStrategy}.
    Top solution: ${prioritizedSolutions[0]?.name}
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
    followUpQuestions: clarifyingQuestions.slice(0, 3),
    anonymizedCase: caseSummary,
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

<<<<<<< HEAD
With verblets, complex AI-powered workflows become as simple as calling functions.
=======
- **list** - Generate contextual lists
  ```javascript
  await list("potential failure points in our microservices architecture");
  ```

- **intent** - Understand user intentions and extract structured data
  ```javascript
  // Define what operations your system can handle
  const operations = [
    {
      name: "book-flight",
      parameters: {
        destination: "string",
        date: "string",
        class: "string"
      }
    },
    {
      name: "find-song",
      parameters: {
        lyrics: "string",
        artist: "string?"
      }
    }
  ];

  // It understands flight booking requests
  const flightRequest = await intent({
    text: "I need a business class flight to Tokyo next Friday",
    operations
  });
  /* Returns:
  {
    "queryText": "I need a business class flight to Tokyo next Friday",
    "intent": {
      "operation": "book-flight",
      "displayName": "Book Flight"
    },
    "parameters": {
      "destination": "Tokyo",
      "date": "next Friday",
      "class": "business"
    }
  }
  */

- **auto** - Use function calling to select and prepare operations
  ```javascript
  // First, we have our available functions defined as schemas
  const availableFunctions = [
    {
      "name": "bool",
      "description": "Answer yes/no questions about facts or situations",
      "parameters": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "The question to answer"
          }
        }
      }
    },
    {
      "name": "list",
      "description": "Generate lists of relevant items",
      "parameters": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "What to list"
          }
        }
      }
    },
    // ... many more function definitions ...
  ];

  // When someone has an urgent question
  const result = await auto(
    "Help! My dog just ate an avocado! Is this dangerous?"
  );
  /* First, auto selects the appropriate function:
  {
    "name": "bool",  // Recognizes this needs a yes/no answer
    "arguments": {
      "text": "Help! My dog just ate an avocado! Is this dangerous?"
    },
    "functionArgsAsArray": [
      {
        "text": "Help! My dog just ate an avocado! Is this dangerous?"
      }
    ]
  }
  */

  // Then it automatically runs the selected function internally, passing arguments it extracts
  const answer = await bool(result.arguments.text);
  // Returns: true (yes, it can be dangerous)
  ```

- **questions** - Explore topics through intelligent question generation
  ```javascript

  const investigation = await questions(
    "Why isn't my houseplant thriving?",
    {
      searchBreadth: 0.7,  // Explore more broadly (0-1)
      shouldStop: (q, all) => all.length > 20  // Custom stopping condition
    }
  );
  /* Returns targeted diagnostic questions:
  [
    "Which direction does the window face?",
    "Are the leaves turning yellow or brown?",
    "Is the soil staying wet for long periods?",
    "Are there any visible pests on the leaves?",
    "When was it last repotted?",
    "Is there good drainage in the pot?",
    "What's the humidity level in the room?",
    // ... continues until stopping condition ...
  ]
  */
  ```

- **shorten-text** - Intelligently compress text while preserving meaning
  ```javascript
  // Shorten long content while keeping key information
  const story = `Once upon a time, in a bustling city called Metropolis, 
    there lived a young programmer named Ada. She spent her days writing 
    elegant code and her nights dreaming of artificial intelligence. 
    One day, while debugging a particularly tricky neural network, 
    she discovered something extraordinary...`;

  const shortened = await shortenText(story, {
    targetTokenCount: 20,
    minCharsToRemove: 15
  });
  /* Returns:
     "Once upon a time, in Metropolis, a programmer named Ada 
      spent her days writing code... discovered something extraordinary"
  */

  // Preserve structure while reducing size
  const documentation = `# API Reference
    ## Authentication
    All requests must include an API key in the header.
    The key should be prefixed with 'Bearer '.
    
    ## Rate Limiting
    Requests are limited to 100 per minute.
    Exceeding this will result in a 429 response.
    
    ## Endpoints
    GET /users - Retrieve user list
    POST /users - Create new user
    DELETE /users/{id} - Remove user`;

  const compact = await shortenText(documentation, {
    targetTokenCount: 30,
    minCharsToRemove: 20
  });
  /* Returns:
     "# API Reference
      ## Authentication
      All requests need API key... 'Bearer '
      
      ## Rate Limiting
      100 per minute... 429 response
      
      ## Endpoints
      GET /users...DELETE /users/{id}"
  */
  ```

- **bulk-map** - Map over lists in retryable batches using the `listMap` verblet
```javascript
import { bulkMap } from './src/index.js';

  const gadgets = [
    'solar-powered flashlight',
    'quantum laptop',
    'smart refrigerator',
    // ...more items
  ];
  const results = await bulkMap(
    gadgets,
    'Give each item a catchphrase worthy of a blockbuster commercial',
    { chunkSize: 5, maxAttempts: 2 }
  );
  // results[0] === 'Illuminate your world with the sun'
  // results[1] === 'Computing beyond limits'
  ```

- **bulk-reduce** - Reduce long lists sequentially using `listReduce`
```javascript
  import bulkReduce from './src/chains/bulk-reduce/index.js';

  const logLines = [
    'User logged in',
    'User viewed dashboard',
    'User logged out'
  ];
  const summary = await bulkReduce(logLines, 'Summarize the events');
  // e.g. 'User session: login, dashboard view and logout'
```

<<<<<<< HEAD
**bulk-partition** - Discover the best categories and group large lists consistently
```javascript
  import bulkPartition from './src/chains/bulk-partition/index.js';

  const feedback = [
    'Great interface and onboarding',
    'Price is a bit steep',
    'Love the mobile app',
    'Needs more integrations'
  ];
  const result = await bulkPartition(
    feedback,
    'Is each line praise, criticism, or a feature request?',
    { chunkSize: 2, topN: 3 }
  );
  // {
  //   praise: ['Great interface and onboarding', 'Love the mobile app'],
  //   criticism: ['Price is a bit steep'],
  //   'feature request': ['Needs more integrations']
  // }
```

- **themes** - Extract recurring themes from text
```javascript
  const mainThemes = await themes(longReport, { topN: 3 });
  // ['strategy', 'market challenges', 'team morale']
```
=======
- **bulk-find** - Search lists in batches using `listFind`
  ```javascript
  import bulkFind, { bulkFindRetry } from './src/lib/bulk-find/index.js';

  const diaryEntries = [
    'Hiked up the mountains today and saw breathtaking views',
    'Visited the local market and tried a spicy stew',
    'Spotted penguins playing on the beach this morning'
  ];
  const match = await bulkFindRetry(diaryEntries, 'mentions penguins', {
    chunkSize: 2,
    maxAttempts: 2
  });
  // => 'Spotted penguins playing on the beach this morning'
  ```

>>>>>>> f71abac (Restore eslint disable comment)
- **search-best-first** - Intelligently explore solution spaces
  ```javascript
  // Find the best recipe adjustments when ingredients are missing
  const search = new BestFirstSearch({
    initialState: {
      recipe: "Classic Tiramisu",
      missing: ["mascarpone cheese", "ladyfingers"],
      available: ["cream cheese", "pound cake", "whipped cream"]
    },
    goalTest: state => state.substitutions.complete && state.flavor.preserved,
    heuristic: state => state.flavor.similarity
  });

  const path = await search.findPath();
  /* Returns sequence of steps:
  [
    {
      action: "substitute mascarpone",
      details: "Mix 8oz cream cheese with 1/4 cup whipped cream",
      confidence: 0.85
    },
    {
      action: "substitute ladyfingers",
      details: "Slice pound cake, toast until crisp, soak in coffee",
      confidence: 0.75
    },
    {
      action: "adjust ratios",
      details: "Increase coffee soak time to 45 seconds for pound cake",
      confidence: 0.9
    }
  ]
  */

  // Or find the optimal way to refactor complex code
  const refactorPath = await new BestFirstSearch({
    initialState: {
      file: "src/legacy-parser.js",
      metrics: {
        complexity: 85,
        coverage: 0.4,
        maintainability: "D"
      }
    },
    goalTest: state => 
      state.metrics.complexity < 30 && 
      state.metrics.coverage > 0.8 &&
      state.metrics.maintainability === "A",
    heuristic: state => 
      (1 / state.metrics.complexity) * 
      state.metrics.coverage *
      (state.metrics.maintainability === "A" ? 1 : 0.5)
  }).findPath();
  /* Returns optimal refactoring sequence:
  [
    {
      action: "extract function",
      target: "parseNestedBlocks()",
      benefit: "Reduces complexity by 40%"
    },
    {
      action: "add unit tests",
      coverage: ["error handling", "edge cases"],
      benefit: "Coverage increases to 85%"
    },
    {
      action: "implement strategy pattern",
      components: ["BlockParser", "InlineParser"],
      benefit: "Maintainability improves to grade A"
    }
  ]
  */
  ```

- **test-advice** - Get comprehensive testing and code quality insights
  ```javascript
  // Get deep analysis of your code's test coverage and quality
  const insights = await testAdvice("src/payment-processor.js");
  /* Returns array of findings across multiple dimensions:
  [
    {
      "name": "Boundary Testing",
      "expected": "Handle zero-amount transactions",
      "saw": "No validation for $0.00 payments in processPayment()",
      "isSuccess": false
    },
    {
      "name": "Success Scenarios",
      "expected": "Processes standard credit card payment",
      "saw": "Correctly handles Visa/MC format: line 47 validateCard()",
      "isSuccess": true
    },
    {
      "name": "Clean Code",
      "expected": "Single responsibility in transaction logging",
      "saw": "logPayment() mixing business logic with logging: line 92",
      "isSuccess": false
    },
    // ... analyzes across 8 dimensions:
    // - Boundary cases
    // - Success scenarios
    // - Failure modes
    // - Potential defects
    // - Best practices
    // - Clean code principles
    // - Code quality
    // - Refactoring opportunities
  ]
  */
  ```

- **veiled-variants** - Mask sensitive queries with safer alternatives
  ```javascript
  const alternatives = await veiledVariants({
    prompt: "If pigeons are government spies, how can I ask for counter-surveillance tips without sounding paranoid?"
  });
  /* Returns 15 reframed queries */
  ```

- **scan-js** - Analyze code for quality and maintainability
  ```javascript
  // Analyze your codebase for maintainability
  const analysis = await scanJs({
    entry: "src/app.js",
    features: "maintainability"
  });
  /* Returns analysis of each function:
  {
    "src/app.js:::handlePayment": {
      "complexity": "low",
      "documentation": "well-documented",
      "sideEffects": "isolated to database calls",
      "errorHandling": "comprehensive",
      "testability": "high"
    },
    "src/app.js:::validateInput": {
      "complexity": "medium",
      "documentation": "needs improvement",
      "sideEffects": "pure function",
      "errorHandling": "basic validation only",
      "testability": "high"
    }
    // ... continues for all functions ...
  }
  */

  // Focus on specific quality aspects
  const security = await scanJs({
    entry: "src/auth/",
    features: "security"
  });
  /* Returns security-focused analysis:
  {
    "src/auth/login.js:::hashPassword": {
      "inputValidation": "sanitizes all inputs",
      "cryptography": "uses current best practices",
      "dataExposure": "no sensitive data in logs",
      "authentication": "implements rate limiting"
    }
    // ... continues for all security-relevant functions ...
  }
  */
  ```
>>>>>>> 01eb5cf (Add themes chain for dual reduce)

## Contributing

Help us explore what's possible when we rebuild software primitives with intelligence at their core.

## License

All Rights Reserved - Far World Labs
