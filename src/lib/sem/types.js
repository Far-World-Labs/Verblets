/**
 * JSDoc typedefs for the sem module.
 * Zero runtime code — import for documentation only.
 */

/**
 * @typedef {object} SourceText
 * @property {string} sourceId - App-level identity (e.g. "ticket:4812/body")
 * @property {string} text - Raw text content
 * @property {string} [sourceKind] - Caller-defined type (e.g. "ticketBody", "policy")
 * @property {Record<string, string>} [tags] - Optional app metadata
 */

/**
 * @typedef {'literal' | 'recast' | 'cluster' | 'meta' | 'query'} FragmentKind
 */

/**
 * @typedef {object} Fragment
 * @property {string} fragmentId - Unique identifier
 * @property {string} text - Text shaped for one semantic purpose
 * @property {FragmentKind} fragmentKind - How this fragment was derived
 * @property {string} projectionName - Which semantic lane this serves
 * @property {string[]} sourceIds - Which sources contributed
 */

/**
 * @typedef {object} FragmentSet
 * @property {string} fragmentSetId - Identifier for this batch
 * @property {Fragment[]} fragments - Fragments produced together
 */

/**
 * @typedef {object} Projection
 * @property {string} projectionName - Semantic lane name
 * @property {string} description - What this projection captures
 */

/**
 * @typedef {object} ValueRange
 * @property {'continuous' | 'categorical'} type
 * @property {number} [low] - Low end for continuous (default 0)
 * @property {number} [high] - High end for continuous (default 1)
 * @property {string} [lowLabel] - Description of the low pole
 * @property {string} [highLabel] - Description of the high pole
 * @property {string[]} [categories] - Category names for categorical
 */

/**
 * @typedef {object} Property
 * @property {string} propertyName - Readout target name
 * @property {ValueRange} valueRange - How values are expressed
 * @property {Record<string, number>} projectionWeights - Default weights per projection
 */

/**
 * @typedef {object} Poles
 * @property {Float32Array} low - Embedded low pole vector
 * @property {Float32Array} high - Embedded high pole vector
 */

/**
 * @typedef {object} CategoricalPoles
 * @property {Record<string, Float32Array>} byCategory - Embedded vector per category
 */

/**
 * @typedef {object} Schema
 * @property {Projection[]} projections - Named semantic lanes
 * @property {Property[]} properties - Readout targets with weights
 * @property {Record<string, Poles | CategoricalPoles>} [_poles] - Populated by ingest
 */

/**
 * @typedef {object} State
 * @property {string} stateId - Identity of the thing this state represents
 * @property {Record<string, Float32Array>} vectorsByProjectionName - One vector per projection
 * @property {Float32Array} [baseVector] - Optional overall vector from all fragments
 */

/**
 * @typedef {object} ReadPlan
 * @property {string[]} propertyNames - Which properties to read
 * @property {Record<string, number>} weightsByProjectionName - Projection weight overrides
 */

/**
 * @typedef {object} Intent
 * @property {Record<string, number>} weightsByProjectionName - Projection weights for comparison
 * @property {string[]} [queryTexts] - Optional query texts to embed as signals
 * @property {string[]} [suppressProjectionNames] - Projections to exclude
 */

/**
 * @typedef {object} StudySet
 * @property {string[]} selectedStateIds - States that expose gaps
 * @property {string} noteText - What the selection reveals
 */

/**
 * @typedef {object} ReadValue
 * @property {string} stateId
 * @property {Record<string, number>} valuesByPropertyName
 */

/**
 * @typedef {object} ReadDetailEntry
 * @property {number} value
 * @property {number} confidence
 */

/**
 * @typedef {object} ReadDetail
 * @property {string} stateId
 * @property {Record<string, ReadDetailEntry>} valuesByPropertyName
 */

/**
 * @typedef {object} MatchResult
 * @property {string} leftStateId
 * @property {string} rightStateId
 * @property {number} score
 */
