export const transactionBatchSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'transaction_batch',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Transaction date in YYYY-MM-DD format',
              },
              merchant: {
                type: 'string',
                description: 'Merchant or vendor name',
              },
              amount: {
                type: 'number',
                description: 'Transaction amount as a number (no $ sign)',
              },
              location: {
                type: 'string',
                description: 'Location (city/state) if available, empty string if not',
              },
              category: {
                type: 'string',
                enum: [
                  'food',
                  'transport',
                  'entertainment',
                  'shopping',
                  'utilities',
                  'health',
                  'financial',
                  'other',
                ],
                description: 'Transaction category',
              },
            },
            required: ['date', 'merchant', 'amount', 'location', 'category'],
          },
        },
      },
      required: ['items'],
    },
  },
};
