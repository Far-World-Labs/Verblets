# Sentiment Analysis Verblet

Analyze the emotional tone and sentiment of text using AI-powered natural language understanding. This verblet classifies text as positive, negative, or neutral, enabling applications to respond appropriately to user emotions and feedback.

## Usage
```javascript
await sentiment("I love this!");           // 'positive'
await sentiment("This is terrible");       // 'negative'  
await sentiment("The weather is cloudy");  // 'neutral'
await sentiment("Mixed feelings about this - good quality but expensive"); // 'neutral'
```

## API Reference

### `sentiment(text)`

Analyzes the emotional tone of the provided text and returns a sentiment classification.

**Parameters**

- `text` (string): The text content to analyze for sentiment

**Returns**

- `Promise<string>`: A promise that resolves to one of three sentiment labels:
  - `'positive'`: Text expresses positive emotions, satisfaction, or enthusiasm
  - `'negative'`: Text expresses negative emotions, dissatisfaction, or criticism
  - `'neutral'`: Text is emotionally balanced, factual, or lacks clear emotional indicators
