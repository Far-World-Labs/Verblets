# name

Generate a short, memorable name for any piece of data. The verblet asks an LLM to suggest a concise variable-style name.

```javascript
import name from './index.js';

const datasetName = await name('A spreadsheet of every pastry I ate on my travels across Europe');
// => 'travelPastryLog'
```

## Use case: sharing family stories

Imagine scanning the handwritten letters your grandparents exchanged during the war. Instead of calling the folder `old_letters_scans`, let the verblet propose something warmer:

```javascript
const title = await name('Digital scans of my grandparents\' wartime letters');
```

Now you have a friendly label for a piece of personal history.
