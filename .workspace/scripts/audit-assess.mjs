/**
 * audit-assess.mjs — Phase 7: Deterministic validation + LLM quality filter
 */

import filter from '../../src/chains/filter/index.js';
import { DESIGN_DIMENSIONS, LLM, elapsed } from './audit-shared.mjs';
import { SELF_ASSESS_FILTER_PROMPT } from './audit-prompts.mjs';

// ============================================================
// Deterministic validation
// ============================================================

function deterministicValidation(findings, chains) {
  const chainMap = Object.fromEntries(chains.map(c => [c.name, c]));
  const accepted = [];
  const rejected = [];

  for (const finding of findings) {
    const chain = chainMap[finding.chain];
    const reasons = [];

    // Level must not exceed deterministic ceiling
    const ceiling = chain?.ceilings?.[finding.dimension];
    if (ceiling !== undefined && finding.level > ceiling) {
      reasons.push(`Level ${finding.level} exceeds deterministic ceiling ${ceiling}`);
    }

    const isDesignDimension = DESIGN_DIMENSIONS.includes(finding.dimension);

    // Evidence must contain concrete references (for non-zero levels, Tier 2 only)
    // Design dimensions use observational evidence, not code syntax references
    if (finding.level > 0 && !isDesignDimension) {
      const ev = finding.evidence;
      const hasConcreteRef = (
        /`[^`]+`/.test(ev) ||                    // backtick-quoted code
        /'[^']+'/.test(ev) ||                    // single-quoted references
        /\b[a-z]+[A-Z][a-zA-Z]+\b/.test(ev) ||  // camelCase identifier
        /\b(?:import|export|require)\b/i.test(ev) || // module references
        /\w+\(/.test(ev) ||                      // function call
        /\.\w{2,4}\b/.test(ev) ||                // file extension
        /\w+\.\w+/.test(ev) ||                   // property access
        /\blib\/\w+/.test(ev) ||                 // lib/ path references
        /\b(?:spec|apply|batch|retry|logger|lifecycle|onProgress|README|JSON|XML)\b/i.test(ev)
      );
      if (!hasConcreteRef) {
        reasons.push('Evidence lacks concrete references');
      }
    }

    // Gap must be substantive for levels below threshold
    // Tier 2: required for levels 0-3 (min 10 chars)
    // Design: required for levels 0-2 only (level 3 design may have no actionable gap)
    const gapRequired = isDesignDimension ? finding.level < 3 : finding.level < 4;
    const minGapLength = isDesignDimension ? 5 : 10;
    if (gapRequired && finding.gap.length < minGapLength) {
      reasons.push('Gap description too brief');
    }

    if (reasons.length > 0) {
      rejected.push({ ...finding, rejectionReasons: reasons });
    } else {
      accepted.push(finding);
    }
  }

  return { accepted, rejected };
}

// ============================================================
// LLM quality filter
// ============================================================

export async function selfAssess(findings, chains) {
  const { accepted: deterministicallyValid, rejected } = deterministicValidation(findings, chains);
  console.log(`  Deterministic validation: ${deterministicallyValid.length} accepted, ${rejected.length} rejected`);

  if (deterministicallyValid.length === 0) {
    return { validated: [], rejected };
  }

  // Build unique string representations for filter matching
  const filterItems = deterministicallyValid.map(f =>
    `[${f.chain}/${f.dimension}] Level ${f.level}\nEvidence: ${f.evidence}\nGap: ${f.gap}`
  );

  console.log(`  LLM filtering ${filterItems.length} findings for quality...`);
  const start = Date.now();

  const filtered = await filter(
    filterItems,
    SELF_ASSESS_FILTER_PROMPT,
    { llm: LLM, batchSize: 10, now: new Date() }
  );

  console.log(`  LLM filter: ${filtered.length}/${deterministicallyValid.length} survived (${elapsed(start)}s)`);

  // Match filtered items back to findings
  const survivedSet = new Set(filtered);
  const validated = [];
  const llmRejected = [];

  deterministicallyValid.forEach((finding, i) => {
    if (survivedSet.has(filterItems[i])) {
      validated.push(finding);
    } else {
      llmRejected.push({ ...finding, rejectionReasons: ['LLM quality filter'] });
    }
  });

  return {
    validated,
    rejected: [...rejected, ...llmRejected],
  };
}
