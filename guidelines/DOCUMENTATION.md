# Documentation Guidelines

Documentation serves different audiences and purposes across the system. Each type should be clear, concise, and high signal-to-noise ratio.

## Documentation Types

### Module README Files
**Purpose**: Help developers understand and use individual modules  
**Audience**: Developers implementing or integrating the module

**Structure Requirements**:
1. **Title**: Module name only (no redundant "README" or verbose descriptions)
2. **Brief description**: One sentence explaining what the module does and when to use it
3. **Cross-references**: Link to related modules (variants, alternatives) early
4. **Usage example**: Practical, relatable scenario showing core functionality
5. **API documentation**: Parameters, return values, configuration options
6. **Features** (Optional): Only for modules with genuinely powerful or non-obvious capabilities
7. **Integration patterns**: How it works with other modules (if applicable)

**Quality Standards**:
- **Lead with salient, differentiating benefits** - what makes this uniquely powerful
- **Show natural language parameters** - verblets and chains accept natural language instructions/prompts
- **Examples should showcase unique AI capabilities** - things computers can't currently do easily
- **Use defaults in examples** - don't complicate with non-functional details like bulk processing
- Use realistic, non-trivial examples that demonstrate practical value
- Show actual return values, not just parameter lists
- **List non-functional benefits after core capabilities** - parallel processing, batching, etc. are important but secondary
- Group related configuration options logically
- Avoid redundant explanations between sections
- Link to shared design concepts rather than repeating them
- Each bullet point in lists must add unique value

**Anti-patterns**:
- Verbose introductions explaining obvious concepts
- Repeating the module name unnecessarily
- **Boring or obvious examples** - avoid simple string manipulation or basic operations
- **Code-only examples** - missing the natural language instruction/prompt parameters
- Lists of benefits where items overlap or are obvious
- Copying boilerplate text between similar modules
- Explaining implementation details users don't need
- **Bullet point use cases** - always show code examples instead of generic bullet lists
- **Separate "Examples" sections** - integrate examples directly into Use Cases
- **Sub-example variations** - avoid multiple similar examples within one use case that are variations on the same theme

### Root-Level README
**Purpose**: Project overview and getting started guide  
**Audience**: New contributors, users evaluating the project

**Must Include**:
- Project purpose and scope
- Installation and setup instructions
- Architecture overview with links to detailed documentation
- Contribution guidelines reference
- License and project status

### Module Parent Level README (chains/, verblets/, lib/)
**Purpose**: Explain the category and help choose between modules  
**Audience**: Developers selecting the right module for their needs

**Must Include**:
- Category definition and use cases
- Decision matrix or selection criteria
- Links to individual modules with brief descriptions
- Shared design principles (link to DESIGN.md)

### Guidelines Files (guidelines/)
**Purpose**: Define standards for architecture tests and code quality  
**Audience**: Architecture tests, contributors maintaining code quality

**Must Include**:
- Specific, testable criteria
- Examples of correct and incorrect implementations
- Rationale for rules when not obvious
- Clear pass/fail conditions for automated testing

### Design Files (DESIGN.md at parent levels)
**Purpose**: Document architectural decisions and design patterns  
**Audience**: Contributors understanding system design, architecture tests

**Must Include**:
- Design principles and rationale
- Common patterns and anti-patterns
- Technical constraints and trade-offs
- Integration guidelines between modules

## Writing Standards

### Clarity
- Write for busy developers who scan before reading
- Lead with the most important information
- Use concrete examples over abstract descriptions
- Prefer active voice and present tense

### Conciseness
- Every sentence must add unique value
- Combine redundant information rather than repeating it
- Use bullet points for scannable lists
- Link to shared concepts rather than explaining them repeatedly

### Accuracy
- Keep examples up-to-date with actual API
- Test code examples to ensure they work
- Maintain consistency in terminology across files
- Update cross-references when modules change

### Organization
- Structure information by user priority, not internal logic
- Group related concepts together
- Use consistent heading hierarchy
- Provide clear navigation between related documents

## Examples

Good documentation examples to reference:
- **[set-interval chain](../src/chains/set-interval/)** - Shows adaptive behavior through natural language programming
- **Main README** - Long orchestration example demonstrating AI workflow power

Key practices demonstrated:
- Natural language parameters that express complex logic
- Examples showcasing unique AI capabilities (adaptive timing, contextual reasoning)
- Real-world scenarios that would be difficult with traditional code
- Well-organized API documentation
- Integration examples showing ecosystem usage

## Maintenance

- Review documentation when changing module APIs
- Update cross-references when adding or removing modules
- Consolidate information when multiple files cover similar topics
- Remove outdated examples and references
- Ensure architectural tests validate these guidelines 

### Anti-patterns to Avoid
- Generic use cases that could apply to any module
- Excessive lists of similar examples
- Contrived scenarios that don't reflect real usage
- Configuration examples without meaningful context
- Bullet point use cases - always show code examples instead of generic bullet lists
- Separate "Examples" sections - integrate examples directly into Use Cases
- Sub-example variations - avoid multiple similar examples within one use case that are variations on the same theme
- **Generic "Advanced Usage" sections** - don't create Advanced Usage sections that only show basic model configuration (llm options, temperature, etc.) unless there's genuinely advanced functionality beyond standard config

### Advanced Usage Guidelines

**Only include "Advanced Usage" sections when showing functionality that goes beyond basic model configuration.**

**Generic model configuration (temperature, maxTokens, modelName, etc.) should be documented in:**
- Core library documentation (`src/lib/chatgpt/README.md`)
- Main chains documentation (`src/chains/README.md`) 
- Main verblets documentation (`src/verblets/README.md`)

**Advanced Usage sections should only exist for:**
- Complex integration patterns specific to that module
- Specialized configuration options unique to that module
- Multi-step workflows that demonstrate advanced capabilities
- Error handling patterns specific to that module's domain
- Performance optimization techniques for that specific use case

**Examples of what NOT to include in Advanced Usage:**
```javascript
// DON'T - This is just basic model configuration
const result = await myFunction(input, {
  llm: {
    temperature: 0.1,
    maxTokens: 150
  }
});
```

**Examples of what TO include in Advanced Usage:**
```javascript
// DO - This shows module-specific advanced functionality
const result = await complexChain(input, {
  stages: ['analyze', 'transform', 'validate'],
  retryStrategy: 'exponential',
  fallbackMode: 'graceful'
});
``` 

### Features Section Guidelines

**Only include a Features section when the module has:**
- Genuinely powerful capabilities not obvious from the description/example
- Exotic or advanced features that aren't immediately apparent
- Sophisticated algorithms or processing strategies worth highlighting

**Common features to avoid listing:**
- Basic bulk processing or parallelism (standard for chains)
- Standard LLM integration patterns
- Basic error handling or retries
- Simple configuration options

**Examples of when to include Features:**
- Advanced windowing algorithms (like join chain's overlapping windows)
- Sophisticated scoring or ranking systems
- Complex multi-step processing workflows
- Unique optimization strategies
- Advanced parsing or analysis capabilities

**Format:**
- Keep features concise (1-2 lines each)
- Focus on what makes the module special
- Avoid generic capabilities that apply to most modules 
