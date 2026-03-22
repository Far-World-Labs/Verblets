# Strategic Context

Input document for the maturity audit. The audit script reads these sections
to ground its strategic assessment in your actual goals and observations.

## External Trends

<!-- Developments in AI tooling, prompt engineering, and the broader ecosystem
     that should influence verblets' direction. -->

- Structured outputs (JSON mode, tool use) now standard across all major providers
- Agent frameworks (LangGraph, CrewAI) trending toward declarative pipelines
- Prompt caching reduces cost of repeated system prompts significantly
- Multi-modal inputs (images, audio) becoming table stakes for AI libraries
- Token costs dropping ~50% per year — cost optimization may matter less over time

## Design Questions

<!-- Open questions about verblets' architecture and approach. The audit will
     attempt to address these based on evidence from the codebase. -->

- Is the single-LLM-call-per-verblet rule still the right constraint?
- Should chains compose via spec/apply everywhere, or is that over-engineering for simpler chains?
- Is the batch processing model (createBatches + parallel) the right abstraction?
- Should verblets support streaming responses?

## Product Goals

<!-- What verblets should accomplish. What users should be able to do with it. -->

- Usable by developers who are not AI/ML experts
- Composable: small functions that wire together into complex pipelines
- Observable: you can see what the library is doing and why
- Cost-aware: reasonable token usage without requiring users to think about it
- Isomorphic: works in browser and Node.js without configuration

## Tradeoff Concerns

<!-- Specific tradeoffs you've noticed or worry about. -->

- filter makes one LLM call per batch (yes/no per item) — could a threshold approach be cheaper?
- map retries failed items individually — is batch-level retry + item retry redundant?
- score generates a spec then applies it — two LLM calls minimum. Is that justified?
- reduce processes batches sequentially — is there a parallel reduce pattern that works?
- Some chains (anonymize, dismantle) make 3-5 LLM calls — is that the right number?

## Observations

<!-- Running notes about things you've noticed. Append freely. -->
