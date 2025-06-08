import llmExpect, { expect } from './index.js';

console.log('🧪 LLM Expect Chain Examples\n');

// Example 1: Basic usage with structured results
console.log('1. Basic usage with structured results');
const [passed1, details1] = await expect('Hello world!', 'Is this a greeting?');
console.log(`✅ Passed: ${passed1}`);
console.log(`📍 Location: ${details1.file}:${details1.line}`);
console.log(`🔍 Advice: ${details1.advice || 'None (passed)'}\n`);

// Example 2: Environment mode demonstration - info mode
console.log('2. Environment mode - info mode (logs failures)');
process.env.LLM_EXPECT_MODE = 'info';
try {
  const [passed2] = await expect(
    'This is terrible content',
    'Is this high-quality, professional content?'
  );
  console.log(`Result: ${passed2}`);
} catch (error) {
  console.log('Unexpected error:', error.message);
}
console.log();

// Example 3: Environment mode - error mode
console.log('3. Environment mode - error mode (throws on failure)');
process.env.LLM_EXPECT_MODE = 'error';
try {
  await expect('goodbye', 'hello');
} catch (error) {
  console.log('❌ Caught expected error:');
  console.log(error.message.split('\n')[0]); // Just the first line
}
console.log();

// Reset to none mode for remaining examples
process.env.LLM_EXPECT_MODE = 'none';

// Example 4: Content quality assessment
console.log('4. Content quality assessment');
const marketingCopy =
  'Welcome to our premium service! We offer 24/7 support, a 30-day money-back guarantee, and industry-leading security. Contact us today to get started!';
const [passed4, details4] = await expect(
  marketingCopy,
  'Is this marketing copy professional, includes specific benefits, and has a clear call-to-action?'
);
console.log(`✅ Marketing copy quality: ${passed4}`);
console.log(`📊 Details available: ${Object.keys(details4).join(', ')}\n`);

// Example 5: Data validation
console.log('5. Data validation');
const userData = {
  name: 'Alice Johnson',
  age: 28,
  email: 'alice@company.com',
  role: 'Senior Developer',
  skills: ['JavaScript', 'Python', 'React', 'Node.js'],
};
const [passed5, details5] = await expect(
  userData,
  'Does this user profile look realistic and professionally complete?'
);
console.log(`✅ User data validation: ${passed5}`);
console.log(`📍 Validated at: ${details5.file}:${details5.line}\n`);

// Example 6: Business logic validation
console.log('6. Business logic validation');
const businessDecision = {
  action: 'Increase marketing budget by 25% for Q4',
  reasoning: 'Q3 sales exceeded targets by 40%, customer acquisition cost decreased by 15%',
  timeline: 'Implement by October 1st',
  expectedOutcome: 'Capture holiday season demand and maintain growth momentum',
};
const [passed6, details6] = await expect(
  businessDecision,
  'Is this business decision well-reasoned, specific, and includes clear timeline and expected outcomes?'
);
console.log(`✅ Business decision validation: ${passed6}`);
console.log(`🎯 Decision quality confirmed\n`);

// Example 7: Creative content evaluation
console.log('7. Creative content evaluation');
const storyOpening =
  'In the bustling city of Neo-Tokyo, where neon lights painted the night sky in electric blues and pinks, Maya discovered an ancient artifact that would change everything she thought she knew about reality.';
const [passed7, details7] = await expect(
  storyOpening,
  'Is this story opening engaging, vivid, and sets up an intriguing premise?'
);
console.log(`✅ Story opening quality: ${passed7}`);
console.log(`📝 Creative content validated\n`);

// Example 8: Backward compatibility with simple API
console.log('8. Backward compatibility - simple API');
const simpleResult = await llmExpect('Thank you for your inquiry', 'Is this a polite response?');
console.log(`✅ Simple API result: ${simpleResult}`);
console.log(`🔄 Fully backward compatible\n`);

// Example 9: Comparative analysis
console.log('9. Comparative analysis');
const oldVersion = 'Our product is good and reliable.';
const newVersion =
  'Our enterprise-grade solution delivers 99.9% uptime, reduces operational costs by 30%, and includes 24/7 expert support with guaranteed 2-hour response times.';
const [passed9, details9] = await expect(
  newVersion,
  oldVersion,
  'Is the new version significantly more specific, compelling, and informative than the old version?'
);
console.log(`✅ Version comparison: ${passed9}`);
console.log(`📈 Improvement validated\n`);

// Example 10: Error handling and edge cases
console.log('10. Error handling');
try {
  // This should fail - no expected value or constraint
  await expect('test value');
} catch (error) {
  console.log(`❌ Expected error caught: ${error.message.split(':')[0]}`);
}

// Valid constraint-only usage
const [passed10] = await expect(
  { temperature: 72, humidity: 45, pressure: 1013 },
  'Do these weather readings look realistic?'
);
console.log(`✅ Constraint-only validation: ${passed10}\n`);

console.log('🎉 All chain examples completed!');
console.log('\n📚 Key Features Demonstrated:');
console.log('  • Structured results with file/line info');
console.log('  • Environment variable modes (none/info/error)');
console.log('  • Advanced debugging capabilities');
console.log('  • Backward compatibility');
console.log('  • Content quality assessment');
console.log('  • Data and business logic validation');
console.log('  • Creative content evaluation');
console.log('  • Comparative analysis');
console.log('  • Robust error handling');
