# bulk-conversation-summary

Produce short closing remarks for many speakers at once. Each remark summarizes the speaker's viewpoint on the topic.

```javascript
import bulkConversationSummary from './index.js';

const speakers = [{ id: 'a' }, { id: 'b' }];
const comments = await bulkConversationSummary({
  speakers,
  topic: 'event wrap-up',
});
console.log(comments);
```
