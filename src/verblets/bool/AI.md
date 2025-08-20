# Bool Verblet AI Guide

## Purpose
Converts natural language questions/statements to boolean true/false values via LLM interpretation.

## Processing & Logging
The verblet logs three key stages:
1. **Input**: Full text question/statement as received
2. **LLM call**: Model used, prompt length, response type, duration
3. **Output**: Final boolean value and raw LLM response

The logger captures the complete transformation pipeline, allowing analysis of where boolean interpretation occurs - whether in the LLM's response or in post-processing.

## Common Failure Patterns
- **Knowledge gaps**: Domain-specific trivia beyond model training
- **Ambiguous inputs**: Questions with subjective or context-dependent answers
- **Model size limitations**: Smaller models lack specialized knowledge

## Analysis Focus
- Compare raw LLM response with final boolean to identify transformation logic
- Distinguish knowledge limitations from boolean extraction errors
- Consider model capabilities when evaluating failures