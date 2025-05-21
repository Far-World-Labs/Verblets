import modelService from '../../services/llm-model/index.js';

export default (
  text,
  { minCharsToRemove = 10, model = modelService.getBestPublicModel(), targetTokenCount }
) => {
  const ellipsis = '...';
  const textToTokenRatio = text.length / model.toTokens(text).length;
  let trimmedText = text;
  let tokenCount = model.toTokens(trimmedText).length;

  while (tokenCount > targetTokenCount) {
    const charsToRemove = Math.max(
      Math.ceil((tokenCount - targetTokenCount) * textToTokenRatio),
      minCharsToRemove
    );
    const middleIndex = Math.floor(trimmedText.length / 2);
    const startIndex = middleIndex - Math.ceil(charsToRemove / 2);
    const endIndex = middleIndex + Math.floor(charsToRemove / 2);
    trimmedText = trimmedText.slice(0, startIndex) + ellipsis + trimmedText.slice(endIndex);
    tokenCount = model.toTokens(trimmedText).length;
  }

  return trimmedText;
};
