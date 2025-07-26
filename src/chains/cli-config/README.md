# cli-config

Translate a natural language CLI request into a structured configuration object. Large configuration specs are processed in chunks using `bulkReduce` so you always end up with valid values.

```javascript
import cliConfig from './index.js';

const spec = {
  port: { default: 8080 },
  env: { default: 'development', enum: ['development', 'production'] },
};

const cfg = await cliConfig('run in production on port 3000', spec);
// => { port: 3000, env: 'production' }
```
