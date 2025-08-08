# Verblets

Verblets is a utility library that provides AI-powered functions for transforming text and structured data into reliable outputs. Each function leverages language model intelligence while constraining outputs to ensure software reliability.

The chief motivation is that modular tools can augment human capability rather than replacing it, in contrast to top-down AI strategies. Algorithmic orchestration enables a new class of software tools that combine structured execution with targeted intelligence to solve problems that exceed context windows, require coordination across multiple AI functions, and benefit from immediate, composable integration of reasoning at strategic points.

## Repository Guide

### Quick Links

- [Chains](./src/chains/) - AI-powered workflows and operations
- [Verblets](./src/verblets/) - Core AI utility functions
- [Library Helpers](./src/lib/) - Utility functions and wrappers
- [Prompts](./src/prompts/) - Reusable prompt templates
- [JSON Schemas](./src/json-schemas/) - Data validation schemas

## Utilities

### Primitives

Primitive verblets extract basic data types from natural language with high reliability. They constrain LLM outputs to prevent hallucination while handling the complexity of human expression.

- [bool](./src/verblets/bool) - Extract boolean values from yes/no, true/false, and conditional statements
- [date](./src/chains/date) - Parse dates from relative expressions, natural language, and standard formats
- [enum](./src/verblets/enum) - Map free-form text to predefined category options
- [number](./src/verblets/number) - Extract numeric values from text descriptions
- [number-with-units](./src/verblets/number-with-units) - Parse measurements with units and convert between systems

### Math

Math chains transform values using conceptual reasoning and subjective judgments beyond simple calculations.

- [scale](./src/chains/scale) - Convert qualitative descriptions to numeric scales with consistency

### Lists

List operations transform, filter, and organize collections. They handle both individual items and batch processing for datasets larger than a context window. Many list operations support bulk operation with built-in retry. Many have alternative single invocation versions in the verblets directory. Many utilities have list support via specification-generators that maintain continuity, or prompt fragments that adapt single-invcation behavior to list processing.

- [central-tendency](./src/chains/central-tendency) - Find representative examples from collections
- [detect-patterns](./src/chains/detect-patterns) - Identify repeating structures and relationships
- [detect-threshold](./src/chains/detect-threshold) - Find meaningful breakpoints for metrics and alerting
- [entities](./src/chains/entities) - Extract people, places, organizations, and custom entities
- [filter](./src/chains/filter) - Keep items matching natural language criteria
- [find](./src/chains/find) - Return the single best match with early stopping
- [glossary](./src/chains/glossary) - Extract terms and generate contextual definitions
- [group](./src/chains/group) - Cluster items by discovering then assigning categories
- [intersections](./src/chains/intersections) - Find conceptual overlaps between item pairs
- [list](./src/chains/list) - Extract or generate lists from various formats
- [list-expand](./src/verblets/list-expand) - Generate similar items matching existing patterns
- [map](./src/chains/map) - Transform each item with consistent rules in parallel
- [reduce](./src/chains/reduce) - Combine items sequentially into a single result
- [score](./src/chains/score) - Rate items on multiple weighted criteria
- [sort](./src/chains/sort) - Order by complex criteria using comparisons

### Content

Content utilities generate, transform, and analyze text while maintaining structure and meaning. They handle creative tasks, system analysis, and privacy-aware text processing.

- [anonymize](./src/chains/anonymize) - Replace identifying details with privacy-safe placeholders
- [category-samples](./src/chains/category-samples) - Generate examples from typical to edge cases
- [collect-terms](./src/chains/collect-terms) - Extract domain-specific vocabulary
- [commonalities](./src/verblets/commonalities) - Find shared conceptual characteristics
- [conversation](./src/chains/conversation) - Manage multi-turn dialogues with context
- [disambiguate](./src/chains/disambiguate) - Resolve ambiguous term meanings from context
- [dismantle](./src/chains/dismantle) - Decompose systems into components and connections
- [document-shrink](./src/chains/document-shrink) - Compress documents while preserving key content
- [fill-missing](./src/verblets/fill-missing) - Intelligently complete redacted sections
- [filter-ambiguous](./src/chains/filter-ambiguous) - Identify items needing clarification
- [join](./src/chains/join) - Connect text fragments with smooth transitions
- [name](./src/verblets/name) - Generate contextually appropriate names
- [name-similar-to](./src/verblets/name-similar-to) - Create names matching style patterns
- [people](./src/chains/people) - Generate consistent persona profiles for LLM roles
- [pop-reference](./src/chains/pop-reference) - Match concepts to cultural references
- [questions](./src/chains/questions) - Generate insightful follow-up questions
- [relations](./src/chains/relations) - Extract entity relationships from text
- [schema-org](./src/verblets/schema-org) - Structure data in schema.org JSON-LD format
- [socratic](./src/chains/socratic) - Probe assumptions with targeted questions
- [split](./src/chains/split) - Identify natural topic boundaries in text
- [summary-map](./src/chains/summary-map) - Create navigable document summaries
- [themes](./src/chains/themes) - Extract recurring ideas through analysis
- [timeline](./src/chains/timeline) - Chronologically order scattered events
- [to-object](./src/chains/to-object) - Parse key-value pairs from descriptions
- [truncate](./src/chains/truncate) - Cut text at semantic boundaries
- [veiled-variants](./src/chains/veiled-variants) - Rephrase to bypass content filters


### Utility Operations

Utility operations are uncategorized functionality like automatic tool selection, intent parsing, and context compression.

- [ai-arch-expect](./src/chains/ai-arch-expect) - Validate AI architecture patterns
- [auto](./src/verblets/auto) - Automatically select and apply appropriate tools
- [expect](./src/chains/expect) - Validate data relationships with detailed analysis
- [intent](./src/verblets/intent) - Parse commands into actions and parameters
- [llm-logger](./src/chains/llm-logger) - Analyze logs for patterns and anomalies
- [sentiment](./src/verblets/sentiment) - Classify emotional tone with nuance
- [set-interval](./src/chains/set-interval) - Schedule tasks from natural language

### Codebase

Codebase utilities analyze, test, and improve code quality using AI reasoning.

- [scan-js](./src/chains/scan-js) - Examine JavaScript for patterns, anti-patterns, and potential issues
- [test](./src/chains/test) - Generate test cases covering happy paths, edge cases, and error conditions
- [test-advice](./src/chains/test-advice) - Identify untested code paths and suggest test scenarios

## Library Helpers

Helpers support higher-level operations. They make no LLM calls and are often synchronous.

- [chatgpt](./src/lib/chatgpt) - OpenAI ChatGPT wrapper
- [prompt-cache](./src/lib/prompt-cache) - Cache prompts and responses
- [retry](./src/lib/retry) - Retry asynchronous calls
- [ring-buffer](./src/lib/ring-buffer) - Circular buffer implementation for running LLMs on streams of data

## Example: Real Estate Fraud Detection System

Note this example is currently only fictional as an illustration of what's possible with an LLM standard library.

```javascript
import {
  anonymize,
  chatgpt,
  conversation,
  filter,
  people,
  score,
} from 'verblets';

async function huntRealEstateFraud(listings) {
  const fraudScores = await score(
    listings.map(l => l.description),
    'fraudulent property listing with pressure tactics and artificial urgency'
  );

  const pricingScores = await score(
    listings.map(l => `Price: ${l.price}, Area median: ${l.areaMedian}`),
    'pricing anomaly indicating possible fraud'
  );

  const highRiskListings = listings
    .map((listing, i) => ({
      listing,
      riskScore: fraudScores.scores[i] * 0.6 + pricingScores.scores[i] * 0.4
    }))
    .filter(r => r.riskScore >= 8.0);

  for (const { listing, riskScore } of highRiskListings) {
    await stingOperation(listing, riskScore);
  }
}

async function stingOperation(listing, riskScore) {
  const buyers = await people('naive first-time home buyer with cash ready', 1);
  const buyer = buyers[0];

  // Generate varied initial email
  const initialEmail = await chatgpt(`
    Write an email as this buyer: ${buyer}

    Show interest in property: ${listing.address} for ${listing.price}.
    Make it unique.
  `);

  await emailClient.send(listing.contact, `Interest in ${listing.address}`, initialEmail);

  // Wait for initial response with intelligent timing
  let fraudsterReply;
  const initialStop = setInterval({
    prompt: 'How long should we wait for scammer to reply to initial inquiry?',
    getData: async () => emailClient.getNewReplies(listing.contact, Date.now()),
    onTick: async ({ data }) => {
      if (data) {
        fraudsterReply = data;
        initialStop();
      }
    }
  });

  if (!fraudsterReply) {
    await notionClient.addPage({
      listing: listing.address,
      riskScore,
      evidenceStrength: 0,
      fraudBehaviors: ['no_response'],
      status: 'no_response'
    });
    return;
  }

  // Extract fraudster's message content
  const fraudsterMessage = fraudsterReply.payload.body.data || fraudsterReply.snippet;

  const fraudIndicators = await score([fraudsterMessage],
    'fraud response with pressure tactics and verification avoidance');

  if (fraudIndicators.scores[0] >= 7) {
    // Generate varied trap questions
    const trapEmail = await chatgpt(`
      As buyer ${buyer}, write a follow-up email asking verification questions about ${listing.address}.

      Ask specific details that only the real owner would know (neighborhood details, property features, etc.).
      Sound excited but requesting verification. Make questions unique - vary from these types:
      - Neighborhood characteristics
      - Property condition details
      - Local area knowledge
      - Recent property changes

      Previous conversation:
      Me: ${initialEmail}
      Them: ${fraudsterMessage}
    `);

    await emailClient.send(listing.contact, `Re: Interest in ${listing.address}`, trapEmail);

    // Wait for trap response using intelligent interval checking
    let trapReply;
    const trapStop = setInterval({
      prompt: 'Check email every few hours for fraud investigation response',
      getData: async () => emailClient.getNewReplies(listing.contact, Date.now() - 30000),
      onTick: async ({ data }) => {
        if (data) {
          trapReply = data;
          trapStop();
        }
      }
    });

    if (trapReply) {
      const trapMessage = trapReply.payload.body.data || trapReply.snippet;

      const fraudBehaviors = await filter([
        'refuses property verification',
        'demands immediate payment',
        'avoids phone calls',
        'fake urgency pressure',
        'no legitimate documentation',
        'overseas seller claims',
        'wire transfer only',
        'no property showings',
        'evasive responses',
        'generic property descriptions'
      ], `behaviors demonstrated in: ${fraudsterMessage} ${trapMessage}`);

      const evidenceAnalysis = await score([
        `${fraudsterMessage} ${trapMessage}`
      ], 'strength of fraud evidence for law enforcement');

      // Add to Notion database
      await notionClient.createFraudCase({
        listing: listing.address,
        riskScore,
        evidenceStrength: evidenceAnalysis.scores[0],
        fraudBehaviors,
        status: evidenceAnalysis.scores[0] >= 8 ? 'strong_evidence' : 'moderate_evidence'
      });
    }

}
```

## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
