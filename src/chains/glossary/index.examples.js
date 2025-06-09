import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import glossary from './index.js';
import { expect as llmExpect } from '../../chains/llm-expect/index.js';
import { longTestTimeout } from '../../constants/common.js';

describe('glossary examples', () => {
  // Set environment mode to 'none' for all tests to avoid throwing
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(() => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  it(
    'extracts terms from a science paragraph',
    async () => {
      const text = `The chef explained how umami develops through the Maillard reaction alongside sous-vide techniques.`;
      const result = await glossary(text, { maxTerms: 2 });

      expect(result.length).toBeGreaterThan(0);
      expect(Array.isArray(result)).toBe(true);

      // LLM assertion to validate that extracted terms are technical/complex
      const [areTermsTechnical] = await llmExpect(
        `From the text "${text}", these terms were extracted: ${result.join(', ')}`,
        undefined,
        'Are these terms technical or complex enough that a casual reader might need definitions?',
        {
          errorText: `Expected extracted terms to be technical/complex, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        areTermsTechnical,
        `Expected extracted terms to be technical/complex, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion to validate terms are relevant to the source text
      const [areTermsRelevant] = await llmExpect(
        `Original text: "${text}" | Extracted terms: ${result.join(', ')}`,
        undefined,
        'Are all these extracted terms actually present or directly related to the original text?',
        {
          errorText: `Expected terms to be relevant to source text, but extracted: ${result.join(
            ', '
          )} from: "${text}"`,
        }
      );
      expect(
        areTermsRelevant,
        `Expected terms to be relevant to source text, but extracted: ${result.join(
          ', '
        )} from: "${text}"`
      ).toBe(true);

      // LLM assertion to validate term selection quality
      const [isGoodSelection] = await llmExpect(
        `For a cooking/culinary text, these terms were selected for a glossary: ${result.join(
          ', '
        )}`,
        undefined,
        'Are these appropriate terms for a culinary glossary that would help readers understand cooking concepts?',
        { errorText: `Expected appropriate culinary terms, but got: ${result.join(', ')}` }
      );
      expect(
        isGoodSelection,
        `Expected appropriate culinary terms, but got: ${result.join(', ')}`
      ).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles technical documentation with multiple complex terms',
    async () => {
      const text = `The microservice architecture implements OAuth 2.0 authentication with JWT tokens, 
      utilizing Redis for session management and PostgreSQL for persistent data storage. 
      The API gateway handles load balancing through consistent hashing algorithms.`;

      const result = await glossary(text, { maxTerms: 5 });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);

      // LLM assertion for technical term appropriateness
      const [areTechTermsAppropriate] = await llmExpect(
        `From technical documentation, these terms were extracted: ${result.join(', ')}`,
        undefined,
        'Are these terms technical enough that a non-developer would need explanations?',
        {
          errorText: `Expected technical terms appropriate for non-developers, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        areTechTermsAppropriate,
        `Expected technical terms appropriate for non-developers, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for term diversity and coverage
      const [goodCoverage] = await llmExpect(
        `Original text covers microservices, authentication, databases, and algorithms. Extracted terms: ${result.join(
          ', '
        )}`,
        undefined,
        'Do these extracted terms represent a good variety of the technical concepts mentioned?',
        {
          errorText: `Expected good coverage of technical concepts, but extracted terms: ${result.join(
            ', '
          )} may not cover the variety in the source text`,
        }
      );
      expect(
        goodCoverage,
        `Expected good coverage of technical concepts, but extracted terms: ${result.join(
          ', '
        )} may not cover the variety in the source text`
      ).toBe(true);

      // LLM assertion for ranking quality
      const [wellRanked] = await llmExpect(
        `Terms extracted in this order: ${result.join(' → ')}`,
        undefined,
        'Does this ranking make reasonable sense for a technical glossary? Consider that architectural concepts often come before specific tools, and authentication concepts before databases. The ranking should help readers understand concepts in a logical progression.',
        {
          errorText: `Expected reasonable ranking for technical glossary, but got order: ${result.join(
            ' → '
          )}. Consider whether this helps readers understand concepts progressively.`,
        }
      );
      expect(
        wellRanked,
        `Expected reasonable ranking for technical glossary, but got order: ${result.join(
          ' → '
        )}. Consider whether this helps readers understand concepts progressively.`
      ).toBe(true);
    },
    longTestTimeout
  );

  it(
    'filters out common words and focuses on specialized terms',
    async () => {
      const text = `The quantum entanglement phenomenon occurs when particles become interconnected, 
      demonstrating superposition states that challenge classical physics understanding. 
      This behavior is fundamental to quantum computing applications.`;

      const result = await glossary(text, { maxTerms: 4 });

      expect(result.length).toBeGreaterThan(0);

      // LLM assertion to ensure no common words are included
      const [noCommonWords] = await llmExpect(
        `These terms were selected for a glossary: ${result.join(', ')}`,
        undefined,
        'Are all of these terms specialized/technical rather than common everyday words?',
        {
          errorText: `Expected only specialized/technical terms, but some may be common words: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        noCommonWords,
        `Expected only specialized/technical terms, but some may be common words: ${result.join(
          ', '
        )}`
      ).toBe(true);

      // LLM assertion for scientific accuracy
      const [scientificallyAccurate] = await llmExpect(
        `From a quantum physics text, these terms were extracted: ${result.join(', ')}`,
        undefined,
        'Are these reasonable terms that relate to quantum physics or scientific concepts? They should be legitimate scientific terminology, even if not all are highly technical quantum physics terms.',
        {
          errorText: `Expected reasonable scientific terms related to quantum physics, but got: ${result.join(
            ', '
          )}. Terms should be legitimate scientific concepts.`,
        }
      );
      expect(
        scientificallyAccurate,
        `Expected reasonable scientific terms related to quantum physics, but got: ${result.join(
          ', '
        )}. Terms should be legitimate scientific concepts.`
      ).toBe(true);

      // LLM assertion for educational value
      const [educationalValue] = await llmExpect(
        `For someone learning about quantum physics, these glossary terms were provided: ${result.join(
          ', '
        )}`,
        undefined,
        'Would defining these terms be helpful for understanding the quantum physics concepts in the text? Focus on whether they contribute to comprehension rather than requiring perfect technical precision.',
        {
          errorText: `Expected terms that would help with understanding quantum physics concepts, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        educationalValue,
        `Expected terms that would help with understanding quantum physics concepts, but got: ${result.join(
          ', '
        )}`
      ).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles empty or simple text appropriately',
    async () => {
      const simpleText = `The cat sat on the mat. It was a sunny day.`;
      const result = await glossary(simpleText, { maxTerms: 3 });

      // Should return empty array or very few terms for simple text
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        // If any terms are returned, they should still be reasonable
        const [reasonableForSimpleText] = await llmExpect(
          `From simple text "${simpleText}", these terms were extracted: ${result.join(', ')}`,
          undefined,
          'If any terms were extracted from this simple text, are they reasonable choices?',
          {
            errorText: `Expected reasonable terms for simple text, but extracted: ${result.join(
              ', '
            )} from: "${simpleText}"`,
          }
        );
        expect(
          reasonableForSimpleText,
          `Expected reasonable terms for simple text, but extracted: ${result.join(
            ', '
          )} from: "${simpleText}"`
        ).toBe(true);
      } else {
        // LLM assertion that empty result is appropriate for simple text
        const [appropriatelyEmpty] = await llmExpect(
          `For the simple text "${simpleText}", no glossary terms were extracted`,
          undefined,
          'Is it appropriate to extract no glossary terms from this simple, everyday text?',
          { errorText: `Expected empty result to be appropriate for simple text: "${simpleText}"` }
        );
        expect(
          appropriatelyEmpty,
          `Expected empty result to be appropriate for simple text: "${simpleText}"`
        ).toBe(true);
      }
    },
    longTestTimeout
  );

  it(
    'extracts operative philosophical terms for conceptual clarity',
    async () => {
      const philosophyText = `Heidegger's concept of Dasein fundamentally challenges the Cartesian subject-object distinction 
      through his analysis of Being-in-the-world. The phenomenological reduction, as developed by Husserl, 
      brackets the natural attitude to reveal the intentional structure of consciousness. This hermeneutic circle 
      demonstrates how our pre-understanding shapes interpretation, while the ontological difference between 
      beings and Being itself remains concealed in everyday thrownness. Gadamer's fusion of horizons extends 
      this analysis to show how tradition and prejudice constitute the productive ground of understanding.`;

      const result = await glossary(philosophyText, { maxTerms: 8 });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(8);

      // LLM assertion for philosophical term appropriateness - abstract concepts
      const [arePhilosophicalConcepts] = await llmExpect(
        `From philosophical text, these terms were extracted: ${result.join(', ')}`,
        undefined,
        'Are these terms abstract philosophical concepts, technical phenomenological terms, or fundamental ontological categories that require precise definition for understanding?',
        {
          errorText: `Expected abstract philosophical concepts requiring definition, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        arePhilosophicalConcepts,
        `Expected abstract philosophical concepts requiring definition, but got: ${result.join(
          ', '
        )}`
      ).toBe(true);

      // LLM assertion for conceptual precision - terms that need clarification
      const [needDefinition] = await llmExpect(
        `These philosophical terms: ${result.join(', ')}`,
        undefined,
        'Are these terms that would genuinely benefit from precise definition to avoid misunderstanding or ambiguity in philosophical discourse?',
        {
          errorText: `Expected terms needing precise definition for clarity, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        needDefinition,
        `Expected terms needing precise definition for clarity, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for operative significance - terms central to the argument
      const [operativeTerms] = await llmExpect(
        `In the context of phenomenology and hermeneutics, these terms were selected: ${result.join(
          ', '
        )}`,
        undefined,
        'Are these terms operatively significant - meaning they carry specific technical weight and are central to understanding the philosophical arguments being made?',
        {
          errorText: `Expected operatively significant philosophical terms, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        operativeTerms,
        `Expected operatively significant philosophical terms, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for avoiding common words - focus on technical terminology
      const [avoidCommonPhilosophical] = await llmExpect(
        `These terms from philosophical text: ${result.join(', ')}`,
        undefined,
        'Are these specialized philosophical terms rather than common words that happen to appear in philosophical contexts?',
        {
          errorText: `Expected specialized philosophical terms, not common words, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        avoidCommonPhilosophical,
        `Expected specialized philosophical terms, not common words, but got: ${result.join(', ')}`
      ).toBe(true);
    },
    longTestTimeout
  );

  it(
    'extracts operative tech terms across multiple categories',
    async () => {
      const techText = `The team implemented Domain-Driven Design using the Repository pattern and CQRS architecture. 
      Martin Fowler's Strangler Fig pattern helped migrate the legacy system while Kent Beck's Test-Driven Development 
      approach ensured code quality. We used Docker containers orchestrated by Kubernetes, with Redis for caching 
      and PostgreSQL for persistence. The CI/CD pipeline leveraged Jenkins and implemented the Blue-Green deployment 
      strategy. Uncle Bob's Clean Architecture principles guided the service boundaries, while Eric Evans' 
      Bounded Context concept helped define microservice boundaries. The team followed Scrum methodology with 
      pair programming sessions.`;

      const result = await glossary(techText, {
        maxTerms: 12,
        sortBy:
          'importance for understanding the content, prioritizing concrete tools and technologies (Docker, Kubernetes, Redis, PostgreSQL, Jenkins) equally with architectural patterns and methodologies',
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(12);

      // LLM assertion for technical tools identification
      const [includesTools] = await llmExpect(
        `From tech text, these terms were extracted: ${result.join(', ')}`,
        undefined,
        'Do these terms include technical tools, technologies, or software systems (like Docker, Kubernetes, Redis, PostgreSQL, Jenkins)?',
        {
          errorText: `Expected to include technical tools/technologies, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        includesTools,
        `Expected to include technical tools/technologies, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for design patterns identification
      const [includesPatterns] = await llmExpect(
        `These terms from software development: ${result.join(', ')}`,
        undefined,
        'Do these terms include software design patterns, architectural patterns, or development patterns (like Repository, CQRS, Strangler Fig, Blue-Green)?',
        {
          errorText: `Expected to include design/architectural patterns, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        includesPatterns,
        `Expected to include design/architectural patterns, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for methodologies and practices
      const [includesMethodologies] = await llmExpect(
        `From development context, these terms: ${result.join(', ')}`,
        undefined,
        'Do these terms include software development methodologies, practices, or approaches (like Domain-Driven Design, Test-Driven Development, Clean Architecture, Scrum)?',
        {
          errorText: `Expected to include development methodologies/practices, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        includesMethodologies,
        `Expected to include development methodologies/practices, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for key people/thought leaders (optional but valuable)
      const [mayIncludePeople] = await llmExpect(
        `These tech terms: ${result.join(', ')}`,
        undefined,
        'Do these terms appropriately focus on concepts, tools, and patterns rather than just including person names, while potentially including key thought leaders if they are central to understanding specific methodologies?',
        {
          errorText: `Expected focus on concepts/tools over person names, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        mayIncludePeople,
        `Expected focus on concepts/tools over person names, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for operative significance in tech context
      const [operativeTechTerms] = await llmExpect(
        `In a software development context, these terms: ${result.join(', ')}`,
        undefined,
        'Are these terms operatively significant for understanding the technical architecture, development practices, and implementation decisions being described?',
        { errorText: `Expected operatively significant tech terms, but got: ${result.join(', ')}` }
      );
      expect(
        operativeTechTerms,
        `Expected operatively significant tech terms, but got: ${result.join(', ')}`
      ).toBe(true);

      // LLM assertion for practical utility - terms that need definition
      const [practicalUtility] = await llmExpect(
        `For someone learning about software architecture and development, these terms: ${result.join(
          ', '
        )}`,
        undefined,
        'Are these terms that would genuinely benefit from clear definitions to understand modern software development practices and architectural decisions?',
        {
          errorText: `Expected terms needing definition for learning, but got: ${result.join(
            ', '
          )}`,
        }
      );
      expect(
        practicalUtility,
        `Expected terms needing definition for learning, but got: ${result.join(', ')}`
      ).toBe(true);
    },
    longTestTimeout
  );
});
