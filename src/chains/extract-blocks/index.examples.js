import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import extractBlocks from './index.js';
import map from '../map/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { makeWrappedIt, makeWrappedExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { logBatchSchema } from './log-batch-schema.js';

const config = getConfig();
const suite = 'Extract Blocks chain';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);

// Higher-order function to create test-specific loggers
const makeTestLogger = (testName) => {
  return config?.aiMode && globalThis.logger
    ? globalThis.logger.child({ suite, testName })
    : undefined;
};

describe('extract-blocks examples', () => {
  it(
    'should extract log entries from a system log file',
    async () => {
      const logger = makeTestLogger('extract log entries');

      // Simulate a system log with various entries
      const systemLog = `2024-01-15 08:23:45 [INFO] Application started
    Configuration loaded from /etc/app/config.yaml
    Database connection pool initialized with 10 connections
    
2024-01-15 08:23:47 [DEBUG] Processing request ID: 12345
    Headers: Content-Type: application/json
    Body size: 1024 bytes
    
2024-01-15 08:23:48 [ERROR] Failed to process payment
    Error: Card declined
    Transaction ID: TXN-98765
    Customer: john.doe@example.com
    Stack trace:
      at PaymentProcessor.charge (payment.js:45:12)
      at async handlePayment (api.js:234:8)
    
2024-01-15 08:23:50 [WARN] High memory usage detected
    Current: 1.2GB
    Threshold: 1GB
    
2024-01-15 08:23:52 [INFO] Request completed
    Duration: 5.2s
    Status: 200 OK`;

      const instructions = `
      Identify log entries. Each entry:
      - Starts with a timestamp like "2024-01-15 HH:MM:SS [LEVEL]"
      - Includes all indented continuation lines
      - Ends just before the next timestamp or at document end
    `;

      const blocks = await extractBlocks(systemLog, instructions, {
        windowSize: 50,
        overlapSize: 10,
        maxParallel: 2,
        logger,
      });

      // Should extract 5 log entries
      expect(blocks).toHaveLength(5);

      // First entry should be INFO about application start
      expect(blocks[0][0]).toContain('[INFO] Application started');
      expect(blocks[0]).toHaveLength(3);

      // Third entry should be the ERROR with stack trace
      expect(blocks[2][0]).toContain('[ERROR] Failed to process payment');
      expect(blocks[2].some((line) => line.includes('Stack trace'))).toBe(true);

      // Now map these blocks to structured data
      const structuredLogs = await map(
        blocks.map((block) => block.join('\n')),
        `Extract the timestamp, log level, message (first line after level), and any additional details`,
        {
          responseFormat: logBatchSchema,
          logger,
        }
      );

      expect(structuredLogs).toHaveLength(5);

      // Filter out any undefined results from failed extractions
      const validLogs = structuredLogs.filter((log) => log != null);
      expect(validLogs.length).toBeGreaterThan(0);

      validLogs.forEach((log) => {
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('level');
        expect(log).toHaveProperty('message');
      });
    },
    longTestTimeout
  );

  it(
    'should extract transaction records from a financial statement',
    async () => {
      const logger = makeTestLogger('extract transaction records');

      // Simulate a bank statement with transactions
      const statement = `CHECKING ACCOUNT STATEMENT
Account Number: ****1234
Statement Period: 01/01/2024 - 01/31/2024

TRANSACTIONS

01/03/2024
  DEPOSIT - Direct Deposit
  EMPLOYER PAYROLL
  Reference: DD20240103001
  Amount: +$3,500.00
  Balance: $4,250.00

01/05/2024
  WITHDRAWAL - Debit Card
  WHOLE FOODS MARKET #10233
  Location: Brooklyn, NY
  Reference: DC20240105002
  Amount: -$127.83
  Balance: $4,122.17

01/08/2024
  TRANSFER - Online Banking
  TO SAVINGS ****5678
  Reference: TR20240108003
  Amount: -$500.00
  Balance: $3,622.17

01/10/2024
  WITHDRAWAL - ATM
  CHASE ATM BROOKLYN NY
  Fee: $3.00
  Reference: ATM20240110004
  Amount: -$200.00
  Balance: $3,419.17

01/15/2024
  PAYMENT - Bill Pay
  CONSOLIDATED EDISON
  Account: 123-456-789
  Reference: BP20240115005
  Amount: -$145.62
  Balance: $3,273.55

END OF STATEMENT`;

      const instructions = `
      Identify transaction blocks. Each transaction:
      - Starts with a date in MM/DD/YYYY format
      - Includes all indented details below it
      - Ends just before the next date, "END OF STATEMENT", or blank line
    `;

      const blocks = await extractBlocks(statement, instructions, {
        windowSize: 60,
        overlapSize: 15,
        logger,
      });

      // Should extract 5 transactions
      expect(blocks).toHaveLength(5);

      // Each block should start with a date
      blocks.forEach((block) => {
        expect(block[0]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      });

      // Check specific transaction details
      const depositBlock = blocks[0];
      expect(depositBlock.some((line) => line.includes('DEPOSIT'))).toBe(true);
      expect(depositBlock.some((line) => line.includes('+$3,500.00'))).toBe(true);

      const atmBlock = blocks[3];
      expect(atmBlock.some((line) => line.includes('ATM'))).toBe(true);
      expect(atmBlock.some((line) => line.includes('Fee: $3.00'))).toBe(true);
    },
    longTestTimeout
  );

  it(
    'should extract code blocks from markdown documentation',
    async () => {
      const logger = makeTestLogger('extract code blocks');

      const markdown = `# API Documentation

## Authentication

All API requests require authentication using an API key.

\`\`\`javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
\`\`\`

## Making Requests

Here's how to make a basic GET request:

\`\`\`javascript
async function getUser(userId) {
  const response = await fetch(\`/api/users/\${userId}\`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  
  return response.json();
}
\`\`\`

And here's a POST example:

\`\`\`javascript
async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(userData)
  });
  
  return response.json();
}
\`\`\`

## Error Handling

Always handle errors appropriately in your code.`;

      const instructions = `
      Identify code blocks in markdown. Each code block:
      - Starts with three backticks and optional language identifier
      - Includes all lines until closing three backticks
      - The closing backticks should be included in the block
    `;

      const blocks = await extractBlocks(markdown, instructions, {
        windowSize: 40,
        overlapSize: 10,
        logger,
      });

      // Should extract 3 code blocks
      expect(blocks).toHaveLength(3);

      // Each block should start with ``` and end with ```
      blocks.forEach((block) => {
        expect(block[0]).toContain('```');
        expect(block[block.length - 1]).toBe('```');
      });

      // First block should be about headers
      expect(blocks[0].some((line) => line.includes('Authorization'))).toBe(true);

      // Second block should define getUser function
      expect(blocks[1].some((line) => line.includes('async function getUser'))).toBe(true);

      // Third block should define createUser function
      expect(blocks[2].some((line) => line.includes('async function createUser'))).toBe(true);
    },
    longTestTimeout
  );
});
