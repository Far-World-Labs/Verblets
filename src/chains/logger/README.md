# logger

Batch log messages and emit them using a provided logger.

```javascript
import createLogger from '../../index.js';

const logger = createLogger({ batchSize: 5, flushInterval: 5000 });
logger.info('hello');
```
