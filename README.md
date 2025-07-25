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

- [bool](./src/verblets/bool) - interpret yes/no, true/false, and conditional statements
- [enum](./src/verblets/enum) - match free-form input to one of several predefined options
- [number](./src/verblets/number) - extract numeric values including spelled-out numbers
- [number-with-units](./src/verblets/number-with-units) - parse measurements and convert between unit systems
- [date](./src/chains/date) - parse dates from relative expressions, natural language, and standard formats

### Math

Math chains transform values using conceptual reasoning and subjective judgments beyond simple calculations.

- [scale](./src/chains/scale) - convert qualitative descriptions to numeric values using calibrated examples

### Lists

List operations transform, filter, and organize collections using natural language criteria. They handle both individual items and batch processing for datasets larger than a context window. Many list operations support bulk operation with built-in retry. Many have alternative single invocation versions in the verblets directory.

- [central-tendency](./src/chains/central-tendency) - find the most representative examples from a collection
- [detect-patterns](./src/chains/detect-patterns) - identify repeating structures, sequences, or relationships in data
- [detect-threshold](./src/chains/detect-threshold) - find meaningful breakpoints in numeric sequences
- [entities](./src/chains/entities) - extract names, places, organizations, and custom entity types
- [filter](./src/chains/filter) - keep items matching natural language criteria through parallel batch processing
- [find](./src/chains/find) - search for the single best match using parallel evaluation with early stopping
- [glossary](./src/chains/glossary) - extract key terms and generate definitions from their usage
- [group](./src/chains/group) - cluster items by first discovering categories then assigning members
- [map](./src/chains/map) - transform each item using consistent rules applied in parallel batches
- [reduce](./src/chains/reduce) - combine items sequentially, building up a result across batches
- [score](./src/chains/score) - rate items on multiple criteria using weighted evaluation
- [intersections](./src/chains/intersections) - find overlapping concepts between all item pairs
- [list](./src/chains/list) - extract lists from prose, tables, or generate from descriptions
- [list-expand](./src/verblets/list-expand) - add similar items matching the pattern of existing ones
- [sort](./src/chains/sort) - order by complex criteria using tournament-style comparisons

### Content

Content utilities generate, transform, and analyze text while maintaining structure and meaning. They handle creative tasks, system analysis, and privacy-aware text processing.

- [anonymize](./src/chains/anonymize) - replace names, dates, and identifying details with placeholders
- [category-samples](./src/chains/category-samples) - create examples ranging from typical to edge cases
- [collect-terms](./src/chains/collect-terms) - find domain-specific or complex vocabulary
- [commonalities](./src/verblets/commonalities) - identify what items share conceptually, not just literally
- [conversation](./src/chains/conversation) - manage multi-turn dialogues with memory and context tracking
- [disambiguate](./src/chains/disambiguate) - determine which meaning of ambiguous terms fits the context
- [dismantle](./src/chains/dismantle) - break down systems into parts, subparts, and their connections
- [document-shrink](./src/chains/document-shrink) - remove less relevant sections while keeping query-related content
- [filter-ambiguous](./src/chains/filter-ambiguous) - flag items that need human clarification
- [join](./src/chains/join) - connect text fragments by adding transitions and maintaining flow
- [name](./src/verblets/name) - parse names handling titles, suffixes, and cultural variations
- [name-similar-to](./src/verblets/name-similar-to) - generate names following example patterns
- [people](./src/chains/people) - build person profiles with consistent demographics and traits
- [pop-reference](./src/chains/pop-reference) - match concepts to movies, songs, memes, or cultural touchstones
- [questions](./src/chains/questions) - generate follow-up questions that branch from initial inquiry
- [schema-org](./src/verblets/schema-org) - convert unstructured data to schema.org JSON-LD format
- [socratic](./src/chains/socratic) - ask questions that reveal hidden assumptions and logic gaps
- [split](./src/chains/split) - find paragraph, section, or topic boundaries in continuous text
- [summary-map](./src/chains/summary-map) - build layered summaries for navigating large documents
- [themes](./src/chains/themes) - surface recurring ideas through multi-pass extraction and merging
- [timeline](./src/chains/timeline) - order events chronologically from scattered mentions
- [to-object](./src/verblets/to-object) - extract key-value pairs from natural language descriptions
- [truncate](./src/chains/truncate) - remove trailing content after a semantic boundary
- [fill-missing](./src/verblets/fill-missing) - predict likely content for redacted or corrupted sections
- [veiled-variants](./src/chains/veiled-variants) - reword queries to avoid triggering content filters


### Utility Operations

Utility operations are uncategorized functionality like automatic tool selection, intent parsing, and context compression.

- [auto](./src/verblets/auto) - match task descriptions to available tools using function calling
- [expect](./src/verblets/expect) - check if conditions are met and explain why if not
- [expect chain](./src/chains/expect) - validate complex data relationships with detailed failure analysis
- [intent](./src/verblets/intent) - extract action and parameters from natural language commands
- [llm-logger](./src/chains/llm-logger) - summarize log patterns and detect anomalies across time windows
- [sentiment](./src/verblets/sentiment) - classify as positive, negative, or neutral with nuance detection
- [set-interval](./src/chains/set-interval) - schedule tasks using natural language time descriptions
- [summary-map](./src/chains/summary-map) - compress values to fit memory limits while preserving key information

### Codebase

Codebase utilities analyze, test, and improve code quality using AI reasoning.

- [scan-js](./src/chains/scan-js) - examine JavaScript for patterns, anti-patterns, and potential issues
- [test](./src/chains/test) - generate test cases covering happy paths, edge cases, and error conditions
- [test-advice](./src/chains/test-advice) - identify untested code paths and suggest test scenarios

## Library Helpers

Helpers support higher-level operations. They make no LLM calls and are often synchronous.

- [chatgpt](./src/lib/chatgpt) - OpenAI ChatGPT wrapper
- [combinations](./src/lib/combinations) - generate array combinations
- [prompt-cache](./src/lib/prompt-cache) - cache prompts and responses
- [retry](./src/lib/retry) - retry asynchronous calls
- [ring-buffer](./src/lib/ring-buffer) - circular buffer implementation for running LLMs on streams of data
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

Verblets enable creating entirely new categories of tools that coordinate multiple AI functions with the precision and reliability of traditional software. Like a sophisticated detective, this system can recognize patterns, conduct investigations, adapt strategies based on responses, and document findings - but executes with the deterministic coordination that only software can provide. This hybrid approach unlocks problems that require both human-like reasoning and systematic execution, opening new frontiers in automated security, investigation, and complex decision-making systems.


## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
