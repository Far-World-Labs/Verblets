import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import chunkSentences from '../../lib/chunk-sentences/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

const buildPrompt = (text, limit, unit, instructions) => {
  let prompt = `You are an intelligent text truncation system. Your task is to truncate text at the most semantically meaningful boundary while staying within the specified limit.

${wrapVariable(instructions, { tag: 'instructions', forceHTML: true })}

IMPORTANT RULES:
- Find the best truncation point that preserves maximum meaning
- Prioritize natural boundaries: paragraphs > sentences > clauses > words
- Ensure truncated text stands alone as meaningful content
- Return ONLY the truncated text, nothing else
- Preserve original formatting and structure
- If the text is already within the limit, return it unchanged

LIMIT: ${limit} ${unit}
UNIT TYPE: ${unit} (characters/words/tokens)

${wrapVariable(text, { tag: 'text-to-truncate', forceHTML: true })}

Return only the optimally truncated text:`;

  return prompt;
};

const buildAnalysisPrompt = (original, truncated) => {
  return `Analyze this truncation decision and provide structured feedback.

ORIGINAL TEXT:
${wrapVariable(original, { tag: 'original', forceHTML: true })}

TRUNCATED TEXT:
${wrapVariable(truncated, { tag: 'truncated', forceHTML: true })}

Provide your analysis in this exact JSON format:
{
  "cutType": "paragraph|sentence|clause|word|character",
  "preservationScore": 0.85,
  "reasoning": "Brief explanation of truncation decision"
}

Return only the JSON, no other text.`;
};

/**
 * Intelligently truncate text using LLM reasoning to find optimal semantic boundaries.
 * 
 * Uses language model intelligence to determine the best truncation point that
 * preserves maximum meaning and readability within the specified constraints.
 *
 * @param {string} text - The text to truncate
 * @param {string} instructions - Instructions for truncation approach
 * @param {object} config - Configuration options
 * @param {number} config.limit - Maximum length constraint
 * @param {string} config.unit - Unit type: 'characters', 'words', or 'tokens' (default: 'characters')
 * @param {number} config.chunkLen - Chunk size for long texts (default: 4000)
 * @param {number} config.maxAttempts - Maximum retry attempts (default: 2)
 * @param {object} config.llm - LLM configuration
 * @returns {object} Truncation result with truncated text, analysis, and metadata
 */
export default async function truncate(text, instructions = 'Truncate intelligently at natural boundaries', config = {}) {
  const {
    limit = 100,
    unit = 'characters',
    chunkLen = 4000,
    maxAttempts = 2,
    llm,
    ...options
  } = config;

  if (!text || typeof text !== 'string') {
    return {
      truncated: text || '',
      cutPoint: 0,
      cutType: 'none',
      preservationScore: text ? 1.0 : 0.0,
      reasoning: 'Empty or invalid input',
    };
  }

  // Calculate current length based on unit type
  const getCurrentLength = (str) => {
    switch (unit) {
      case 'words':
        return str.trim().split(/\s+/).filter(Boolean).length;
      case 'tokens':
        // For tokens, we'll approximate with words unless custom tokenizer provided
        return str.trim().split(/\s+/).filter(Boolean).length;
      default: // characters
        return str.length;
    }
  };

  const currentLength = getCurrentLength(text);

  // Return full text if already within limit
  if (currentLength <= limit) {
    return {
      truncated: text,
      cutPoint: currentLength,
      cutType: 'full',
      preservationScore: 1.0,
      reasoning: 'Text already within limit',
    };
  }

  // For very long texts, chunk them first
  if (text.length > chunkLen) {
    const chunks = chunkSentences(text, chunkLen);
    
    // Process first chunk that might contain the truncation point
    let workingText = chunks[0];
    
    // If first chunk is still too long after truncation, process it
    // Otherwise, we might need to include part of the second chunk
    while (getCurrentLength(workingText) < limit && chunks.length > 1) {
      workingText += chunks[1];
      chunks.shift();
    }
    
    text = workingText;
  }

  const prompt = buildPrompt(text, limit, unit, instructions);
  
  const run = async () => {
    const truncated = await chatGPT(prompt, {
      modelOptions: {
        temperature: 0.1, // Low temperature for consistent decisions
        modelName: 'fastGoodCheapCoding',
        ...llm,
      },
      ...options,
    });

    // Validate that result is actually truncated and within limit
    const resultLength = getCurrentLength(truncated.trim());
    if (resultLength > limit) {
      throw new Error(`Truncation result exceeds limit: ${resultLength} > ${limit}`);
    }

    return truncated.trim();
  };

  try {
    const truncated = await retry(run, { 
      label: 'truncate', 
      maxRetries: maxAttempts - 1 
    });

    // Get analysis of the truncation decision
    const analysisPrompt = buildAnalysisPrompt(text, truncated);
    
    const getAnalysis = async () => {
      const analysisResponse = await chatGPT(analysisPrompt, {
        modelOptions: {
          temperature: 0.1,
          modelName: 'fastGoodCheapCoding',
          ...llm,
        },
        ...options,
      });
      
      try {
        return JSON.parse(analysisResponse.trim());
      } catch {
        // Fallback analysis if JSON parsing fails
        return {
          cutType: 'word',
          preservationScore: 0.7,
          reasoning: 'Analysis parsing failed, using fallback',
        };
      }
    };

    const analysis = await retry(getAnalysis, { 
      label: 'truncate-analysis', 
      maxRetries: 1 
    });

    return {
      truncated,
      cutPoint: getCurrentLength(truncated),
      cutType: analysis.cutType,
      preservationScore: analysis.preservationScore,
      reasoning: analysis.reasoning,
    };
    
  } catch (error) {
    console.warn('LLM truncation failed, using fallback:', error.message);
    
    // Fallback to simple character/word truncation
    let fallbackTruncated;
    if (unit === 'words') {
      const words = text.trim().split(/\s+/);
      fallbackTruncated = words.slice(0, limit).join(' ');
    } else {
      fallbackTruncated = text.substring(0, limit);
    }
    
    return {
      truncated: fallbackTruncated,
      cutPoint: getCurrentLength(fallbackTruncated),
      cutType: 'soft',
      preservationScore: 0.5,
      reasoning: 'LLM failed, used fallback truncation',
    };
  }
}