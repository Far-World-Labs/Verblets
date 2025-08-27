import fs from 'node:fs/promises';
import path from 'node:path';
import { listFunctions } from '../../../lib/parse-js-parts/function-utils.js';
import score from '../../../chains/score/index.js';
import chatGPT from '../../../lib/chatgpt/index.js';
import { bold, cyan, gray } from '../../../chains/test-analysis/output-utils.js';
import compressedContextSchema from '../schemas/compressed-context.json';
import { extractAIMdConfig } from '../utils/ai-md-extractor.js';
import { ModuleCollector } from '../collectors/module-collector.js';

const MIN_FUNCTION_LINES = 2;
const MAX_AIMD_TOKENS = 600;

/**
 * Compress AI.md content to use as scoring context
 */
async function getAiMdContext(moduleDir) {
  const aiMdPath = path.join(moduleDir, 'AI.md');
  try {
    const content = await fs.readFile(aiMdPath, 'utf-8');
    if (!content) return '';

    // Use AI to compress the content to key points
    const prompt = `Compress the following document to its key points in under ${MAX_AIMD_TOKENS} tokens. Focus on development priorities, areas of concern, and what to analyze or improve in the module.\n\n${content}`;

    const compressed = await chatGPT(prompt, {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'compressed_context',
            schema: compressedContextSchema,
          },
        },
      },
    });

    // chatGPT auto-unwraps the value field
    return compressed;
  } catch {
    return '';
  }
}

// Pure functions for data transformation
const isJsFile = (file) => file.name.endsWith('.js');

const extractFunctionsFromFile = (file, moduleDir) => {
  const functions = listFunctions(file.content, MIN_FUNCTION_LINES);
  const isMainModule = file.path.startsWith(moduleDir);
  const moduleName = path.basename(moduleDir);

  // Build relative path
  let relativePath;
  if (isMainModule) {
    relativePath = file.name;
  } else {
    const relModuleName = path.basename(path.dirname(file.path));
    relativePath = `${relModuleName}/${file.name}`;
  }

  return functions.map((func) => ({
    ...func,
    module: moduleName,
    modulePath: path.dirname(file.path),
    fileName: file.name,
    relativePath,
  }));
};

const buildModulePaths = (referenceModules) =>
  referenceModules.map((ref) => path.join(process.cwd(), ref));

const summarizeFunction = async (func) => {
  const prompt = `Describe this function's purpose in 5-10 words:\n\n${func.text.slice(0, 300)}`;
  try {
    const description = await chatGPT(prompt);
    return description.trim();
  } catch {
    // Fallback descriptions
    if (func.name.includes('anonymous')) return 'Anonymous callback or handler';
    if (func.type === 'FunctionDeclaration') return 'Named function implementation';
    return 'Function implementation';
  }
};

const addDescriptions = async (functions) => {
  // Summarize all functions in parallel
  const descriptions = await Promise.all(functions.map(summarizeFunction));

  return functions.map((func, i) => ({
    ...func,
    description: descriptions[i],
  }));
};

const scoreFunctions = async (functions, focus, moduleDir) => {
  if (functions.length === 0) return functions;

  // If no focus provided, score by importance to the module
  const moduleName = path.basename(moduleDir);
  const scoringCriteria = focus || `Importance to the ${moduleName} module`;

  // Use descriptions for scoring
  const scoringTexts = functions.map(
    (func) => `${func.name}: ${func.description || 'No description'}`
  );

  try {
    const scores = await score(scoringTexts, scoringCriteria);

    // Handle sparse arrays or invalid scores
    return functions.map((func, i) => ({
      ...func,
      relevance:
        Array.isArray(scores) && scores[i] !== undefined && !isNaN(scores[i])
          ? scores[i]
          : undefined,
    }));
  } catch {
    // Return functions without scores on error
    return functions;
  }
};

const sortByRelevance = (functions) =>
  [...functions].sort((a, b) => {
    // Always sort by relevance score
    const aScore = a.relevance !== undefined ? a.relevance : 0;
    const bScore = b.relevance !== undefined ? b.relevance : 0;
    return bScore - aScore;
  });

const formatFunctionEntry = (func) => {
  const functionName = bold(func.name);
  const description = func.description ? ` - ${func.description}` : '';
  const metadata = gray(`[${func.relativePath}: ${func.lineCount} lines]`);

  return `      • ${functionName}${description} ${metadata}`;
};

const formatFunctionList = (functions, focus, moduleDir) => {
  const header = bold(cyan('FUNCTIONS IN MODULE'));
  const moduleName = path.basename(moduleDir);
  const focusNote = focus
    ? ` (sorted by relevance to: ${focus})`
    : ` (sorted by importance to ${moduleName})`;

  const items = functions.map(formatFunctionEntry).join('\n');

  return `${header}

      Module: ${moduleDir}
      Found ${functions.length} functions${focusNote}:

${items}`;
};

const gatherModuleFiles = (moduleDir, referenceModules) => {
  const collector = new ModuleCollector();
  const additionalModulePaths = buildModulePaths(referenceModules);
  return collector.gatherContext(moduleDir, { additionalModulePaths });
};

/**
 * List functions in the module based on focus/concern from intent
 */
export async function listModuleFunctions(context, args = {}) {
  const { focus: providedFocus } = args;
  const { moduleDir } = context;

  try {
    // Gather all needed data
    const [aiMdConfig, focus] = await Promise.all([
      extractAIMdConfig(moduleDir),
      providedFocus || getAiMdContext(moduleDir),
    ]);

    const moduleContext = await gatherModuleFiles(moduleDir, aiMdConfig.referenceModules || []);

    // Transform data through pipeline
    const functions = moduleContext.files
      .filter(isJsFile)
      .flatMap((file) => extractFunctionsFromFile(file, moduleDir));

    if (functions.length === 0) {
      return `No functions found with more than ${MIN_FUNCTION_LINES} lines`;
    }

    // Add descriptions first, then score based on them
    const functionsWithDesc = await addDescriptions(functions);
    const scoredFunctions = await scoreFunctions(functionsWithDesc, focus, moduleDir);
    const sortedFunctions = sortByRelevance(scoredFunctions);

    return formatFunctionList(sortedFunctions, focus, moduleDir);
  } catch (error) {
    return `Failed to analyze functions: ${error.message}`;
  }
}
