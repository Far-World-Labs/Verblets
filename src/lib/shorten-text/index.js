import globalModelService from '../../services/llm-model/index.js';

export default (text, { minCharsToRemove = 10, model, modelService: ms, targetTokenCount }) => {
  const resolvedModel = model || (ms || globalModelService).getBestPublicModel();
  const ellipsis = '...';
  const textToTokenRatio = text.length / resolvedModel.toTokens(text).length;
  let trimmedText = text;
  let tokenCount = resolvedModel.toTokens(trimmedText).length;

  while (tokenCount > targetTokenCount) {
    const charsToRemove = Math.max(
      Math.ceil((tokenCount - targetTokenCount) * textToTokenRatio),
      minCharsToRemove
    );
    const middleIndex = Math.floor(trimmedText.length / 2);
    const startIndex = middleIndex - Math.ceil(charsToRemove / 2);
    const endIndex = middleIndex + Math.floor(charsToRemove / 2);
    trimmedText = trimmedText.slice(0, startIndex) + ellipsis + trimmedText.slice(endIndex);
    tokenCount = resolvedModel.toTokens(trimmedText).length;
  }

  return trimmedText;
};
