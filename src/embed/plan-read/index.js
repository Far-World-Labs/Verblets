/**
 * Construct a ReadPlan from a schema and optional weight overrides.
 *
 * Trivial call — derives projection weights from schema defaults:
 *   planRead({ schema, propertyNames: ['urgency'] })
 *
 * Override call — caller tunes weights for a specific view:
 *   planRead({ schema, propertyNames: ['urgency'], weightsByProjectionName: { timeline: 1.0 } })
 *
 * @param {object} args
 * @param {import('./types.js').Schema} args.schema
 * @param {string[]} args.propertyNames - Which properties to read
 * @param {Record<string, number>} [args.weightsByProjectionName] - Override projection weights
 * @returns {import('./types.js').ReadPlan}
 */
export default function planRead({ schema, propertyNames, weightsByProjectionName }) {
  const projectionNameSet = new Set(schema.projections.map((p) => p.projectionName));
  const propertyMap = new Map(schema.properties.map((p) => [p.propertyName, p]));

  // Collect all projection weights across requested properties, using schema defaults
  const mergedWeights = {};
  for (const name of propertyNames) {
    const prop = propertyMap.get(name);
    if (!prop) continue;
    for (const [projName, weight] of Object.entries(prop.projectionWeights)) {
      if (!projectionNameSet.has(projName)) continue;
      // Keep the max weight when multiple properties reference the same projection
      mergedWeights[projName] = Math.max(mergedWeights[projName] ?? 0, weight);
    }
  }

  // Caller overrides replace merged defaults
  const finalWeights = weightsByProjectionName
    ? { ...mergedWeights, ...weightsByProjectionName }
    : mergedWeights;

  return {
    propertyNames,
    weightsByProjectionName: finalWeights,
  };
}
