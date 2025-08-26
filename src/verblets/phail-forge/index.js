/**
 * PhailForge - Prompt Enhancement Verblet
 *
 * Transforms simple prompts into expert-level, detailed prompts with
 * precise terminology and comprehensive specifications.
 *
 * Based on the concept of creating "phials" - bottled prompt spells
 * that are portable, reusable, and expertly crafted.
 *
 * Credit: Inspired by u/stunspot's PhailForge concept
 * Source: https://www.reddit.com/r/PromptEngineering/comments/1ms834b/comment/n957wgi
 * Date: 8/17/2025
 *
 * "You give it a prompt and it rewrites it with the detail and fine-distinctioned
 * jargon and terms of art that you WOULD have asked for if you had only been an
 * expert at whatever." - u/stunspot
 */

import chatGPT from '../../lib/chatgpt/index.js';

const ENHANCEMENT_PROMPT = `You are an expert prompt engineer tasked with transforming a basic prompt into an expert-level "phial" - a precisely crafted, portable prompt specification.

Analyze the given prompt and rewrite it with:

1. **Domain Expertise**: Include the specific jargon, terms of art, and technical distinctions that a subject matter expert would naturally include
2. **Comprehensive Specifications**: Add all the details and constraints that would produce optimal results but that a non-expert might not know to ask for
3. **Quality Defaults**: Include sensible defaults for error handling, edge cases, performance considerations, and output formatting
4. **Structural Clarity**: Organize the enhanced prompt into clear sections if needed, with explicit success criteria
5. **Implementation Guidance**: Add specific technical requirements, preferred libraries/approaches, and architectural patterns where relevant

Transform the prompt to be what the user WOULD have asked for if they had been an expert in the domain.

Original prompt to enhance:`;

const ANALYSIS_PROMPT = `Analyze this prompt through a multi-dimensional evaluation framework:

Examine from dual perspectives:
1. **User Intent**: Goal fulfillment, expectation alignment, unstated needs
2. **Technical Quality**: Accuracy, coherence, organizational clarity

Evaluate across five dimensions:

1. **Alignment Precision**: How well it addresses specific vs generic needs
2. **Information Architecture**: Organization, hierarchy, navigational clarity  
3. **Accuracy & Completeness**: Factual correctness, comprehensive coverage
4. **Cognitive Accessibility**: Language precision, concept clarity, assumption management
5. **Actionability & Impact**: Practical utility, implementation readiness

Provide:
- 2-3 execution strengths with examples
- 2-3 refinement opportunities with details
- 3-5 concrete improvement suggestions`;

/**
 * Enhance a prompt to expert level
 * @param {string} prompt - The original prompt to enhance
 * @param {Object} options - Enhancement options
 * @returns {Promise<Object>} Enhanced prompt with metadata
 */
export default async function phailForge(prompt, options = {}) {
  const {
    analyze = false, // Also provide analysis of the enhancement
    context = '', // Additional context about the domain
    style = 'technical', // Enhancement style: technical, creative, analytical
  } = options;

  // Build the enhancement request
  const fullPrompt = [
    ENHANCEMENT_PROMPT,
    prompt,
    context && `\nDomain context: ${context}`,
    style && `\nEnhancement style: ${style}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Get the enhanced prompt
  const enhancedResponse = await chatGPT(fullPrompt, {
    modelOptions: {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'phail_enhancement',
          schema: {
            type: 'object',
            properties: {
              enhanced: {
                type: 'string',
                description: 'The expertly enhanced prompt',
              },
              improvements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      enum: ['specificity', 'technical', 'structure', 'defaults', 'constraints'],
                    },
                    description: {
                      type: 'string',
                      maxLength: 200,
                    },
                  },
                  required: ['category', 'description'],
                },
                maxItems: 5,
                description: 'Key improvements made',
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 10,
                description: 'Technical terms and jargon added',
              },
              metadata: {
                type: 'object',
                properties: {
                  domain: {
                    type: 'string',
                    description: 'Identified domain/field',
                  },
                  complexity: {
                    type: 'string',
                    enum: ['basic', 'intermediate', 'advanced', 'expert'],
                  },
                  expansionRatio: {
                    type: 'number',
                    description: 'How much longer the enhanced version is',
                  },
                },
              },
            },
            required: ['enhanced', 'improvements'],
          },
        },
      },
    },
  });

  // Calculate expansion ratio
  enhancedResponse.metadata = {
    ...enhancedResponse.metadata,
    expansionRatio: enhancedResponse.enhanced.length / prompt.length,
  };

  // Optionally analyze the enhancement
  if (analyze) {
    const analysisPrompt = `${ANALYSIS_PROMPT}\n\nPrompt to analyze:\n${enhancedResponse.enhanced}`;

    const analysis = await chatGPT(analysisPrompt, {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'prompt_analysis',
            schema: {
              type: 'object',
              properties: {
                strengths: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      aspect: { type: 'string', maxLength: 50 },
                      detail: { type: 'string', maxLength: 200 },
                    },
                  },
                  maxItems: 3,
                },
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      aspect: { type: 'string', maxLength: 50 },
                      detail: { type: 'string', maxLength: 200 },
                    },
                  },
                  maxItems: 3,
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string', maxLength: 200 },
                  maxItems: 5,
                },
              },
              required: ['strengths', 'opportunities', 'suggestions'],
            },
          },
        },
      },
    });

    enhancedResponse.analysis = analysis;
  }

  return enhancedResponse;
}

// Export for use in chains
export { phailForge };
