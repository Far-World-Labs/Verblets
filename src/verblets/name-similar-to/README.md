# name-similar-to

Generate a short, catchy name for something using the style of existing names. This verblet relies on a language model to capture the tone and brevity of your sample names.

```javascript
import nameSimilarTo from './index.js';

const newName = await nameSimilarTo(
  'dataset of daily coffee tasting notes',
  ['BeanDiary', 'RoastLog', 'BrewIndex']
);
// => 'TastingLog'
```

## Example: naming a hiking journal

Imagine cataloging your weekend trail adventures. You already use names like `TrailNotes`, `GearTips`, and `CampfireStories`. Ask the verblet to suggest a matching name for your wildlife sightings log:

```javascript
const exampleNames = ['TrailNotes', 'GearTips', 'CampfireStories'];
const wildlifeLog = await nameSimilarTo(
  'journal of wildlife spotted on each hike',
  exampleNames
);
// => 'WildlifeWatch'
```
