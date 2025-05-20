# Verblets

Verblets rebuild the basic operations of software with language model intelligence. Each verblet takes a natural language input and returns structured data, making complex operations as simple as describing what you want.

## Examples

```javascript
// Sort by any criteria you can describe
await sort(products, "by likelihood of driving business growth in Q3");

// Generate contextual lists
await list("SaaS tools that would streamline our development workflow");

// Extract structured data from natural language
await intent("find suppliers who can deliver custom PCBs with a 2-week turnaround");
```

## Reference

### Data Extraction

- **enum** - Map language to defined options
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

  // Handle complex descriptions
  const mood = await enum(
    `How's Spot feeling today?
     <notes>
     - Wagging tail non-stop
     - Brought his favorite toy
     - Finished his breakfast in record time
     - Keeps jumping around the house
     </notes>`,
    {
      happy: 1,
      neutral: 1,
      anxious: 1,
      tired: 1
    }
  ); // Returns: 'happy'

  // Works with domain-specific options
  const nextStep = await enum(
    `Status of patient's fracture:
     - X-ray shows clean break
     - Moderate swelling
     - Patient reports 7/10 pain
     - No nerve damage detected`,
    {
      surgery: 1,
      cast: 1,
      splint: 1,
      'physical therapy': 1
    }
  ); // Returns: 'cast'
  ```

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

  // Works with complex or colloquial descriptions
  const height = await numberWithUnits("twice the height of the Empire State Building");
  /* Returns:
  {
    "value": 828.8,
    "unit": "meters",
    "original": {
      "value": 2,
      "unit": "empire_state_heights",
      "reference": {
        "value": 414.4,
        "unit": "meters"
      }
    }
  }
  */
  ```

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

  const event = await schemaOrg("PyConJP 2024", "Event");
  /* Returns:
  {
    "@type": "Conference",
    "name": "PyConJP 2024",
    "startDate": "2024-10-12",
    "location": {...},
    "offers": {...}
  }
  */
  ```

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

  // Check complex conditions
  const shouldScale = await bool(
    `Should we scale our API cluster?
     <metrics>
     CPU: 85% sustained
     Memory: 70% usage
     Response times: p95 increasing
     Error rate: 0.1%
     </metrics>`
  ); // Returns: true

  // Validate against requirements
  const meetsSpec = await bool(
    `Does this resistor meet our specs?
     Required: 330Ω ±1%, max 1/4W
     Actual: 331Ω ±0.1%, 1/8W`
  ); // Returns: true
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

  // And can find songs from lyrics
  const songRequest = await intent({
    text: 'Find that song that goes "I just gotta tell you how I\'m feeling"',
    operations
  });
  /* Returns:
  {
    "queryText": "Find that song that goes \"I just gotta tell you how I'm feeling\"",
    "intent": {
      "operation": "find-song",
      "displayName": "Find Song"
    },
    "parameters": {
      "lyrics": "I just gotta tell you how I'm feeling"
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
  // Understand a complex topic through guided questions
  const questions = await questions(
    "What's going on with my sourdough starter?"
  );
  /* Returns an array of relevant questions to explore:
  [
    "What color is your sourdough starter currently?",
    "When was the last time you fed it?",
    "What's the room temperature where you keep it?",
    "Do you see any bubbles on the surface?",
    "What flour are you using for feeding?",
    "How does it smell - vinegary, fruity, or off?",
    "What's the consistency - thick, watery, or just right?",
    "Are you using chlorinated tap water?",
    // ... continues with increasingly specific questions ...
  ]
  */

  // Investigate system issues methodically
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

### Voice & Audio

- **transcribe** - Convert speech to text with smart triggers
  ```javascript
  // Listen for specific words in conversation
  const transcriber = new Transcriber(
    "emergency",           // Stop when this word is heard
    5000,                 // Stop after 5s of silence
    2000                  // Continue 2s after trigger word
  );

  // Start listening
  transcriber.startRecording();
  /* During a conversation:
  Person 1: "I think we should review the deployment plan."
  Person 2: "Yes, especially the emergency rollback procedure."
  [transcriber detects "emergency" and keeps listening for 2 more seconds]
  Person 1: "Good point, we should..."
  [transcriber stops and returns]:
  "I think we should review the deployment plan. Yes, especially 
   the emergency rollback procedure. Good point, we should"
  */

  // Get the transcribed text
  const text = transcriber.getText();

  // Great for:
  // - Meeting minutes with focus on key topics
  // - Safety monitoring for trigger words
  // - Voice-activated documentation
  // - Automated support call transcription
  ```

## Contributing

Help us explore what's possible when we rebuild software primitives with intelligence at their core.

## License

All Rights Reserved - Far World Labs 