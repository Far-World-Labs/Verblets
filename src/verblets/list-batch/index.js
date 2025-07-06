import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { xmlEscape } from '../../lib/functional/index.js';
import { XMLParser } from 'fast-xml-parser';

export const ListStyle = {
  NEWLINE: 'newline',
  XML: 'xml',
  AUTO: 'auto',
};

function shouldUseXML(list, threshold = 1000) {
  return list.some((item) => item.includes('\n') || item.length > threshold);
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
    return list.join('\n');
  }

  const items = list.map((item) => `  <item>${xmlEscape(item)}</item>`);
  return `<list>\n${items.join('\n')}\n</list>`;
}

const OutputParser = {
  parseNewlineOutput(output) {
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  },

  parseXMLOutput(output) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: false,
      parseAttributeValue: false,
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(output);

    if (!parsed.list || !parsed.list.item) {
      throw new Error('No <list> or <item> elements found in output');
    }

    const items = Array.isArray(parsed.list.item) ? parsed.list.item : [parsed.list.item];
    return items.map((item) => (typeof item === 'string' ? item : item['#text'] || ''));
  },

  parse(output, style, expectedCount) {
    const items =
      style === ListStyle.NEWLINE ? this.parseNewlineOutput(output) : this.parseXMLOutput(output);

    if (items.length !== expectedCount) {
      throw new Error(`Output count mismatch (expected ${expectedCount}, got ${items.length})`);
    }

    return items;
  },
};

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

export default async function listBatch(list, instructions, config = {}) {
  const {
    listStyle = ListStyle.AUTO,
    autoModeThreshold = 1000,
    maxTokens,
    rawOutput = false,
    llm,
    ...options
  } = config;

  if (!list || list.length === 0) {
    return [];
  }

  const effectiveStyle = determineStyle(listStyle, list, autoModeThreshold);

  const prompt = buildPrompt(list, instructions, effectiveStyle);

  let output;
  try {
    output = await chatGPT(prompt, {
      modelOptions: {
        ...llm,
        ...(maxTokens && { maxTokens }),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`LLM request failed: ${error.message}`);
  }

  // For reduce operations, return raw output instead of parsing as array
  if (rawOutput) {
    return output.trim();
  }

  return OutputParser.parse(output, effectiveStyle, list.length);
}
