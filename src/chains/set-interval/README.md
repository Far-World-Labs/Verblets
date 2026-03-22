# setInterval

AI alternative to `setInterval`. The AI decides *when* to fire next based on a prompt, context data, and timing history. Use it for self-tuning workflows, adaptive polling, or creative generators.

```javascript
import { setInterval } from '@far-world-labs/verblets';

const stop = setInterval({
  prompt: `
    Based on upcoming celestial events and weather, decide when to check next
    for photography opportunities.
    Current conditions: {cloudCover}% clouds
    Upcoming events: {events}
  `,

  async getData() {
    const weather = await getWeather({ days: 1 });
    const events = await getCelestialEvents({ days: 7 });
    return {
      cloudCover: weather.current.cloudCover,
      events: events.map(e => `${e.name} - ${e.description}`).join('\n')
    };
  },

  async onTick({ timingString, data, nextDate }) {
    console.log(`Photography window! Next check: ${timingString}`);
  }
});

// Call stop() to cancel
```

The AI sees the cloud cover and event schedule and might decide to check back in 20 minutes (meteor shower approaching with clear skies) or 6 hours (overcast, nothing upcoming).

## API

### `setInterval(options)`

- **prompt** (string, required): Instructions for timing decisions. Supports `{variable}` interpolation from `getData` results
- **getData** (function, required): Called each tick to supply fresh data. Return value properties become prompt variables
- **onTick** (function): Called when the timer fires, receives `{ timingString, data, nextDate }`
- **historySize** (number, default 5): How many past timing decisions the AI can see
- **initial** (any): Initial data before the first `getData` call
- **llm** (string|Object): LLM model configuration

**Returns:** Function to stop the timer.
