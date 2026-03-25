/**
 * Targeting Rule AST/viewmodel.
 *
 * A targeting rule is a predicate tree: a conjunction of clauses that,
 * when all satisfied, maps an option to a value. The shape is deliberately
 * system-agnostic — it projects into LaunchDarkly targeting rules,
 * OpenFeature flag definitions, policy functions, SQL WHERE clauses,
 * or any other predicate-based config system.
 *
 * Structure:
 *   Rule  = { clauses: Clause[], option: string, value: string, reasoning?: string }
 *   Clause = { attribute: string, op: Op, values: string[] }
 *   Op     = 'in' | 'startsWith' | 'endsWith' | 'contains' | 'lessThan' | 'greaterThan'
 */

const OPS = ['in', 'startsWith', 'endsWith', 'contains', 'lessThan', 'greaterThan'];

const OP_SET = new Set(OPS);

// ===== Constructors =====

const clause = (attribute, op, values) => ({ attribute, op, values });

const rule = (clauses, option, value, reasoning) => {
  const r = { clauses, option, value };
  if (reasoning !== undefined) r.reasoning = reasoning;
  return r;
};

// ===== Validation =====

const validateClause = (c) => {
  if (!c || typeof c !== 'object') return 'clause must be an object';
  if (typeof c.attribute !== 'string' || c.attribute.length === 0)
    return 'clause.attribute must be a non-empty string';
  if (!OP_SET.has(c.op)) return `clause.op must be one of: ${OPS.join(', ')}`;
  if (!Array.isArray(c.values) || c.values.length === 0)
    return 'clause.values must be a non-empty array';
  return undefined;
};

const validateRule = (r) => {
  if (!r || typeof r !== 'object') return ['rule must be an object'];
  const errors = [];
  if (!Array.isArray(r.clauses) || r.clauses.length === 0)
    errors.push('rule.clauses must be a non-empty array');
  else
    r.clauses.forEach((c, i) => {
      const err = validateClause(c);
      if (err) errors.push(`clauses[${i}]: ${err}`);
    });
  if (typeof r.option !== 'string' || r.option.length === 0)
    errors.push('rule.option must be a non-empty string');
  if (typeof r.value !== 'string') errors.push('rule.value must be a string');
  return errors.length > 0 ? errors : undefined;
};

const validate = (rules) => {
  if (!Array.isArray(rules)) return ['rules must be an array'];
  const errors = [];
  rules.forEach((r, i) => {
    const errs = validateRule(r);
    if (errs) errors.push(...errs.map((e) => `rules[${i}]: ${e}`));
  });
  return errors.length > 0 ? errors : undefined;
};

// ===== Schema (for LLM structured output) =====

const clauseSchema = {
  type: 'object',
  properties: {
    attribute: {
      type: 'string',
      description: 'Context attribute to match (e.g. domain, tenant, plan)',
    },
    op: { type: 'string', enum: OPS, description: 'Match operator' },
    values: { type: 'array', items: { type: 'string' }, description: 'Values to match against' },
  },
  required: ['attribute', 'op', 'values'],
  additionalProperties: false,
};

const ruleSchema = {
  type: 'object',
  properties: {
    clauses: {
      type: 'array',
      items: clauseSchema,
      description: 'Conditions that must all be true for this rule to apply',
    },
    option: { type: 'string', description: 'The config option this rule targets' },
    value: { type: 'string', description: 'The value to use when the clauses match' },
    reasoning: {
      type: 'string',
      description: 'Why this rule is warranted based on observed patterns',
    },
  },
  required: ['clauses', 'option', 'value', 'reasoning'],
  additionalProperties: false,
};

const schema = {
  type: 'object',
  properties: {
    rules: { type: 'array', items: ruleSchema },
  },
  required: ['rules'],
  additionalProperties: false,
};

// ===== Evaluation =====

const OP_FNS = {
  in: (actual, values) => values.includes(actual),
  startsWith: (actual, values) => values.some((v) => String(actual).startsWith(v)),
  endsWith: (actual, values) => values.some((v) => String(actual).endsWith(v)),
  contains: (actual, values) => values.some((v) => String(actual).includes(v)),
  lessThan: (actual, values) => values.some((v) => Number(actual) < Number(v)),
  greaterThan: (actual, values) => values.some((v) => Number(actual) > Number(v)),
};

/**
 * Evaluate a single clause against a context object.
 * @param {object} clauseObj - { attribute, op, values }
 * @param {object} context - { domain: 'medical', plan: 'enterprise', ... }
 * @returns {boolean}
 */
const evaluateClause = (clauseObj, context) => {
  const actual = context[clauseObj.attribute];
  if (actual === undefined) return false;
  const fn = OP_FNS[clauseObj.op];
  return fn ? fn(actual, clauseObj.values) : false;
};

/**
 * Evaluate a rule against a context object.
 * All clauses must match (conjunction).
 * @param {object} ruleObj - { clauses, option, value }
 * @param {object} context - targeting context
 * @returns {boolean}
 */
const evaluateRule = (ruleObj, context) => ruleObj.clauses.every((c) => evaluateClause(c, context));

/**
 * Apply a set of rules to a context, returning the first matching rule's
 * option→value pair, or undefined if nothing matches.
 * @param {object[]} rules
 * @param {object} context
 * @returns {{ option: string, value: string } | undefined}
 */
const applyFirst = (rules, context) => {
  const match = rules.find((r) => evaluateRule(r, context));
  return match ? { option: match.option, value: match.value } : undefined;
};

/**
 * Apply all rules to a context, returning every matching rule's option→value pair.
 * @param {object[]} rules
 * @param {object} context
 * @returns {Array<{ option: string, value: string }>}
 */
const applyAll = (rules, context) =>
  rules.filter((r) => evaluateRule(r, context)).map((r) => ({ option: r.option, value: r.value }));

export {
  OPS,
  clause,
  rule,
  validateClause,
  validateRule,
  validate,
  clauseSchema,
  ruleSchema,
  schema,
  evaluateClause,
  evaluateRule,
  applyFirst,
  applyAll,
};
