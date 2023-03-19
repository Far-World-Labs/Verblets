export default (text, {
  tone=['informal'],
  vocabulary=['software engineering'],
  sentenceStructure=['varied sentence length', 'active voice'],
  pointOfView=['first person plural'],
  noise=0,
  minWords=0,
  maxWords,
}={}) => {
  const toneModifiers = `Tone: ${tone.join(', ')}`;
  const vocabularyModifiers = `Vocabulary: ${vocabulary.join(', ')}`;
  const sentenceStructureModifiers = `Sentence structure: ${sentenceStructure.join(', ')}`;
  const pointOfViewModifiers = `Point of view: ${pointOfView.join(', ')}`;
  const lengthModifier = `Use between ${minWords} and ${maxWords ?? 'any number'} of words`;

  let noiseModifier = '';
  if (noise > 0.5) {
    noiseModifier = "Completely reshape the ideas here, don't stick with the original structure. Don't change the meaning of the content though.";
  }

  return `Rewrite the following content:
\`\`\`
${text}
\`\`\`

Use the following style:
${toneModifiers}
${vocabularyModifiers}
${sentenceStructureModifiers}
${pointOfViewModifiers}
${lengthModifier}
${noiseModifier}
`;
}
