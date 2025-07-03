# search-js-files

Advanced JavaScript code analysis tool that traverses function dependencies and imports using best-first search algorithms.

This utility performs intelligent analysis of JavaScript codebases by following import chains and function relationships to map code dependencies and discover related functionality.

## Usage

```javascript
import searchJsFiles from './src/lib/search-js-files/index.js';

// Analyze function dependencies starting from an entry point
const results = await searchJsFiles({
  node: { filename: './src/main.js' },
  maxNodes: 50,
  includeNodeModules: false
});

// Custom analysis with visitor pattern
const analysis = await searchJsFiles({
  node: { filename: './src/api/index.js', functionName: 'processRequest' },
  visit: ({ node, state }) => {
    console.log(`Analyzing: ${node.filename} - ${node.functionName}`);
    return { ...state, analyzed: [...(state.analyzed || []), node] };
  },
  maxNodes: 100
});
```

## API

### `searchJsFiles(options)`

**Parameters:**
- `node` (object, required): Starting point for analysis
  - `filename` (string): Path to the JavaScript file
  - `functionName` (string, optional): Specific function to analyze
- `visit` (function, optional): Visitor function called for each analyzed node
- `next` (function, optional): Custom function to determine next nodes to visit
- `includeNodeModules` (boolean, default: false): Whether to analyze npm dependencies
- `maxNodes` (number, optional): Maximum number of nodes to analyze
- `...options`: Additional options passed to the underlying search algorithm

**Returns:**
- Search results containing analyzed nodes and their relationships

**Features:**
- **Dependency Mapping**: Traces function calls and import relationships
- **Best-First Search**: Intelligent traversal prioritizing relevant code paths
- **Import Resolution**: Handles both local and npm module imports
- **Function Analysis**: Parses and analyzes JavaScript function definitions
- **Visitor Pattern**: Extensible analysis through custom visitor functions

## Use Cases

### Code Dependency Analysis
```javascript
// Map all dependencies from an entry point
const dependencies = await searchJsFiles({
  node: { filename: './src/index.js' },
  visit: ({ node, state }) => {
    const deps = state.dependencies || new Set();
    deps.add(`${node.filename}:${node.functionName || 'module'}`);
    return { ...state, dependencies: deps };
  },
  maxNodes: 200
});
```

### Function Call Graph Generation
```javascript
// Build a call graph for specific functions
const callGraph = await searchJsFiles({
  node: { filename: './src/utils.js', functionName: 'processData' },
  visit: ({ node, state }) => {
    const graph = state.graph || {};
    const key = `${node.filename}:${node.functionName}`;
    graph[key] = node.functionData || {};
    return { ...state, graph };
  },
  includeNodeModules: false
});
```

### Dead Code Detection
```javascript
// Find unused functions and modules
const analysis = await searchJsFiles({
  node: { filename: './src/main.js' },
  visit: ({ node, state }) => {
    const visited = state.visited || new Set();
    visited.add(node.filename);
    return { ...state, visited };
  },
  maxNodes: 500
});

// Compare with all files to find unvisited ones
```

### Import Chain Analysis
```javascript
// Trace import chains and circular dependencies
const importChains = await searchJsFiles({
  node: { filename: './src/app.js' },
  visit: ({ node, state }) => {
    const chain = state.chain || [];
    const newChain = [...chain, node.filename];
    
    // Detect circular imports
    if (chain.includes(node.filename)) {
      console.warn('Circular import detected:', newChain);
    }
    
    return { ...state, chain: newChain };
  }
});
```

## Advanced Usage

### Custom Search Strategy
```javascript
// Implement custom node ranking and selection
const customSearch = await searchJsFiles({
  node: { filename: './src/core.js' },
  next: ({ state }) => {
    // Custom logic to determine next nodes
    const { functions, imports } = state.jsElements;
    return functions.filter(f => f.functionName.includes('process'));
  },
  visit: ({ node, state }) => {
    // Custom analysis logic
    return { ...state, processed: (state.processed || 0) + 1 };
  }
});
```

### Performance Optimization
```javascript
// Limit analysis scope for large codebases
const focusedAnalysis = await searchJsFiles({
  node: { filename: './src/critical-path.js' },
  maxNodes: 50,
  includeNodeModules: false,
  visit: ({ node, state }) => {
    // Only analyze critical functions
    if (node.functionName?.includes('critical')) {
      return { ...state, criticalFunctions: [...(state.criticalFunctions || []), node] };
    }
    return state;
  }
});
```

### Integration with Build Tools
```javascript
// Analyze code during build process
async function analyzeBuildDependencies(entryPoint) {
  const analysis = await searchJsFiles({
    node: { filename: entryPoint },
    visit: ({ node, state }) => {
      const modules = state.modules || new Map();
      modules.set(node.filename, {
        functions: node.functionData,
        dependencies: state.jsElements?.imports || []
      });
      return { ...state, modules };
    },
    includeNodeModules: true,
    maxNodes: 1000
  });
  
  return analysis.modules;
}
```

## Node Structure

The search operates on Node objects with the following structure:

```javascript
{
  filename: string,        // Path to the JavaScript file
  functionName: string,    // Name of the function (optional)
  functionData: object,    // Parsed function metadata
  // ... additional properties from parsing
}
```

## Related Modules

- [`parse-js-parts`](../parse-js-parts/) - JavaScript parsing and analysis
- [`search-best-first`](../search-best-first/) - Best-first search algorithm implementation
- [`grep-search`](../../grep-search/) - Text-based pattern searching

## Error Handling

```javascript
try {
  const results = await searchJsFiles({
    node: { filename: './src/main.js' },
    maxNodes: 100
  });
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('File not found:', error.path);
  } else if (error.message.includes('Parse error')) {
    console.error('JavaScript parsing failed:', error.message);
  } else {
    console.error('Analysis failed:', error.message);
  }
}
```

## Performance Considerations

- Use `maxNodes` to limit analysis scope in large codebases
- Set `includeNodeModules: false` to avoid analyzing external dependencies
- Implement efficient visitor functions to minimize processing overhead
- Consider file size and complexity when setting analysis limits

This tool is designed for sophisticated code analysis scenarios where understanding function relationships and import dependencies is crucial for refactoring, optimization, or architectural decisions. 