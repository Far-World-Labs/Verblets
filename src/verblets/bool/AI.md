# Bool Module Development Notes

## Test Focus
- Show AI outputs from bool decisions
- Analyze the explain-then-answer pattern effectiveness
- Show LLM performance metrics

## Key Innovation: Explain-Then-Answer Pattern
The `explainAndSeparate` technique forces reasoning before output. This two-step process (explanation → answer) dramatically improves accuracy over direct boolean output.

## Model Selection
Upgraded from weaker to stronger models after Mace Windu lightsaber color failures. The performance cost is justified by accuracy gains on factual questions.

## Test Coverage Gaps
Current tests focus on Star Wars trivia. Consider adding:
- Double negatives: "Is it not false that water isn't dry?"
- Compound logic: "Is Paris in France AND Rome in Spain?"
- Implicit context: "Is the sky blue?" (usually yes, but not always)
- Temporal unknowables: "Will Bitcoin hit $1M next year?"
- Self-referential paradoxes: "Is this statement false?"
- Cultural relativity: "Is it polite to burp after eating?" (depends on culture)
- Threshold questions: "Is 5'10\" tall?" (depends on context/population)
- Rhetorical questions: "Isn't life grand?" (not really asking)