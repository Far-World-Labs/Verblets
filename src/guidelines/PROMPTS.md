# Prompt Engineering Guidelines

Verblets are AI-powered functions that transform data through natural language instructions. Chains orchestrate these verblets to create intelligent workflows. Our prompt chaining approach treats prompts as algorithmic components - each with clear responsibility, focused purpose, and reliable behavior. We optimize for reliability, control, generality across diverse inputs, and individual prompt productivity. Many guidelines below are optional depending on context, but all aim to create prompts that work predictably within our compositional architecture.

## Prompt Identification and Scoring
When analyzing codebases for prompts:
• Core functionality prompts score higher than test or supporting prompts
• Complete multi-line instructions score higher than fragments or placeholders
• Template placeholders in curly braces (like `{context}`) are not prompts themselves
• Actual prompt content with domain expertise scores highest
• Test descriptions are worth analyzing but are secondary to implementation prompts

## Structure and Organization
• Identify missing XML blocks for variable content
• Find embedded data that should be parameterized  
• Check separation between static instructions and dynamic content
• Assess information flow - does it guide the LLM naturally?
• Detect hardcoded values that limit reusability
• Look for redundant instructions that add noise

## Output Requirements
• Verify explicit format definitions exist (critical: ambiguity causes unpredictable output)
• Check that structured output references schemas
• Ensure error handling is addressed
• Look for success criteria and quality guidelines
• Find ambiguous return value descriptions
• Check edge case handling where critical

## Clarity
• Find undefined technical terms
• Locate ambiguous or vague instructions
• Identify hidden assumptions
• Check for cognitive overload - too much in one prompt
• Simplify complex multi-clause sentences
• Ensure task boundaries are clear (critical: scope creep degrades performance)
• Replace detailed instructions with clear guidelines

## Prompt Engineering Patterns
• Check appropriate use of prompt constants (critical: ensures consistent behavior across system)
• Verify the right chain/tool is being used (map for mapping, score for scoring)
• Look for missing prompt constant opportunities
• Find unnecessary complexity that could be simplified
• Identify where role definitions would help
• Ensure guidelines exist rather than just constraints

## Robustness and Reliability
• How does it handle variable input sizes?
• Check for brittle patterns that break easily
• Find context-dependent assumptions
• Look for missing boundary conditions
• Identify validation gaps
• Consider recovery or fallback behavior

## Completeness
• Check for missing prerequisites or context
• Find incomplete task descriptions
• Look for unspecified rules or guidelines
• Identify missing stopping conditions
• Check conditionals are fully specified
• Find gaps in special case handling

## Core Principles
• Never suggest adding examples - use guidelines and criteria instead (critical: examples bias outputs toward specific patterns, reducing generality across use cases; abstract guidelines maintain flexibility while providing clear direction)
• Prompts are for LLMs, not programs - no flags, switches, or parameters (critical: natural language interface, not API)
• Use XML blocks for variable content: `<context>`, `<input>`, `<task>`, etc.
• Reference prompt constants for standard behaviors
• Each prompt should have one clear responsibility (critical: composability requires focused components)
• Keep cognitive load appropriate for the task
• Define terms without over-explaining
• Focus on practical improvements that enhance reliability