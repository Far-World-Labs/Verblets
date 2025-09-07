import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import MODULE_DEPENDENCIES_SCHEMA from './schemas/module-dependencies-schema.json';

/**
 * Extract explicitly listed module dependencies from AI.md file
 * @param {string} moduleDir - The module directory containing AI.md
 * @returns {Promise<string[]>} Array of additional module paths to include
 */
export async function extractAdditionalModulePaths(moduleDir) {
  try {
    const aiMdPath = join(moduleDir, 'AI.md');
    const aiMdContent = await readFile(aiMdPath, 'utf-8');

    const prompt = `Extract any explicitly listed module dependencies from this AI.md file.

${aiMdContent}

Look ONLY for sections that explicitly list dependencies or modules to examine, such as:
- A "Dependencies" or "Module Dependencies" section
- A "Related Modules" section
- An "Analysis Dependencies" section  
- Lists under headings like "When analyzing, include:"

Return the module paths exactly as listed in the document.
Only include paths that are explicitly stated for inclusion in analysis.
Do NOT infer or guess dependencies from the text.

If no dependencies are explicitly listed, return an empty array.`;

    const schema = MODULE_DEPENDENCIES_SCHEMA;

    const result = await retry(
      () =>
        chatGPT(prompt, {
          modelOptions: {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'module_dependencies',
                schema,
              },
            },
          },
        }),
      { maxRetries: 2, label: 'extract module dependencies' }
    );

    return result.additionalModulePaths || [];
  } catch {
    // AI.md doesn't exist or error parsing - return empty array
    return [];
  }
}
