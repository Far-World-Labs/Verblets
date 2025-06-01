# Verblets

Verblets rebuild the basic operations of software with language model intelligence. Each verblet takes a combination of natural language and structured input and returns structured data. Like applications, verblets are powerful utilities on their own, or they can be strategically applied to in traditional software.  

## Examples

```javascript
// Make complex decisions with context
await bool(
  `Should we deploy this change?
   <git>
   Files: 3 changed (150+, 20-)
   Tests: 247 passing
   Time: Friday 4:45 PM
   </git>`
); // Returns: false (risky deploy time)

// Generate and sort large lists by any criteria
await sort(list("music merch for teens"), "by likelihood of driving business growth in Q3");

// Break down complex systems into components
await dismantle("AirPods Pro");
/* Returns:
{
  "name": "AirPods Pro",
  "components": [
    { "name": "H2 Chip", "role": "audio_processing" },
    { "name": "Drivers", "type": "custom_dynamic" },
    { "name": "Noise Sensors", "count": 2 },
    { "name": "Battery", "type": "lithium_ion" }
  ]
}
*/

// Generate intelligent questions to explore topics
await questions("why isn't my sourdough starter rising?");
/* Returns:
[
  "What's the room temperature where you keep it?",
  "When was it last fed?",
  "What type of flour are you using?",
  "What's the feeding ratio?"
]
*/

// Structure natural descriptions into data
await toObject(
  "Grandma's chicken soup: simmered for 3 hours with carrots, celery, and love",
  { type: "Recipe", required: ["cookTime", "ingredients"] }
);
/* Returns:
{
  "name": "Grandma's Chicken Soup",
  "cookTime": "PT3H",
  "ingredients": ["chicken", "carrots", "celery"],
  "method": "simmer"
}
*/

// Structure data in universal formats
await schemaOrg("WWDC 2024");
/* Returns:
{
  "@type": "Event",
  "name": "Apple Worldwide Developers Conference 2024",
  "startDate": "2024-06-10",
  "endDate": "2024-06-14",
  "location": {
    "@type": "Place",
    "name": "Apple Park",
    "addressLocality": "Cupertino"
  }
}
*/
```

## Reference

### Data Extraction

- **enum** - Map language to defined options. LLMs often hallucinate and come up with wildly incorrect output. Many of the verblet functions use the intelligence of an LLM but constrain the output to controlled values that will not break your software.

  ```javascript
  // Map natural questions to specific choices
  const color = await enum(
    "What color should I stop at in traffic?",
    {
      green: 1,   // Safe to go
      yellow: 1,  // Prepare to stop
      red: 1      // Must stop
    }
  ); // Returns: 'red'

- **number-with-units** - Extract, convert, and standardize measurements
  ```javascript
  // Handles any measurement in any format
  const speed = await numberWithUnits("Mach 2.5");
  /* Returns:
  {
    "value": 2716.5,
    "unit": "kilometers_per_hour",
    "original": {
      "value": 2.5,
      "unit": "mach"
    }
  }
  */

- **schema.org** - Structure data using universal formats, enabling radical system interop.
  ```javascript
  // Places, events, products, etc. in standard formats any system can use
  const place = await schemaOrg("Kyoto Station");
  /* Returns:
  {
    "@type": "TrainStation",
    "name": "Kyoto Station",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "JP",
      "addressLocality": "Kyoto"
    },
    "publicTransport": {...}
  }
  */

- **to-object** - Transform unstructured text into structured data
  ```javascript
  // Convert natural descriptions into structured data
  const data = await toObject("A red 2023 Tesla Model 3");
  /* Returns:
  {
    "vehicle": {
      "make": "Tesla",
      "model": "Model 3",
      "year": 2023,
      "color": "red"
    }
  }
  */

  // Enforce specific data structure with schemas
  const carSchema = {
    type: "object",
    properties: {
      make: { type: "string" },
      year: { type: "number" },
      features: { type: "array", items: { type: "string" }}
    },
    required: ["make", "year"]
  };
  
  const structured = await toObject(
    "2024 BMW M3 with heated seats and lane assist",
    carSchema
  );
  /* Returns:
  {
    "make": "BMW",
    "year": 2024,
    "features": [
      "heated seats",
      "lane assist"
    ]
  }
  */
  ```

- **bool** - Transform questions into clear true/false decisions
  ```javascript
  // Evaluate factual queries
  const isCompatible = await bool(
    `Is Python ${versionA} backwards compatible with Python ${versionB} code?`
  ); // Returns: false
  ```

- **number** - Extract numerical values from natural language
  ```javascript
  // Extract numbers from questions about recipes
  const servings = await number(
    "If the recipe serves 6 and I'm cooking for 15 people, how many batches do I need?"
  ); // Returns: 2.5

  // Get numerical answers about everyday situations
  const weeks = await number(
    "My baby is 98 days old - how many weeks is that?"
  ); // Returns: 14

  // Handle questions that can't be answered
  const impossible = await number(
    "How many stars are visible from my backyard?"
  ); // Returns: undefined (depends on location, weather, light pollution)
  ```

### System Analysis

- **dismantle** - Break down complex systems into components
  ```javascript
  const bike = await dismantle("Trek Émonda SLR 9 eTap");
  // Returns:
  // - Carbon Frame (variants: H1.5 Geometry, H2 Geometry)
  //   - 800 Series OCLV Carbon
  //   - Internal Cable Routing
  //   - Integrated Seat Mast
  // - Drivetrain
  //   - SRAM Red eTap AXS (variants: 12-speed, 2x12)
  //   - Power Meter: Quarq DZero
  // - Wheels: Bontrager Aeolus RSL 37V
  //   - Hub: DT Swiss 240
  //   - Carbon Rim (variants: tubeless, clincher)
  //   - Spokes: DT Swiss Aerolite
  // ...continues with full component breakdown
  ```

- **summary-map** - Intelligently summarize mixed content within token budgets
  ```javascript
  // Create a map with a total token budget
  const map = new SummaryMap({ targetTokens: 600 });

  // Add different types of content with weights
  map.set('contract.terms', {
    value: `Pursuant to the stipulations delineated herein, 
    the parties hereto, designated as Party A (the "Grantor") 
    and Party B (the "Grantee"), do hereby irrevocably...`,
    weight: 0.3  // Give it 30% of the token budget
  });

  map.set('app.encryption', {
    value: `
    function encodeDecode(input, seed) {
      let key = _generateKey(seed, input.length);
      return _xorStrings(input, key);
    }

    function _generateKey(seed, length) {
      let curr = seed;
      for (let i = 0; i < length; i++) {
        curr = (1664525 * curr + 1013904223) % 4294967296;
        key += String.fromCharCode(curr % 256);
      }
      return key;
    }`,
    type: 'code',  // Special handling for code
    weight: 0.7    // Give it 70% of the token budget
  });

  // Get the summarized content
  const result = await map.pavedSummaryResult();
  /* Returns:
  {
    "contract": {
      "terms": "Agreement between Grantor (Party A) and Grantee (Party B) 
                regarding water usage rights, focusing on reasonable use and 
                ecological balance."
    },
    "app": {
      "encryption": `
        function encodeDecode(input, seed)
        function _generateKey(seed, length)
        // Implements XOR-based encryption using a seeded key generator
        // Uses linear congruential generator for key stream
        }`
    }
  }
  */
  ```

### Operations

- **sort** - Sort by any describable criteria
  ```javascript
  await sort(candidates, "by track record of scaling engineering teams");
  ```

- **list** - Generate contextual lists
  ```javascript
  await list("potential failure points in our microservices architecture");
  ```

- **intent** - Understand user intentions and extract structured data
  ```javascript
  // Define what operations your system can handle
  const operations = [
    {
      name: "book-flight",
      parameters: {
        destination: "string",
        date: "string",
        class: "string"
      }
    },
    {
      name: "find-song",
      parameters: {
        lyrics: "string",
        artist: "string?"
      }
    }
  ];

  // It understands flight booking requests
  const flightRequest = await intent({
    text: "I need a business class flight to Tokyo next Friday",
    operations
  });
  /* Returns:
  {
    "queryText": "I need a business class flight to Tokyo next Friday",
    "intent": {
      "operation": "book-flight",
      "displayName": "Book Flight"
    },
    "parameters": {
      "destination": "Tokyo",
      "date": "next Friday",
      "class": "business"
    }
  }
  */

- **auto** - Use function calling to select and prepare operations
  ```javascript
  // First, we have our available functions defined as schemas
  const availableFunctions = [
    {
      "name": "bool",
      "description": "Answer yes/no questions about facts or situations",
      "parameters": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "The question to answer"
          }
        }
      }
    },
    {
      "name": "list",
      "description": "Generate lists of relevant items",
      "parameters": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "What to list"
          }
        }
      }
    },
    // ... many more function definitions ...
  ];

  // When someone has an urgent question
  const result = await auto(
    "Help! My dog just ate an avocado! Is this dangerous?"
  );
  /* First, auto selects the appropriate function:
  {
    "name": "bool",  // Recognizes this needs a yes/no answer
    "arguments": {
      "text": "Help! My dog just ate an avocado! Is this dangerous?"
    },
    "functionArgsAsArray": [
      {
        "text": "Help! My dog just ate an avocado! Is this dangerous?"
      }
    ]
  }
  */

  // Then it automatically runs the selected function internally, passing arguments it extracts
  const answer = await bool(result.arguments.text);
  // Returns: true (yes, it can be dangerous)
  ```

- **questions** - Explore topics through intelligent question generation
  ```javascript

  const investigation = await questions(
    "Why isn't my houseplant thriving?",
    {
      searchBreadth: 0.7,  // Explore more broadly (0-1)
      shouldStop: (q, all) => all.length > 20  // Custom stopping condition
    }
  );
  /* Returns targeted diagnostic questions:
  [
    "Which direction does the window face?",
    "Are the leaves turning yellow or brown?",
    "Is the soil staying wet for long periods?",
    "Are there any visible pests on the leaves?",
    "When was it last repotted?",
    "Is there good drainage in the pot?",
    "What's the humidity level in the room?",
    // ... continues until stopping condition ...
  ]
  */
  ```

- **shorten-text** - Intelligently compress text while preserving meaning
  ```javascript
  // Shorten long content while keeping key information
  const story = `Once upon a time, in a bustling city called Metropolis, 
    there lived a young programmer named Ada. She spent her days writing 
    elegant code and her nights dreaming of artificial intelligence. 
    One day, while debugging a particularly tricky neural network, 
    she discovered something extraordinary...`;

  const shortened = await shortenText(story, {
    targetTokenCount: 20,
    minCharsToRemove: 15
  });
  /* Returns:
     "Once upon a time, in Metropolis, a programmer named Ada 
      spent her days writing code... discovered something extraordinary"
  */

  // Preserve structure while reducing size
  const documentation = `# API Reference
    ## Authentication
    All requests must include an API key in the header.
    The key should be prefixed with 'Bearer '.
    
    ## Rate Limiting
    Requests are limited to 100 per minute.
    Exceeding this will result in a 429 response.
    
    ## Endpoints
    GET /users - Retrieve user list
    POST /users - Create new user
    DELETE /users/{id} - Remove user`;

  const compact = await shortenText(documentation, {
    targetTokenCount: 30,
    minCharsToRemove: 20
  });
  /* Returns:
     "# API Reference
      ## Authentication
      All requests need API key... 'Bearer '
      
      ## Rate Limiting
      100 per minute... 429 response
      
      ## Endpoints
      GET /users...DELETE /users/{id}"
  */
  ```

- **search-best-first** - Intelligently explore solution spaces
  ```javascript
  // Find the best recipe adjustments when ingredients are missing
  const search = new BestFirstSearch({
    initialState: {
      recipe: "Classic Tiramisu",
      missing: ["mascarpone cheese", "ladyfingers"],
      available: ["cream cheese", "pound cake", "whipped cream"]
    },
    goalTest: state => state.substitutions.complete && state.flavor.preserved,
    heuristic: state => state.flavor.similarity
  });

  const path = await search.findPath();
  /* Returns sequence of steps:
  [
    {
      action: "substitute mascarpone",
      details: "Mix 8oz cream cheese with 1/4 cup whipped cream",
      confidence: 0.85
    },
    {
      action: "substitute ladyfingers",
      details: "Slice pound cake, toast until crisp, soak in coffee",
      confidence: 0.75
    },
    {
      action: "adjust ratios",
      details: "Increase coffee soak time to 45 seconds for pound cake",
      confidence: 0.9
    }
  ]
  */

  // Or find the optimal way to refactor complex code
  const refactorPath = await new BestFirstSearch({
    initialState: {
      file: "src/legacy-parser.js",
      metrics: {
        complexity: 85,
        coverage: 0.4,
        maintainability: "D"
      }
    },
    goalTest: state => 
      state.metrics.complexity < 30 && 
      state.metrics.coverage > 0.8 &&
      state.metrics.maintainability === "A",
    heuristic: state => 
      (1 / state.metrics.complexity) * 
      state.metrics.coverage *
      (state.metrics.maintainability === "A" ? 1 : 0.5)
  }).findPath();
  /* Returns optimal refactoring sequence:
  [
    {
      action: "extract function",
      target: "parseNestedBlocks()",
      benefit: "Reduces complexity by 40%"
    },
    {
      action: "add unit tests",
      coverage: ["error handling", "edge cases"],
      benefit: "Coverage increases to 85%"
    },
    {
      action: "implement strategy pattern",
      components: ["BlockParser", "InlineParser"],
      benefit: "Maintainability improves to grade A"
    }
  ]
  */
  ```

- **test-advice** - Get comprehensive testing and code quality insights
  ```javascript
  // Get deep analysis of your code's test coverage and quality
  const insights = await testAdvice("src/payment-processor.js");
  /* Returns array of findings across multiple dimensions:
  [
    {
      "name": "Boundary Testing",
      "expected": "Handle zero-amount transactions",
      "saw": "No validation for $0.00 payments in processPayment()",
      "isSuccess": false
    },
    {
      "name": "Success Scenarios",
      "expected": "Processes standard credit card payment",
      "saw": "Correctly handles Visa/MC format: line 47 validateCard()",
      "isSuccess": true
    },
    {
      "name": "Clean Code",
      "expected": "Single responsibility in transaction logging",
      "saw": "logPayment() mixing business logic with logging: line 92",
      "isSuccess": false
    },
    // ... analyzes across 8 dimensions:
    // - Boundary cases
    // - Success scenarios
    // - Failure modes
    // - Potential defects
    // - Best practices
    // - Clean code principles
    // - Code quality
    // - Refactoring opportunities
  ]
  */
  ```

- **scan-js** - Analyze code for quality and maintainability
  ```javascript
  // Analyze your codebase for maintainability
  const analysis = await scanJs({
    entry: "src/app.js",
    features: "maintainability"
  });
  /* Returns analysis of each function:
  {
    "src/app.js:::handlePayment": {
      "complexity": "low",
      "documentation": "well-documented",
      "sideEffects": "isolated to database calls",
      "errorHandling": "comprehensive",
      "testability": "high"
    },
    "src/app.js:::validateInput": {
      "complexity": "medium",
      "documentation": "needs improvement",
      "sideEffects": "pure function",
      "errorHandling": "basic validation only",
      "testability": "high"
    }
    // ... continues for all functions ...
  }
  */

  // Focus on specific quality aspects
  const security = await scanJs({
    entry: "src/auth/",
    features: "security"
  });
  /* Returns security-focused analysis:
  {
    "src/auth/login.js:::hashPassword": {
      "inputValidation": "sanitizes all inputs",
      "cryptography": "uses current best practices",
      "dataExposure": "no sensitive data in logs",
      "authentication": "implements rate limiting"
    }
    // ... continues for all security-relevant functions ...
  }
  */
  ```

## Contributing

Help us explore what's possible when we rebuild software primitives with intelligence at their core.

## Audio Transcription

The `Transcriber` class captures speech and converts it to text using local CLI tools. By default it stores temporary audio files in `~/.cache/verblets` on Linux or in the directory specified by `VERBLETS_CACHE_DIR`. Files are removed after processing, and you can call `cleanupCache()` to remove any leftover artifacts.

## License

All Rights Reserved - Far World Labs 