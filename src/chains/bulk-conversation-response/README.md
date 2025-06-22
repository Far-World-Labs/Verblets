# bulk-conversation-response

Generate short comments for many speakers in parallel using `bulkMapRetry`.
Each comment responds to the topic and recent history in a single sentence.

```javascript
import bulkConversationResponse from './index.js';

const speakers = [{ id: 'a' }, { id: 'b' }];
const comments = await bulkConversationResponse({
  speakers,
  topic: 'school fair',
});
console.log(comments);
```
