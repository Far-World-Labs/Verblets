import callLlm from '../../lib/llm/index.js';
import { nameStep } from '../../lib/context/option.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { xmlEscape } from '../../lib/functional/index.js';

export const ListStyle = {
  NEWLINE: 'newline',
  XML: 'xml',
  AUTO: 'auto',
};

function shouldUseXML(list, threshold = 1000) {
  return list.some((item) => {
    const str = String(item);
    return str.includes('\n') || str.length > threshold;
  });
}

export function determineStyle(style, list, threshold) {
  const effectiveStyle = style || ListStyle.AUTO;
  if (effectiveStyle === ListStyle.AUTO) {
    return shouldUseXML(list, threshold) ? ListStyle.XML : ListStyle.NEWLINE;
  }
  return effectiveStyle;
}

function formatList(list, style) {
  if (style === ListStyle.NEWLINE) {
    return list.map((item) => String(item)).join('\n');
  }

  const items = list.map((item) => `  <item>${xmlEscape(String(item))}</item>`);
  return `<list>\n${items.join('\n')}\n</list>`;
}

const buildPrompt = (list, instructions, style) => {
  const resolvedInstructions =
    typeof instructions === 'function'
      ? instructions({ list, style, count: list.length })
      : instructions;

  const instructionsBlock = asXML(resolvedInstructions, { tag: 'instructions' });
  const listBlock = formatList(list, style);

  return `${instructionsBlock}

Input items:
${listBlock}`;
};

// Default JSON schema for list outputs
const defaultListSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const verbletName = 'list-batch';

export default async function listBatch(list, instructions, config = {}) {
  const runConfig = nameStep(verbletName, config);
  const emitter = createProgressEmitter(verbletName, runConfig.onProgress, runConfig);
  emitter.start();

  const {
    listStyle = ListStyle.AUTO,
    autoModeThreshold = 1000,
    maxTokens,
    responseFormat,
    llm,
    logger,
    ...options
  } = runConfig;

  if (logger?.debug) {
    logger.debug('listBatch called', {
      listLength: list?.length,
      instructionsLength: instructions?.length,
      hasLLM: !!llm,
      llmType: typeof llm === 'object' ? llm.name : llm,
      hasResponseFormat: !!responseFormat,
    });
  }

  if (!list || list.length === 0) {
    emitter.complete({ outcome: 'success' });
    return [];
  }

  try {
    const effectiveStyle = determineStyle(listStyle, list, autoModeThreshold);

    const prompt = buildPrompt(list, instructions, effectiveStyle);

    const foundResponseFormat = responseFormat ?? {
      type: 'json_schema',
      json_schema: {
        name: 'list_result',
        schema: defaultListSchema,
      },
    };

    const llmModelKeys = {
      ...(maxTokens && { maxTokens }),
      response_format: foundResponseFormat,
    };

    if (logger?.debug) {
      logger.debug('Calling llm', {
        promptLength: prompt.length,
        llmConfig: {
          hasLLM: !!llm,
          llmKeys: llm && typeof llm === 'object' ? Object.keys(llm) : [],
          hasResponseFormat: !!llmModelKeys.response_format,
        },
        optionKeys: Object.keys(options),
      });
    }

    const llmOptions = {
      llm,
      ...llmModelKeys,
      logger,
      ...options,
    };

    if (logger?.debug) {
      logger.debug('LLM request starting', {
        hasAbortSignal: !!llmOptions.abortSignal,
        modelKeys: Object.keys(llmModelKeys),
      });
    }

    const output = await callLlm(prompt, llmOptions);

    if (logger?.debug) {
      logger.debug('LLM response received', {
        outputType: Array.isArray(output) ? 'array' : typeof output,
        outputLength: Array.isArray(output) ? output.length : undefined,
      });
    }

    emitter.complete({ outcome: 'success' });

    // llm will auto-unwrap simple collections, so output is already an array
    return output;
  } catch (error) {
    if (logger?.error) {
      logger.error('LLM request failed in listBatch', {
        error: error.message,
        llmConfig: llm,
        promptLength: list?.length,
        itemCount: list?.length,
      });
    }
    emitter.error(error);
    throw error;
  }
}
