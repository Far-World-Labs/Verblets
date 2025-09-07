/**
 * Analyze Prompt Handler
 *
 * Performs comprehensive analysis of LLM prompts to identify strengths,
 * weaknesses, and specific improvement opportunities.
 */

import { cyan, gray, yellow, green, red } from '../output-utils.js';
import * as promptUtils from '../prompt-utils.js';
import chatGPT from '../../../lib/chatgpt/index.js';
import retry from '../../../lib/retry/index.js';
import promptAnalysisSchema from '../schemas/prompt-analysis-schema.json';
import * as promptConstants from '../../../prompts/constants.js';
import fs from 'fs';
import path from 'path';

// Load prompt guidelines with fallback
try {
  const guidelinesPath = path.join(process.cwd(), 'src/guidelines/PROMPTS.md');
  fs.readFileSync(guidelinesPath, 'utf8');
} catch (error) {
  console.warn('Could not load PROMPTS.md guidelines:', error.message);
}

// ========================================
// Prompts
// ========================================

// Combined analysis and improvement prompt
const ANALYSIS_PROMPT = `YOU ARE ANALYZING THE FOLLOWING PROMPT. ANALYZE ONLY THE TEXT BETWEEN THE XML TAGS BELOW:

<prompt_to_analyze>
{promptText}
</prompt_to_analyze>

IMPORTANT: Analyze ONLY the prompt shown above between the XML tags. Do not analyze these instructions.

First provide a brief overview (2-3 sentences) explaining what the PROMPT ABOVE does based on its actual content, why it's structured this way, and what type of LLM task it performs.

Then analyze the provided prompt across multiple dimensions to identify strengths, weaknesses, and improvement opportunities.

Focus on practical, actionable observations based on the prompt's actual content and domain.

<evaluation_criteria>

1. STRUCTURAL QUALITY
   - Are inputs clearly marked using XML blocks or other delimiters?
   - Is variable/dynamic content properly separated from static instructions?
   - Does the prompt avoid embedding code or data directly in instructions?
   - Is there a clear separation between context, task, and output specification?

2. CLARITY AND SPECIFICITY
   - Is the task to be performed unambiguous and well-defined?
   - Are key terms defined succinctly where needed?
   - Does it use criteria rather than anchoring to specific examples?
   - Are edge cases and error conditions addressed?

3. OUTPUT SPECIFICATION
   - Is the expected output format explicitly defined?
   - For structured output, does it reference a JSON schema or clear structure?
   - Are success criteria and quality expectations clear?
   - Does it specify how to handle partial or uncertain results?

4. PROMPT ENGINEERING BEST PRACTICES
   - Does it use appropriate prompt constants (${Object.keys(promptConstants)
     .slice(0, 5)
     .join(', ')}, etc.)?
   - Is it using the right chain/tool for the task (score for scoring, map for mapping, etc.)?
   - Does it avoid unnecessary complexity or over-engineering?
   - Is the cognitive load appropriate for the task complexity?

5. TECHNICAL EFFECTIVENESS
   - Would this prompt work reliably across different contexts?
   - Does it handle variability in input size and format?
   - Is it resilient to minor variations in how users might phrase things?
   - Does it avoid brittle patterns that might break easily?

</evaluation_criteria>

<analysis_dimensions>
For each dimension below, provide a score (0-10) and specific observations:

- alignmentPrecision: How well it targets the specific use case vs generic treatment
- informationArchitecture: Organization, flow, and structural clarity
- accuracyCompleteness: Coverage of necessary elements without omissions
- cognitiveAccessibility: Appropriate language and concept management
- actionabilityImpact: Practical utility and implementation readiness
</analysis_dimensions>

<required_output>
Identify:
- 2-3 execution strengths with specific references to the prompt
- 2-3 refinement opportunities that would improve effectiveness
- For each refinement opportunity, provide a specific improvement suggestion
- Focus on concrete observations based on the prompt's actual content
- NEVER suggest adding examples - use criteria and guidelines instead
</required_output>`;

// ========================================
// Data Extraction
// ========================================

/**
 * Extract and score prompts from module
 */
async function extractPrompts(moduleContext, modelName) {
  // Extract from all files including reference modules
  const allStrings = await promptUtils.extractAllStrings(moduleContext, {
    fileFilter: (f) => f.name?.endsWith('.js') && f.content,
  });
  if (allStrings.length === 0) return [];

  const normalized = promptUtils.normalizeStrings(allStrings);
  const scored = await promptUtils.scoreForPromptLikelihood(normalized, modelName);
  const sorted = promptUtils.sortByScore(scored);

  // For analysis, focus on high-scoring complete prompts
  return promptUtils.filterByScore(sorted, 7);
}

/**
 * Select the best prompt for analysis
 */
function selectTopPrompt(prompts) {
  if (prompts.length === 0) return undefined;

  // prompts should already be sorted by score desc
  // Just take the first one
  return prompts[0];
}

// ========================================
// Analysis Functions
// ========================================

/**
 * Detect prompt engineering indicators
 */
function detectIndicators(text) {
  return {
    xml: /<\w+>/.test(text),
    constants: Object.keys(promptConstants).some((k) => text.includes(promptConstants[k])),
    schema: /json_schema|response_format/.test(text),
    lines: text.split('\n').length,
    chain: 'unknown', // TODO: Detect chain type
  };
}

/**
 * Run single-stage analysis with improvements
 */
async function runAnalysis(promptText) {
  const analysisPrompt = ANALYSIS_PROMPT.replace('{promptText}', promptText);
  const analysis = await retry(
    () =>
      chatGPT(analysisPrompt, {
        modelOptions: {
          response_format: {
            type: 'json_schema',
            json_schema: promptAnalysisSchema,
          },
        },
      }),
    { maxRetries: 2, label: 'prompt analysis' }
  );

  return { analysis };
}

// ========================================
// Display Functions
// ========================================

/**
 * Format header with metadata
 */
async function formatHeader(prompt, indicators, moduleDir) {
  const location = await promptUtils.getLocation(prompt, moduleDir);

  return [
    cyan('PROMPT ANALYSIS'),
    `Location: ${location}`,
    `Score: ${prompt.score}/10 | Lines: ${indicators.lines}`,
    `XML: ${indicators.xml ? green('Y') : red('N')} | Constants: ${
      indicators.constants ? green('Y') : red('N')
    } | Schema: ${indicators.schema ? green('Y') : yellow('?')}`,
    gray('[TODO: Chain detection - map/score/chatGPT]'),
  ];
}

/**
 * Format overview section
 */
function formatOverview(analysis) {
  if (!analysis?.overview) return [];

  return [cyan('Overview:'), analysis.overview];
}

/**
 * Format current structure section
 */
function formatStructure(promptText) {
  const lines = promptText.split('\n');
  const hasContext = /context/i.test(promptText);
  const hasOutput = /output|format|return/i.test(promptText);
  const hasTask = /evaluate|analyze|generate|create/i.test(promptText);

  return [
    cyan('Current Structure:'),
    hasContext ? '• Provides context/background' : '• No explicit context',
    hasTask ? '• Defines task/action' : '• No clear task definition',
    hasOutput ? '• Specifies output format' : '• No output specification',
    `• ${lines.length} lines total`,
  ];
}

/**
 * Format areas for improvement (only low scores)
 */
function formatAreasToImprove(analysis) {
  const dimensions = [
    { key: 'alignmentPrecision', label: 'Alignment' },
    { key: 'informationArchitecture', label: 'Structure' },
    { key: 'accuracyCompleteness', label: 'Completeness' },
    { key: 'cognitiveAccessibility', label: 'Clarity' },
    { key: 'actionabilityImpact', label: 'Actionability' },
  ];

  const lowScores = dimensions
    .filter((dim) => analysis[dim.key]?.score < 7)
    .map((dim) => {
      const score = analysis[dim.key].score;
      const color = score >= 4 ? yellow : red;
      return `• ${dim.label}: ${color(`${score}/10`)}`;
    });

  if (lowScores.length === 0) return [];

  return [cyan('Areas to Improve:'), ...lowScores];
}

/**
 * Format recommendations
 */
function formatRecommendations(analysis) {
  if (!analysis?.refinementOpportunities?.length) return [];

  const lines = [cyan('Recommendations:')];

  analysis.refinementOpportunities.forEach((rec, i) => {
    // Split at first period to separate problem from solution
    const firstPeriod = rec.indexOf('. ');
    if (firstPeriod > -1) {
      const problem = rec.substring(0, firstPeriod + 1);
      const solution = rec.substring(firstPeriod + 2);
      lines.push(`${i + 1}. ${solution}`);
      lines.push(`   ${gray(problem)}`);
    } else {
      lines.push(`${i + 1}. ${rec}`);
    }
  });

  return lines;
}

/**
 * Build complete display output
 */
async function display(data, moduleDir) {
  const { prompt, analysis, error } = data;

  if (!prompt) {
    return `${cyan('PROMPT ANALYSIS')}\n      No significant prompts found to analyze`;
  }

  if (error) {
    return `${cyan('PROMPT ANALYSIS')}\n      Error: ${error.message}`;
  }

  // Use original text for display and analysis, not normalized
  const promptText = prompt.text;
  const indicators = detectIndicators(promptText);

  // Build output sections
  const sections = [
    await formatHeader(prompt, indicators, moduleDir),
    [''],
    formatOverview(analysis),
    [''],
    formatStructure(promptText),
    [''],
    formatAreasToImprove(analysis || {}),
    formatRecommendations(analysis),
  ];

  // Flatten and join with proper indentation
  return sections
    .flat()
    .filter((line) => line !== undefined)
    .map((line, i) => (i === 0 ? line : `      ${line}`))
    .join('\n');
}

// ========================================
// Main Handler
// ========================================

export async function analyzePrompt(context, _args) {
  const { moduleContext, moduleDir, llm: modelName } = context;

  if (!moduleContext?.files?.length && !moduleContext?.content) {
    return display({ prompt: undefined }, moduleDir);
  }

  try {
    // Extract and select prompt
    const prompts = await extractPrompts(moduleContext, modelName);
    const prompt = selectTopPrompt(prompts);

    if (!prompt) {
      return display({ prompt: undefined }, moduleDir);
    }

    if (process.env.VERBLETS_DEBUG) {
      const lines = prompt.text.split('\n').length;
      console.log(
        `[DEBUG] Selected prompt: ${prompt.file}:${prompt.start?.line} (${lines} lines, score: ${prompt.score})`
      );
    }

    // Run analysis with original text
    const promptText = prompt.text;
    const { analysis } = await runAnalysis(promptText);

    return display({ prompt, analysis }, moduleDir);
  } catch (error) {
    console.error('Error analyzing prompt:', error);
    return display({ prompt: undefined, error }, moduleDir);
  }
}
