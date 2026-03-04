/**
 * Prompt Inventory Handler
 */

import { bold, cyan, gray, wrapWithIndent, addBullet } from '../output-utils.js';
import * as promptUtils from '../prompt-utils.js';
import { findProjectRoot } from '../../../lib/find-project-root/index.js';

const PROMPT_INVENTORY_QUERY = `Analyze this LLM prompt and provide a clear purpose description followed by key descriptors.

Format: <clear purpose/function description>: <comma-separated descriptors>

The purpose should clearly explain what this prompt does or tests.

Descriptors should include ONLY these characteristics:
- Input format: "XML inputs" if uses XML/wrapped variables, "JSON inputs" if JSON, "text inputs" otherwise
- Prompt type: "core prompt" if main functionality, "test prompt" if for testing, "helper prompt" if supporting
- Output format: "JSON output", "text output", "structured output", "boolean output", etc.
- Size: "small" if < 3 lines, "medium" if 3-10 lines, "large" if > 10 lines
- Constants: "missing constants" if it appears to need prompt engineering constants but doesn't use them
- Any special features like "uses examples", "multi-step", "chain-of-thought" if applicable

Return ONLY in the format above, no extra text.`;

async function gatherPromptData(moduleContext, modelName) {
  // Extract all strings from all files (main module + reference modules)
  if (process.env.VERBLETS_DEBUG) {
    console.log(
      '[DEBUG] Files in moduleContext:',
      moduleContext.files?.map((f) => `${f.name} (main: ${f.isMainModule})`)
    );
  }

  const allStrings = await promptUtils.extractAllStrings(moduleContext, {
    fileFilter: (f) => f.name?.endsWith('.js') && f.content,
  });

  if (process.env.VERBLETS_DEBUG) {
    const fileGroups = {};
    allStrings.forEach((s) => {
      const key = s.file || 'unknown';
      fileGroups[key] = (fileGroups[key] || 0) + 1;
    });
    console.log('[DEBUG] Strings per file:', fileGroups);
  }

  if (allStrings.length === 0) {
    return { prompts: [], analysisMap: {}, topPrompts: [], promptLocations: {} };
  }

  // Add normalized text
  const normalized = promptUtils.normalizeStrings(allStrings);

  // Score for prompt likelihood
  const scored = await promptUtils.scoreForPromptLikelihood(normalized, modelName);

  if (process.env.VERBLETS_DEBUG) {
    const distribution = promptUtils.getScoreDistribution(scored);
    console.log('[DEBUG] Prompt score distribution:', distribution);
  }

  // Sort by score and filter (include medium-scoring fragments)
  const sorted = promptUtils.sortByScore(scored);

  const prompts = promptUtils.filterByScore(sorted, 5);

  if (prompts.length === 0) {
    return { prompts: [], analysisMap: {}, topPrompts: [], promptLocations: {} };
  }

  // Get top 10 for analysis (show more items to see mix)
  const topPrompts = promptUtils.selectTop(prompts, 10);

  if (process.env.VERBLETS_DEBUG) {
    console.log('[DEBUG] TOP 10 SELECTED:');
    topPrompts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.file}:${p.start?.line} (score: ${p.score})`);
    });
  }

  try {
    // Analyze top prompts
    const analyses = await promptUtils.analyzePrompts(
      topPrompts,
      PROMPT_INVENTORY_QUERY,
      modelName
    );

    // Build location map
    const promptLocations = await promptUtils.buildLocationMap(topPrompts, moduleContext.moduleDir);

    // Build analysisMap from results
    const analysisMap = {};
    analyses.forEach((analysis, index) => {
      const key = `String ${index + 1}`;
      analysisMap[key] = analysis;
    });

    return { prompts, analysisMap, topPrompts, promptLocations };
  } catch (error) {
    return {
      prompts,
      analysisMap: {},
      analysis: `Error: ${error.message}`,
      topPrompts,
      promptLocations: {},
    };
  }
}

async function display(data, moduleDir) {
  const header = bold(cyan('PROMPT INVENTORY'));

  if (data.prompts.length === 0) {
    return `${header}
      No prompt-like strings found in module`;
  }

  // Count prompts by file and make paths project-relative
  const byFile = promptUtils.countByFile(data.prompts);
  const projectRoot = await findProjectRoot(moduleDir);

  const fileBreakdown = await Promise.all(
    Object.entries(byFile).map(([filePath, count]) => {
      // Make path project-relative
      const relativePath = filePath.startsWith(projectRoot)
        ? filePath.slice(projectRoot.length).replace(/^\//, '')
        : filePath;
      // Extract just the filename for display
      const fileName = relativePath.split('/').pop();
      // Get module name from path
      const parts = relativePath.split('/');
      const moduleIdx =
        parts.indexOf('chains') >= 0 ? parts.indexOf('chains') : parts.indexOf('verblets');
      const moduleName = moduleIdx >= 0 && parts[moduleIdx + 1] ? parts[moduleIdx + 1] : '';

      return moduleName && fileName !== 'index.js'
        ? `${moduleName}/${fileName}: ${count}`
        : moduleName
        ? `${moduleName}: ${count}`
        : `${fileName}: ${count}`;
    })
  );

  const breakdown = (await Promise.all(fileBreakdown)).join(', ');

  let output = `${header}
      Found ${data.prompts.length} prompt-like string${
    data.prompts.length === 1 ? '' : 's'
  } (${breakdown})`;

  if (data.analysisMap && data.promptLocations) {
    // Direct mapping of analysis results to locations
    output += '\n';
    Object.entries(data.analysisMap).forEach(([key, summary]) => {
      const location = data.promptLocations[key];
      const isTest = location.includes('.spec.js') || location.includes('.examples.js');

      // Split summary into purpose and descriptors
      const colonIndex = summary.indexOf(':');
      let fullLine;

      if (colonIndex > -1) {
        const purpose = summary.substring(0, colonIndex);
        const descriptors = summary.substring(colonIndex + 1).trim();

        // Build the full line with test marker at end of title
        const titlePart = isTest ? `${bold(purpose)} (test)` : bold(purpose);
        fullLine = `${titlePart}: ${descriptors} (${gray(location)})`;
      } else {
        const testMarker = isTest ? ' (test)' : '';
        fullLine = `${summary}${testMarker} (${gray(location)})`;
      }

      output += `\n${addBullet(wrapWithIndent(fullLine, 8), 8)}`;
    });
  } else if (data.analysis) {
    output += `\n\n${data.analysis}`;
  }

  return output;
}

export async function listAllPrompts(context, _args) {
  const moduleContext = context.moduleContext;

  if (!moduleContext || (!moduleContext.files?.length && !moduleContext.content)) {
    return display(
      {
        prompts: [],
        analysisMap: {},
        analysis: 'No module content available',
        topPrompts: [],
        promptLocations: {},
      },
      moduleContext?.moduleDir
    );
  }

  const data = await gatherPromptData(moduleContext, context.llm);
  return display(data, moduleContext.moduleDir);
}
