# people

Build artificial person profiles with consistent demographics and traits. Useful for creating personas, generating test data, or defining LLM conversation roles.

## Usage

```javascript
// Generate basic personas
const customerPersonas = await people('diverse online shoppers interested in sustainable products', 5);
// Returns array of 5 people with names, demographics, shopping preferences, and sustainability interests

// Create specific professional profiles
const teamMembers = await people(`
  Software development team members:
  - Mix of junior and senior developers
  - Different specializations (frontend, backend, DevOps)
  - Varied cultural backgrounds
  - Include personality traits relevant to teamwork
`, 4);

// Generate personas for user research
const targetUsers = await people(`
  Mobile banking app users aged 25-40:
  - Various income levels
  - Different tech comfort levels
  - Include their banking habits and pain points
  - Add relevant life circumstances (students, parents, professionals)
`, 10);
```

## API

### `people(description, count, config)`

**Parameters:**
- `description` (string): Natural language description of the people to generate
- `count` (number): Number of people to create (default: 3)
- `config` (Object): Configuration options
  - `llm` (Object): LLM configuration options

**Returns:** Promise<Array<Object>> - Array of person objects with attributes based on the description

## Features

- **Flexible attributes**: Generated people have properties tailored to your description
- **Consistent profiles**: Each person has internally consistent demographics and traits
- **Diverse generation**: Creates varied personas within your specified parameters
- **Open schema**: Person objects can have any relevant attributes based on context

## Use Cases

### LLM Conversation Roles

```javascript
const panelists = await people(`
  Expert panel for discussing AI ethics:
  - Philosophy professor specializing in ethics
  - Tech industry engineer with ML experience
  - Policy maker focused on technology regulation
  - Patient advocate from healthcare sector
`, 4);

// Use with conversation chains
const discussion = await conversation({
  speakers: panelists.map(p => ({
    id: p.name.toLowerCase().replace(/\s+/g, '-'),
    name: p.name,
    bio: p.background,
    agenda: p.perspective
  })),
  topic: 'Should AI systems be required to explain their decisions?'
});
```

### Test Data Generation

```javascript
const testCustomers = await people(`
  E-commerce customers for order testing:
  - Include full names and addresses
  - Various order histories and preferences
  - Different payment methods
  - Mix of new and returning customers
`, 20);

// Use for testing order processing, recommendations, etc.
```

### User Research Personas

```javascript
const researchPersonas = await people(`
  Target users for fitness tracking app:
  - Age range 20-60
  - Various fitness levels (beginner to athlete)
  - Different motivations (weight loss, training, health)
  - Include daily routines and tech usage
  - Add potential barriers to exercise
`, 8);

// Analyze personas for product requirements
const needs = researchPersonas.map(p => ({
  persona: p.name,
  primaryGoal: p.fitness_motivation,
  challenges: p.exercise_barriers,
  features: suggestFeatures(p) // Your analysis function
}));
```

### Scenario Planning

```javascript
const stakeholders = await people(`
  Stakeholders for urban development project:
  - Local residents (various ages and family situations)
  - Business owners in the area
  - City planning officials
  - Environmental activists
  - Include their main concerns and priorities
`, 12);

// Use for impact analysis and planning
```