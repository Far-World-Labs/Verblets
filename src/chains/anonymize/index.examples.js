import { describe, it } from 'vitest';
import { expect } from 'chai';
import { anonymize, anonymizeMethod } from './index.js';

const sampleText = `As a seasoned engineer from Silicon Valley, I've found that React's 
component lifecycle is like a well-oiled machine - understanding the mounting 
phase is crucial, especially with those pesky useEffect hooks. Trust me, after 
10 years of experience, proper cleanup is key to avoiding memory leaks!`;

describe('anonymize examples', () => {
  it.only('should anonymize text using strict method', { timeout: 60_000 }, async () => {
    const input = {
      text: sampleText,
      method: anonymizeMethod.STRICT,
    };

    const result = await anonymize(input);

    expect(result).to.have.property('text');
    expect(result).to.have.property('stages');
    expect(result.stages).to.have.property('distinctiveContentRemoved');
    expect(result.stages).to.have.property('structureNormalized');
    expect(result.stages).to.have.property('patternsSuppressed');

    // Verify anonymization removed personal markers
    expect(result.text).to.not.include('Silicon Valley');
    expect(result.text).to.not.include('10 years of experience');
    expect(result.text).to.not.include('Trust me');

    // Verify metaphors and idioms are removed
    expect(result.text).to.not.include('well-oiled machine');
    expect(result.text).to.not.include('pesky');

    // Verify the text has been transformed
    expect(result.text).to.not.equal(sampleText);
    expect(result.text.length).to.be.lessThan(sampleText.length);
  });

  it('should preserve more content with balanced method', { timeout: 60_000 }, async () => {
    const input = {
      text: sampleText,
      method: anonymizeMethod.BALANCED,
    };

    const result = await anonymize(input);

    // Verify some personal markers are still removed
    expect(result.text).to.not.include('Silicon Valley');
    expect(result.text).to.not.include('Trust me');

    // But technical content is more preserved
    expect(result.text.length).to.be.greaterThan(
      (await anonymize({ text: sampleText, method: anonymizeMethod.STRICT })).text.length
    );
  });

  it('should minimally transform text with light method', { timeout: 60_000 }, async () => {
    const input = {
      text: sampleText,
      method: anonymizeMethod.LIGHT,
    };

    const result = await anonymize(input);

    // Verify minimal transformation
    expect(result.text.length).to.be.greaterThan(
      (await anonymize({ text: sampleText, method: anonymizeMethod.BALANCED })).text.length
    );

    // Only the most obvious personal markers should be removed
    expect(result.text).to.not.include('Trust me');
    // eslint-disable-next-line quotes
    expect(result.text).to.not.include("I've found");
  });
});
