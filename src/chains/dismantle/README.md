# dismantle

Break down complex systems into a tree of components using an LLM. `dismantle` creates a `ChainTree` that you can grow to any depth or inspect piece by piece.

## Example

```javascript
import { dismantle, simplifyTree } from './index.js';

// Break down complex systems into components
const chain = dismantle('AirPods Pro');
await chain.makeSubtree({ depth: 1 });
console.log(simplifyTree(chain.getTree()));
/* Returns:
{
  id: '...',
  name: 'AirPods Pro',
  parts: [
    { id: '...', name: 'H2 Chip' },
    { id: '...', name: 'Drivers: custom_dynamic' },
    { id: '...', name: 'Noise Sensors' },
    { id: '...', name: 'Battery: lithium_ion' }
  ]
}
*/
```

## API

### `dismantle(name, [options])`
Returns a `ChainTree` for `name`. `options` lets you override how components are discovered:

- `decompose(component)` – return an array of subcomponent names.
  ```javascript
  const chain = dismantle('Web App', {
    decompose: async ({ name }) => fetch(`/api/parts?for=${name}`).then(r => r.json())
  });
  ```
- `enhance(component)` – enrich a node with metadata or known variants.
  ```javascript
  const chain = dismantle('Server', {
    enhance: async ({ name }) => ({ name, options: await lookUpVariants(name) })
  });
  ```
- `makeId()` – create unique IDs (defaults to `uuid.v4`).
- `enhanceFixes` – text appended to LLM prompts used by `enhance`.
  ```javascript
  const chain = dismantle('Bike', { enhanceFixes: 'Prefer standard part names.' });
  ```
- `decomposeFixes` – text appended to prompts used by `decompose`.

### `ChainTree`
Returned by `dismantle`. Methods:

- `makeSubtree({ depth })` – grow the tree from the root for a number of levels.
  ```javascript
  await chain.makeSubtree({ depth: 2 });
  ```
- `attachSubtree({ find, depth })` – expand a node that matches a predicate.
  ```javascript
  await chain.attachSubtree({ find: (n) => n.name === 'Battery', depth: 1 });
  ```
- `getTree()` – access the internal detailed tree.

### `simplifyTree(node)`
Convert a detailed node or tree into `{ id, name, parts }` for easy consumption.

