# setInterval

AI-guided replacement for `setInterval`.
Feed it your own natural-language heuristic; it will keep time, remember history, and supply your callback with rich context so you can build self-tuning workflows, creative generators, or living UIs.

## Example: Photography Alarm

*Because the universe waits for no one (but this will wait for the universe).*

```javascript
import setInterval from './index.js';
import { getWeather, getCelestialEvents } from './apis.js';
import chatGPT from '../../lib/chatgpt/index.js';

const stop = setInterval({
  prompt: `
    Based on upcoming celestial events and weather, decide when to check next 
    for photography opportunities. 
    
    Current conditions: {cloudCover}% clouds
    
    Upcoming celestial events: 
    <options>
    {events}
    <options>
  `,
  
  // Called every time to get data for AI scheduling decisions
  async getData() {
    const weather = await getWeather({ days: 1 });
    const events = await getCelestialEvents({ days: 7 });
    
    return {
      cloudCover: weather.current.cloudCover,
      events: events.map(e => `${e.name} - ${e.description}`).join('\n')
    };
  },
  
  // Called when the tick happens - handle the scheduled event
  async onTick({ timingString, data, nextDate }) {
    // Get current conditions for photography
    const currentWeather = await getWeather({ hours: 1 });
    const currentEvents = await getCelestialEvents({ 
      hours: 1, 
      types: ['solar', 'lunar', 'meteor', 'planetary', 'aurora', 'eclipse'] 
    });
    
    const description = await chatGPT(`
      Describe what celestial event should be photographed right now based on current conditions.
      Current Weather: ${JSON.stringify(currentWeather)}
      Current Events: ${JSON.stringify(currentEvents)}
      
      Provide a clear description of the photography opportunity.
    `);
    
    console.log(description);
    console.log(`Next check in: ${timingString} (${nextDate.toLocaleString()})`);
  }
});

## API Reference

### `setInterval(options)`

Creates an AI-guided interval timer that uses natural language to determine timing.

#### Parameters

- **`prompt`** (string, required): Instructions for AI timing decisions. Supports `{variable}` interpolation from `getData` results
- **`getData`** (function, required): Called to get data for AI decisions. Should return an object whose properties can be used as `{variable}` in the prompt
- **`historySize`** (number, default: 5): How many timing decisions to remember
- **`initial`** (any, default: null): Initial data to start with
- **`model`** (string, optional): AI model to use
- **`llm`** (object, optional): Model configuration
- **`onTick`** (function, optional): Called when the tick happens

#### Returns

Function to stop the interval timer.
