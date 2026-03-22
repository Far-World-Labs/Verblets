# phail-forge

Transform a basic prompt into an expert-level one. Analyzes the domain, adds precise terminology and terms of art, includes quality defaults, and structures the result with clear specifications — producing the prompt you *would* have written if you were already an expert in the subject.

Exported as both `phailForge` and `makePrompt`.

```javascript
import { makePrompt } from '@far-world-labs/verblets';

const result = await makePrompt('write a REST API for user management');

console.log(result.enhanced);
// "Design and implement a RESTful API for user lifecycle management following
//  OpenAPI 3.0 specification. Include CRUD operations with proper HTTP method
//  semantics (GET for retrieval, POST for creation, PUT/PATCH for updates,
//  DELETE for removal). Implement authentication via JWT with refresh token
//  rotation, role-based access control (RBAC) with at minimum admin/user/guest
//  roles, input validation using JSON Schema, ..."

console.log(result.improvements);
// [
//   { category: 'specificity', description: 'Added OpenAPI 3.0 spec requirement' },
//   { category: 'technical', description: 'Specified JWT with refresh token rotation' },
//   { category: 'defaults', description: 'Included pagination, rate limiting, CORS' },
// ]

console.log(result.keywords);
// ['RESTful', 'CRUD', 'JWT', 'RBAC', 'OpenAPI', 'idempotent', ...]

console.log(result.metadata);
// { domain: 'web development', complexity: 'intermediate', expansionRatio: 4.2 }
```

## API

### `phailForge(prompt, config)` / `makePrompt(prompt, config)`

- `prompt` (string, required): The original prompt to enhance
- `config` (Object):
  - `analyze` (boolean): Run a second LLM call to critique the enhanced prompt, returning strengths, opportunities, and improvement suggestions. Default: `false`
  - `style` (string): Enhancement style hint passed to the LLM. Default: `'technical'`
  - `context` (string): Additional domain context to guide enhancement
  - `llm` (string|Object): LLM configuration

**Returns:** `Promise<Object>` with:
- `enhanced` (string): The expert-level prompt
- `improvements` (Array): Key improvements made, each with `category` and `description`
- `keywords` (Array): Technical terms and jargon added
- `metadata` (Object): `domain`, `complexity` level, `expansionRatio`
- `analysis` (Object, if `analyze: true`): `strengths`, `opportunities`, `suggestions`
