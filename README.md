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
- [truncate](./src/chains/truncate) - cut all text from the end matching a description
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
- [set-interval](./src/chains/set-interval) - timer with itelligent interval selection
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

## Example: Real Estate Fraud Detection System

Note this example is currently only fictional and is only meant to represent what's possible with an LLM standard library.

```javascript
import {
  anonymize,
  chatgpt,
  conversation,
  filter,
  peopleList,
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
  const buyers = await peopleList('naive first-time home buyer with cash ready', 1);
  const buyer = buyers[0];

  // Generate varied initial email
  const initialEmail = await chatgpt(`
    Write an email as this buyer: ${buyer}

    Show interest in property: ${listing.address} for ${listing.price}
    Sound eager and mention having cash ready.
    Make it unique - don't use template language.
  `);

  await emailClient.send(listing.contact, `Interest in ${listing.address}`, initialEmail);

  // Wait for fraudster response
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  const fraudsterReply = await emailClient.getNewReplies(listing.contact, startTime);

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

    // Wait for trap response
    await new Promise(resolve => setTimeout(resolve, 30000));
    const trapReply = await emailClient.getNewReplies(listing.contact, Date.now() - 30000);

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
}
```

Verblets enable creating entirely new categories of tools that coordinate multiple AI functions with the precision and reliability of traditional software. Like a sophisticated detective, this system can recognize patterns, conduct investigations, adapt strategies based on responses, and document findings - but executes with the deterministic coordination that only software can provide. This hybrid approach unlocks problems that require both human-like reasoning and systematic execution, opening new frontiers in automated security, investigation, and complex decision-making systems.


## Contributing

Help us explore what's possible when we extend software primitives with language model intelligence.

## License

All Rights Reserved - Far World Labs
