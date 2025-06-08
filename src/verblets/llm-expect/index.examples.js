import llmExpect from './index.js';

// Basic equality check
console.log('Testing basic equality...');
try {
  await llmExpect('hello', 'hello');
  console.log('✅ Basic equality passed');
} catch (error) {
  console.log('❌ Basic equality failed:', error.message);
}

// Constraint-based validation
console.log('\nTesting constraint validation...');
try {
  await llmExpect('Hello world!', 'Is this a greeting?');
  console.log('✅ Greeting validation passed');
} catch (error) {
  console.log('❌ Greeting validation failed:', error.message);
}

// Content quality check
console.log('\nTesting content quality...');
try {
  await llmExpect(
    'This is a well-written, professional email with proper grammar and clear intent.',
    'Is this text professional and grammatically correct?'
  );
  console.log('✅ Content quality passed');
} catch (error) {
  console.log('❌ Content quality failed:', error.message);
}

// Data validation
console.log('\nTesting data validation...');
try {
  await llmExpect(
    { name: 'John Doe', age: 30, city: 'New York' },
    'Does this person data look realistic?'
  );
  console.log('✅ Data validation passed');
} catch (error) {
  console.log('❌ Data validation failed:', error.message);
}

// Non-throwing usage
console.log('\nTesting non-throwing mode...');
const result = await llmExpect('goodbye', 'hello', undefined, { throw: false });
console.log(`Non-throwing result: ${result}`);

// Business logic validation
console.log('\nTesting business logic...');
try {
  await llmExpect(
    'Increase marketing budget by 20% for Q4 to boost holiday sales',
    'Is this recommendation specific and actionable?'
  );
  console.log('✅ Business logic passed');
} catch (error) {
  console.log('❌ Business logic failed:', error.message);
}

console.log('\n🎉 All examples completed!');
