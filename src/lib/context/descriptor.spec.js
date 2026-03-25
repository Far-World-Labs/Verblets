import { describe, it, expect } from 'vitest';
import { descriptorToSchema } from './descriptor.js';

const healthDescriptor = {
  attribute: 'healthSignal',
  values: ['healthy', 'frustrated', 'at-risk'],
  instruction: 'Classify from support ticket volume and sentiment',
};

const riskDescriptor = {
  attribute: 'riskClass',
  values: ['low', 'medium', 'high'],
  instruction: 'Classify from usage decline rate and contract renewal proximity',
};

describe('descriptorToSchema', () => {
  it('converts a single descriptor to a JSON Schema response_format', () => {
    const schema = descriptorToSchema({ healthSignal: healthDescriptor });

    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('context_population');

    const props = schema.json_schema.schema.properties;
    expect(props.healthSignal.type).toBe('string');
    expect(props.healthSignal.enum).toEqual(['healthy', 'frustrated', 'at-risk']);
    expect(props.healthSignal.description).toBe(healthDescriptor.instruction);
    expect(schema.json_schema.schema.required).toEqual(['healthSignal']);
  });

  it('converts multiple descriptors into a multi-property schema', () => {
    const schema = descriptorToSchema({
      healthSignal: healthDescriptor,
      riskClass: riskDescriptor,
    });

    const props = schema.json_schema.schema.properties;
    expect(Object.keys(props)).toEqual(['healthSignal', 'riskClass']);
    expect(props.riskClass.enum).toEqual(['low', 'medium', 'high']);
    expect(schema.json_schema.schema.required).toEqual(['healthSignal', 'riskClass']);
  });

  it('sets additionalProperties to false', () => {
    const schema = descriptorToSchema({ healthSignal: healthDescriptor });

    expect(schema.json_schema.schema.additionalProperties).toBe(false);
  });

  it('accepts a custom schema name', () => {
    const schema = descriptorToSchema({ healthSignal: healthDescriptor }, 'tenant_context');

    expect(schema.json_schema.name).toBe('tenant_context');
  });

  it('handles empty descriptors', () => {
    const schema = descriptorToSchema({});

    expect(schema.json_schema.schema.properties).toEqual({});
    expect(schema.json_schema.schema.required).toEqual([]);
  });
});
